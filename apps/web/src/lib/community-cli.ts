import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import {
	type CommunityReceipt,
	canonicalJson,
	communityIntentSchema,
	communitySnapshotSchema,
	digestSchema,
	secretSchema,
} from "./community-contract";
import { communityJson } from "./community-server";
import { communityObjectKey, communityStorage } from "./community-storage";
import {
	CommunityError,
	approvePublication,
	authorizePublication,
	communityDb,
	getPublication,
	grantForSecret,
	requireActiveGrant,
	reviewPublication,
	secretKey,
	sha256,
	stagePublication,
} from "./community-store";

export function cliConfiguration() {
	const clientId = process.env.BADGIO_OAUTH_CLIENT_ID;
	const issuer = process.env.BADGIO_OAUTH_ISSUER;
	if (!clientId || !issuer)
		throw new CommunityError(
			"CLI_NOT_CONFIGURED: La publicación por CLI aún no está configurada.",
			503,
		);
	return { clientId, issuer, scopes: "profile offline_access" };
}

export function validateCliToken(
	token: {
		clientId: string;
		subject: string;
		scopes: string[];
		revoked: boolean;
		expired: boolean;
		expiration: number | null;
	},
	clientId: string,
) {
	if (
		token.clientId !== clientId ||
		!token.subject.startsWith("user_") ||
		!token.scopes.includes("profile") ||
		token.revoked ||
		token.expired ||
		(token.expiration !== null && token.expiration * 1000 <= Date.now())
	)
		throw new CommunityError("LOGIN_REQUIRED: Vuelve a conectar badgio con tu cuenta.", 401);
	return token.subject;
}

export async function cliActor(request: Request) {
	const { clientId } = cliConfiguration();
	const bearer = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1];
	if (!bearer || bearer.length > 8192)
		throw new CommunityError("LOGIN_REQUIRED: Ejecuta badgio login.", 401);
	const client = await clerkClient();
	const token = await client.idPOAuthAccessToken.verify(bearer).catch(() => {
		throw new CommunityError("LOGIN_REQUIRED: Vuelve a conectar badgio con tu cuenta.", 401);
	});
	const ownerId = validateCliToken(token, clientId);
	const user = await client.users.getUser(ownerId);
	return {
		ownerId,
		sessionId: `oauth:${clientId}:${ownerId}`,
		authorName:
			[user.firstName, user.lastName].filter(Boolean).join(" ").slice(0, 100) || "Creador",
	};
}

const publishInput = z.discriminatedUnion("action", [
	z
		.object({
			action: z.literal("prepare"),
			intent: communityIntentSchema.refine((intent) => intent.action === "create"),
			secret: secretSchema,
			snapshot: communitySnapshotSchema,
			consent: z.literal(true),
		})
		.strict(),
	z
		.object({
			action: z.literal("commit"),
			operationId: z.string().uuid(),
			snapshotHash: digestSchema,
			consent: z.literal(true),
		})
		.strict(),
]);

export async function cliPublish(request: Request) {
	const actor = await cliActor(request);
	const value = publishInput.parse(await communityJson(request, 270_000));
	if (value.action === "commit")
		return approvePublication(actor, value.operationId, value.snapshotHash);
	if (
		sha256(canonicalJson(value.snapshot)) !== value.intent.snapshotHash ||
		value.snapshot.design.name !== value.intent.title ||
		value.snapshot.participant.name !== value.intent.participantName
	)
		throw new CommunityError(
			"SNAPSHOT_CONFLICT: El paquete no coincide con la versión aprobada.",
			409,
		);
	const authorization = await authorizePublication(
		actor,
		secretKey(value.secret),
		value.intent,
		true,
	);
	if (authorization.receipt) return { receipt: await currentReceipt(authorization.receipt) };
	await stagePublication(value.secret, value.snapshot);
	const retired = await communityDb().query<{ id: string }>(
		"SELECT id FROM community_media WHERE operation_id=$1 AND state IN ('retiring','deleted')",
		[value.intent.operationId],
	);
	for (const media of retired.rows) {
		await communityStorage().delete(communityObjectKey(media.id));
		await communityDb().query(
			"DELETE FROM community_media WHERE id=$1 AND state IN ('retiring','deleted')",
			[media.id],
		);
	}
	const media = await communityDb().query<{ slot: "portrait" | "artwork" }>(
		"SELECT slot FROM community_media WHERE operation_id=$1 AND state='ready'",
		[value.intent.operationId],
	);
	return { operationId: value.intent.operationId, uploaded: media.rows.map((row) => row.slot) };
}

export async function cliPublicationStatus(request: Request, operationId: string) {
	const actor = await cliActor(request);
	const review = await reviewPublication(actor, z.string().uuid().parse(operationId));
	if (!review.receipt) return { state: review.ready ? "ready" : "preparing", operationId };
	const receipt = await currentReceipt(review.receipt);
	return { state: receipt.state, receipt };
}

async function currentReceipt(receipt: CommunityReceipt) {
	let state = receipt.state;
	try {
		state = (await getPublication(receipt.id)).state;
	} catch (error) {
		if (!(error instanceof CommunityError) || error.status !== 404) throw error;
		state = "withdrawn";
	}
	return { ...receipt, state };
}

export async function cliMediaGrant(request: Request) {
	const actor = await cliActor(request);
	const secret = secretSchema.parse(request.headers.get("x-badge-operation"));
	const grant = requireActiveGrant(await grantForSecret(secret));
	if (grant.owner_id !== actor.ownerId || grant.session_id !== actor.sessionId)
		throw new CommunityError("Esta operación pertenece a otra cuenta.", 403);
	return secret;
}
