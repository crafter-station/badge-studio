import { createHash, randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import type { PoolClient } from "@neondatabase/serverless";
import {
	COMMUNITY_PREPARATION_TTL,
	type CommunityIntent,
	type CommunityPublication,
	type CommunityReceipt,
	type CommunitySnapshot,
	canonicalJson,
	communitySnapshotSchema,
	publicationExpiry,
	publicationKey,
} from "./community-contract";

export class CommunityError extends Error {
	constructor(
		message: string,
		public status = 400,
	) {
		super(message);
	}
}

type Actor = { ownerId: string; sessionId: string; authorName: string };
export type CommunityGrant = {
	operation_id: string;
	secret_hash: string;
	owner_id: string;
	session_id: string;
	author_name: string;
	intent: CommunityIntent;
	receipt: CommunityReceipt | null;
	snapshot: CommunitySnapshot | null;
	approved_at: Date | null;
	revoked_at: Date | null;
	expires_at: Date;
};
export type CommunityMedia = {
	id: string;
	operation_id: string;
	slot: "portrait" | "artwork";
	input_hash: string;
	output_hash: string;
	provider_key: string | null;
	bytes: number;
	state: "uploading" | "ready" | "retiring" | "deleted";
	created_at: Date;
};

let pool: Pool | undefined;
export function communityDb() {
	if (!process.env.DATABASE_URL)
		throw new CommunityError("La colección pública todavía no está configurada.", 503);
	neonConfig.webSocketConstructor = globalThis.WebSocket;
	pool ??= new Pool({
		connectionString: process.env.DATABASE_URL,
		max: 3,
		connectionTimeoutMillis: 10_000,
		idleTimeoutMillis: 10_000,
	});
	return pool;
}

export function sha256(value: string | Uint8Array) {
	return createHash("sha256").update(value).digest("hex");
}

export async function communityTransaction<T>(work: (client: PoolClient) => Promise<T>) {
	const client = await communityDb().connect();
	try {
		await client.query("BEGIN");
		await client.query("SET LOCAL statement_timeout = '15s'");
		const result = await work(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK").catch(() => {});
		throw error;
	} finally {
		client.release();
	}
}

export async function grantForSecret(secret: string, client?: PoolClient, lock = false) {
	return grantForHash(secretKey(secret), client, lock);
}

export function secretKey(secret: string) {
	return publicationKey(secret, sha256(secret));
}

async function grantForHash(hash: string, client?: PoolClient, lock = false) {
	const { rows } = await (client ?? communityDb()).query<CommunityGrant>(
		`SELECT * FROM community_grants WHERE secret_hash = $1${lock ? " FOR UPDATE" : ""}`,
		[hash],
	);
	return rows[0];
}

export function requireActiveGrant(grant?: CommunityGrant) {
	if (!grant)
		throw new CommunityError("AUTHORIZATION_REQUIRED: Verifica tu cuenta para publicar.", 401);
	if (grant.receipt)
		throw new CommunityError("Esta operación ya terminó. Consulta su estado.", 409);
	if (grant.revoked_at) throw new CommunityError("CANCELLED: Esta publicación fue cancelada.", 410);
	if (new Date(grant.expires_at).getTime() <= Date.now())
		throw new CommunityError(
			"EXPIRED: La autorización caducó. Prepara la publicación de nuevo.",
			410,
		);
	return grant;
}

export async function authorizePublication(
	actor: Actor,
	secretHash: string,
	intent: CommunityIntent,
) {
	return communityTransaction(async (client) => {
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [secretHash]);
		const cancelled = await client.query(
			"SELECT 1 FROM community_cancellations WHERE secret_hash=$1",
			[secretHash],
		);
		if (cancelled.rows.length)
			throw new CommunityError("CANCELLED: Esta publicación fue cancelada.", 410);
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [actor.ownerId]);
		const existing = await client.query<CommunityGrant>(
			"SELECT * FROM community_grants WHERE operation_id = $1 OR secret_hash = $2 FOR UPDATE",
			[intent.operationId, secretHash],
		);
		if (existing.rows.length) {
			const prior = existing.rows[0];
			if (
				prior.owner_id !== actor.ownerId ||
				prior.secret_hash !== secretHash ||
				canonicalJson(prior.intent) !== canonicalJson(intent)
			)
				throw new CommunityError("Esta operación pertenece a otra autorización.", 409);
			if (prior.receipt) return { authorized: true, receipt: prior.receipt };
			requireActiveGrant(prior);
			if (prior.session_id !== actor.sessionId)
				throw new CommunityError("La cuenta cambió. Prepara una nueva publicación.", 409);
			return { authorized: true };
		}
		const expiresAt = publicationExpiry(secretHash);
		if (expiresAt <= Date.now() || expiresAt > Date.now() + COMMUNITY_PREPARATION_TTL)
			throw new CommunityError("EXPIRED: Prepara la publicación de nuevo.", 410);
		const count = await client.query<{ count: string }>(
			"SELECT count(*) FROM community_grants WHERE owner_id = $1 AND created_at > now() - interval '1 hour'",
			[actor.ownerId],
		);
		if (Number(count.rows[0].count) >= 20)
			throw new CommunityError(
				"Llegaste al límite de 20 publicaciones por hora. Inténtalo más tarde.",
				429,
			);
		if (intent.action !== "create") {
			const target = await client.query(
				"SELECT owner_id, version, state FROM community_publications WHERE id = $1 FOR UPDATE",
				[intent.publicationId],
			);
			assertOwnerVersion(target.rows[0], actor.ownerId, intent.expectedVersion);
		}
		await client.query(
			"INSERT INTO community_grants (operation_id, secret_hash, owner_id, session_id, author_name, intent) VALUES ($1,$2,$3,$4,$5,$6)",
			[
				intent.operationId,
				secretHash,
				actor.ownerId,
				actor.sessionId,
				actor.authorName,
				JSON.stringify(intent),
			],
		);
		return { authorized: true };
	});
}

