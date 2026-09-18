import { randomUUID } from "node:crypto";
import { Client } from "@neondatabase/serverless";
import sharp from "sharp";
import { COMMUNITY_OBJECT_LIMIT, communityObjectKey, communityStorage } from "./community-storage";
import {
	CommunityError,
	type CommunityMedia,
	communityDb,
	communityTransaction,
	grantForSecret,
	requireActiveGrant,
	sha256,
} from "./community-store";

export async function normalizeCommunityImage(bytes: Uint8Array) {
	const image = sharp(bytes, { limitInputPixels: 24_000_000, failOn: "warning" });
	const metadata = await image.metadata().catch(() => {
		throw new CommunityError("La imagen no es válida. Usa PNG, JPEG o WebP.");
	});
	if (!["png", "jpeg", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1)
		throw new CommunityError("Usa una imagen estática PNG, JPEG o WebP.");
	const output = await image
		.rotate()
		.resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
		.webp({ quality: 92 })
		.toBuffer();
	if (output.length > COMMUNITY_OBJECT_LIMIT)
		throw new CommunityError("Reduce la imagen a menos de 3 MB.");
	return output;
}

export async function uploadCommunityImage(
	secret: string,
	slot: "portrait" | "artwork",
	bytes: Uint8Array,
) {
	const storage = communityStorage();
	const inputHash = sha256(bytes);
	const prepared = requireActiveGrant(await grantForSecret(secret));
	if (prepared.intent.action === "withdraw" || prepared.snapshot?.images[slot] !== inputHash)
		throw new CommunityError("La imagen no coincide con la versión preparada.", 409);
	const normalized = await normalizeCommunityImage(bytes);
	const outputHash = sha256(normalized);
	const reservation = await communityTransaction(async (client) => {
		const grant = requireActiveGrant(await grantForSecret(secret, client, true));
		if (grant.intent.action === "withdraw")
			throw new CommunityError("El retiro no permite subir imágenes.", 409);
		if (!grant.snapshot || grant.snapshot.images[slot] !== inputHash)
			throw new CommunityError("La imagen no coincide con la versión preparada.", 409);
		const existing = await client.query<CommunityMedia>(
			"SELECT * FROM community_media WHERE operation_id=$1 AND slot=$2 FOR UPDATE",
			[grant.operation_id, slot],
		);
		if (existing.rows[0]) {
			const media = existing.rows[0];
			if (media.input_hash !== inputHash || media.output_hash !== outputHash)
				throw new CommunityError("La imagen cambió. Prepara una nueva publicación.", 409);
			return media;
		}
		const id = randomUUID();
		const added = await client.query<CommunityMedia>(
			"INSERT INTO community_media (id,operation_id,slot,input_hash,output_hash,bytes,provider_key) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
			[
				id,
				grant.operation_id,
				slot,
				inputHash,
				outputHash,
				normalized.length,
				communityObjectKey(id),
			],
		);
		return added.rows[0];
	});
	const media = reservation;
	if (media.state === "ready") return { id: media.id, ready: true };
	if (media.state !== "uploading")
		throw new CommunityError("La subida caducó. Prepara una nueva publicación.", 410);
	const key = communityObjectKey(media.id);
	await storage.put(key, normalized).catch(() => {
		throw new CommunityError(
			"STORAGE_UNAVAILABLE: No pudimos confirmar la subida. Conservamos tu badge; puedes reintentar la misma versión.",
			503,
		);
	});
	await communityTransaction(async (client) => {
		requireActiveGrant(await grantForSecret(secret, client, true));
		await client.query(
			"UPDATE community_media SET provider_key=$2,state='ready',updated_at=now() WHERE id=$1 AND state='uploading'",
			[media.id, key],
		);
	});
	return { id: media.id, ready: true };
}

export async function publicCommunityImage(id: string, ownerId?: string) {
	const result = await communityDb().query<CommunityMedia>(
		`SELECT m.* FROM community_media m WHERE m.id=$1 AND m.state='ready'
		AND (EXISTS (SELECT 1 FROM community_publications p WHERE p.state='published' AND (p.portrait_id=m.id OR p.artwork_id=m.id))
		OR EXISTS (SELECT 1 FROM community_grants g WHERE g.operation_id=m.operation_id AND g.owner_id=$2 AND g.expires_at>now() AND g.receipt IS NULL AND g.revoked_at IS NULL))`,
		[id, ownerId ?? null],
	);
	const media = result.rows[0];
	if (!media?.provider_key) throw new CommunityError("Imagen no disponible.", 404);
	const bytes = await communityStorage().get(media.provider_key);
	if (sha256(bytes) !== media.output_hash)
		throw new CommunityError("La imagen no está disponible. Inténtalo de nuevo.", 503);
	return new Response(bytes, {
		headers: {
			"Content-Type": "image/webp",
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
			"Content-Disposition": "inline",
		},
	});
}

export async function cleanCommunityImages(storage = communityStorage()) {
	const deadline = Date.now() + 45_000;
	communityDb();
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		connectionTimeoutMillis: 5000,
		query_timeout: 3000,
	});
	client.on("error", () => {});
	const query = (text: string, values?: unknown[]) => client.query(text, values);
	let checked = 0;
	let deleted = 0;
	try {
		await client.connect();
		await query("DELETE FROM community_cancellations WHERE expires_at <= now()");
		while (checked < 512 && Date.now() + 15_000 < deadline) {
			await query("BEGIN");
			await query("SET LOCAL statement_timeout = '3s'");
			const claimed = await query(
				`WITH candidates AS (
					SELECT m.id FROM community_media m JOIN community_grants g ON g.operation_id=m.operation_id
					WHERE m.state != 'deleted' AND (m.state != 'retiring' OR m.updated_at < now() - interval '10 minutes')
					AND (g.expires_at < now() - interval '1 hour' OR g.revoked_at < now() - interval '1 hour')
					AND NOT EXISTS (SELECT 1 FROM community_publications p WHERE p.state='published' AND (p.portrait_id=m.id OR p.artwork_id=m.id))
					ORDER BY m.updated_at LIMIT 8 FOR UPDATE OF m SKIP LOCKED
				) UPDATE community_media m SET state='retiring',updated_at=now()
					FROM candidates c WHERE m.id=c.id RETURNING m.*`,
			);
			await query("COMMIT");
			if (!claimed.rows.length) break;
			checked += claimed.rows.length;
			const results = await Promise.allSettled(
				claimed.rows.map(async (media: CommunityMedia) => {
					await storage.delete(communityObjectKey(media.id), AbortSignal.timeout(8000));
					return media.id;
				}),
			);
			const ids = results.flatMap((result) =>
				result.status === "fulfilled" ? [result.value] : [],
			);
			if (ids.length) {
				await query(
					"UPDATE community_media SET state='deleted',provider_key=NULL,updated_at=now() WHERE id=ANY($1::uuid[]) AND state='retiring'",
					[ids],
				);
				deleted += ids.length;
			}
		}
	} finally {
		await client.end();
	}
	return { checked, deleted, retrying: checked - deleted };
}