function assertOwnerVersion(
	target: { owner_id: string; version: number; state: string } | undefined,
	owner: string,
	version: number,
) {
	if (!target || target.owner_id !== owner)
		throw new CommunityError("Solo el autor puede cambiar esta publicación.", 403);
	if (target.version !== version || target.state !== "published")
		throw new CommunityError(
			"VERSION_CONFLICT: La publicación cambió. Consulta su versión actual.",
			409,
		);
}

export async function commitPublication(secret: string, input?: unknown) {
	return commitPublicationHash(secretKey(secret), input);
}

async function commitPublicationHash(hash: string, input?: unknown) {
	return communityTransaction(async (client) => {
		const grant = await grantForHash(hash, client, true);
		if (!grant) throw new CommunityError("AUTHORIZATION_REQUIRED: Verifica tu cuenta.", 401);
		const intent = grant.intent;
		let snapshot: CommunitySnapshot | undefined;
		if (intent.action !== "withdraw") {
			snapshot = communitySnapshotSchema.parse(input);
			if (
				sha256(canonicalJson(snapshot)) !== intent.snapshotHash ||
				snapshot.design.name !== intent.title ||
				snapshot.participant.name !== intent.participantName
			)
				throw new CommunityError(
					"SNAPSHOT_CONFLICT: El badge cambió después de su autorización.",
					409,
				);
		}
		if (grant.receipt) {
			const current = await client.query("SELECT state FROM community_publications WHERE id = $1", [
				grant.receipt.id,
			]);
			return { ...grant.receipt, state: current.rows[0]?.state ?? "withdrawn" } as CommunityReceipt;
		}
		requireActiveGrant(grant);
		if (!grant.approved_at)
			throw new CommunityError("REVIEW_REQUIRED: Confirma la vista previa para publicar.", 409);
		const id = intent.action === "create" ? randomUUID() : intent.publicationId;
		let version = 1;
		if (intent.action !== "create") {
			const current = await client.query(
				"SELECT owner_id, version, state FROM community_publications WHERE id = $1 FOR UPDATE",
				[id],
			);
			assertOwnerVersion(current.rows[0], grant.owner_id, intent.expectedVersion);
			version = intent.expectedVersion + 1;
		}
		let portrait: string | null = null;
		let artwork: string | null = null;
		if (snapshot) {
			const media = await client.query<CommunityMedia>(
				"SELECT * FROM community_media WHERE operation_id = $1 FOR UPDATE",
				[grant.operation_id],
			);
			for (const slot of ["portrait", "artwork"] as const) {
				const digest = snapshot.images[slot];
				if (!digest) continue;
				const image = media.rows.find((row) => row.slot === slot);
				if (!image || image.state !== "ready" || image.input_hash !== digest || !image.provider_key)
					throw new CommunityError(
						"MEDIA_PENDING: Espera a que se complete la subida de imágenes.",
						409,
					);
				if (slot === "portrait") portrait = image.id;
				else artwork = image.id;
			}
		}
		const state = intent.action === "withdraw" ? "withdrawn" : "published";
		if (intent.action === "create")
			await client.query(
				"INSERT INTO community_publications (id,owner_id,author_name,version,state,snapshot,portrait_id,artwork_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
				[
					id,
					grant.owner_id,
					grant.author_name,
					version,
					state,
					JSON.stringify(snapshot),
					portrait,
					artwork,
				],
			);
		else
			await client.query(
				"UPDATE community_publications SET version=$2,state=$3,snapshot=$4,portrait_id=$5,artwork_id=$6,updated_at=now() WHERE id=$1",
				[id, version, state, snapshot ? JSON.stringify(snapshot) : null, portrait, artwork],
			);
		const receipt: CommunityReceipt = { id, version, state, url: `/community/${id}` };
		await client.query("UPDATE community_grants SET receipt=$2 WHERE operation_id=$1", [
			grant.operation_id,
			JSON.stringify(receipt),
		]);
		return receipt;
	});
}

export async function stagePublication(secret: string, input: unknown) {
	const snapshot = communitySnapshotSchema.parse(input);
	return communityTransaction(async (client) => {
		const grant = requireActiveGrant(await grantForSecret(secret, client, true));
		if (
			grant.intent.action === "withdraw" ||
			sha256(canonicalJson(snapshot)) !== grant.intent.snapshotHash ||
			snapshot.design.name !== grant.intent.title ||
			snapshot.participant.name !== grant.intent.participantName
		)
			throw new CommunityError(
				"SNAPSHOT_CONFLICT: El badge no coincide con la versión preparada.",
				409,
			);
		await client.query("UPDATE community_grants SET snapshot=$2 WHERE operation_id=$1", [
			grant.operation_id,
			JSON.stringify(snapshot),
		]);
		return { staged: true };
	});
}

export async function cancelPublication(secret: string) {
	return communityTransaction(async (client) => {
		const hash = secretKey(secret);
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [hash]);
		const grant = await grantForSecret(secret, client, true);
		if (grant?.receipt) return { state: grant.receipt.state, receipt: grant.receipt };
		if (!grant) {
			const expiresAt = publicationExpiry(hash);
			if (expiresAt <= Date.now()) return { state: "cancelled" as const };
			if (expiresAt > Date.now() + COMMUNITY_PREPARATION_TTL)
				throw new CommunityError("EXPIRED: Prepara la publicación de nuevo.", 410);
			await client.query("SELECT pg_advisory_xact_lock(hashtext('community-cancellations'))");
			await client.query("DELETE FROM community_cancellations WHERE expires_at <= now()");
			const existing = await client.query(
				"SELECT 1 FROM community_cancellations WHERE secret_hash=$1",
				[hash],
			);
			if (!existing.rows.length) {
				const counts = await client.query<{ total: string; recent: string }>(
					"SELECT count(*) AS total, count(*) FILTER (WHERE created_at > now() - interval '1 minute') AS recent FROM community_cancellations",
				);
				if (Number(counts.rows[0].total) >= 10_000 || Number(counts.rows[0].recent) >= 200)
					throw new CommunityError(
						"RATE_LIMITED: No pudimos confirmar la cancelación. Conservamos la operación; inténtalo en un minuto.",
						429,
					);
				await client.query(
					"INSERT INTO community_cancellations (secret_hash,expires_at) VALUES ($1,$2)",
					[hash, new Date(expiresAt)],
				);
			}
			return { state: "cancelled" as const };
		}
		await client.query(
			"UPDATE community_grants SET revoked_at=now(),snapshot=NULL WHERE operation_id=$1",
			[grant.operation_id],
		);
		return { state: "cancelled" as const };
	});
}

export async function reviewPublication(actor: Actor, operationId: string) {
	const result = await communityDb().query<CommunityGrant>(
		"SELECT * FROM community_grants WHERE operation_id=$1 AND owner_id=$2",
		[operationId, actor.ownerId],
	);
	const grant = result.rows[0];
	if (!grant || grant.session_id !== actor.sessionId)
		throw new CommunityError("No encontramos una autorización para esta cuenta.", 403);
	if (grant.receipt)
		return {
			intent: grant.intent,
			authorName: grant.author_name,
			publication: null,
			ready: true,
			receipt: grant.receipt,
		};
	requireActiveGrant(grant);
	if (grant.intent.action === "withdraw") {
		const publication = await getPublication(grant.intent.publicationId);
		return {
			intent: grant.intent,
			authorName: grant.author_name,
			publication,
			ready: true,
			receipt: null,
		};
	}
	const images = await communityDb().query<CommunityMedia>(
		"SELECT * FROM community_media WHERE operation_id=$1 AND state='ready'",
		[operationId],
	);
	const portrait = images.rows.find((image) => image.slot === "portrait");
	const artwork = images.rows.find((image) => image.slot === "artwork");
	const ready = Boolean(
		grant.snapshot &&
			portrait?.input_hash === grant.snapshot.images.portrait &&
			(!grant.snapshot.images.artwork || artwork?.input_hash === grant.snapshot.images.artwork),
	);
	return {
		intent: grant.intent,
		authorName: grant.author_name,
		publication:
			ready && grant.snapshot
				? {
						id: operationId,
						version: 1,
						state: "published" as const,
						url: "",
						authorName: grant.author_name,
						snapshot: grant.snapshot,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						images: {
							portrait: `/api/community/media/${portrait?.id}`,
							artwork: artwork ? `/api/community/media/${artwork.id}` : null,
						},
					}
				: null,
		ready,
		receipt: null,
	};
}

export async function approvePublication(actor: Actor, operationId: string, snapshotHash: string) {
	const grant = await communityTransaction(async (client) => {
		const result = await client.query<CommunityGrant>(
			"SELECT * FROM community_grants WHERE operation_id=$1 FOR UPDATE",
			[operationId],
		);
		const row = result.rows[0];
		if (
			!row ||
			row.owner_id !== actor.ownerId ||
			row.session_id !== actor.sessionId ||
			row.intent.snapshotHash !== snapshotHash
		)
			throw new CommunityError("Esta autorización no pertenece a tu sesión.", 403);
		if (row.receipt) return row;
		requireActiveGrant(row);
		if (row.intent.action !== "withdraw" && !row.snapshot)
			throw new CommunityError("Espera a que tu agente prepare la vista previa.", 409);
		if (row.snapshot) {
			const media = await client.query<CommunityMedia>(
				"SELECT * FROM community_media WHERE operation_id=$1 FOR UPDATE",
				[operationId],
			);
			for (const slot of ["portrait", "artwork"] as const) {
				if (!row.snapshot.images[slot]) continue;
				if (
					!media.rows.some(
						(image) =>
							image.slot === slot &&
							image.state === "ready" &&
							image.provider_key &&
							image.input_hash === row.snapshot?.images[slot],
					)
				)
					throw new CommunityError(
						"Espera a que terminen de subir las imágenes antes de confirmar.",
						409,
					);
			}
		}
		await client.query("UPDATE community_grants SET approved_at=now() WHERE operation_id=$1", [
			operationId,
		]);
		return row;
	});
	return commitPublicationHash(grant.secret_hash, grant.snapshot ?? undefined);
}

function publicRow(row: Record<string, unknown>): CommunityPublication {
	return {
		id: String(row.id),
		version: Number(row.version),
		state: "published",
		url: `/community/${row.id}`,
		snapshot: row.snapshot as CommunitySnapshot,
		authorName: String(row.author_name),
		createdAt: new Date(String(row.created_at)).toISOString(),
		updatedAt: new Date(String(row.updated_at)).toISOString(),
		images: {
			portrait: `/api/community/media/${row.portrait_id}`,
			artwork: row.artwork_id ? `/api/community/media/${row.artwork_id}` : null,
		},
	};
}

export async function getPublication(id: string) {
	const result = await communityDb().query(
		"SELECT * FROM community_publications WHERE id=$1 AND state='published'",
		[id],
	);
	if (!result.rows[0]) throw new CommunityError("No encontramos esta publicación.", 404);
	return publicRow(result.rows[0]);
}

export async function listPublications(limit: number, cursor?: string) {
	const result = await communityDb().query(
		`SELECT * FROM community_publications WHERE state='published'
		AND ($2::uuid IS NULL OR (created_at,id) < (SELECT created_at,id FROM community_publications WHERE id=$2))
		ORDER BY created_at DESC,id DESC LIMIT $1`,
		[limit + 1, cursor ?? null],
	);
	return {
		items: result.rows.slice(0, limit).map(publicRow),
		nextCursor: result.rows.length > limit ? String(result.rows[limit - 1].id) : null,
	};
}
