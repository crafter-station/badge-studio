import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { COMMUNITY_JSON_LIMIT, secretSchema } from "./community-contract";
import {
	CommunityError,
	type CommunityGrant,
	grantForSecret,
	requireActiveGrant,
} from "./community-store";
import { requireSameOrigin } from "./prism-auth";

export async function boundedBody(request: Request, limit: number) {
	if (Number(request.headers.get("content-length")) > limit)
		throw new CommunityError("La solicitud es demasiado grande.", 413);
	const reader = request.body?.getReader();
	if (!reader) throw new CommunityError("La solicitud está vacía.");
	let size = 0;
	const parts: Uint8Array[] = [];
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > limit) {
				await reader.cancel();
				throw new CommunityError("La solicitud es demasiado grande.", 413);
			}
			parts.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const result = new Uint8Array(size);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}
	return result;
}

export async function communityJson(request: Request, limit = COMMUNITY_JSON_LIMIT) {
	try {
		return JSON.parse(new TextDecoder().decode(await boundedBody(request, limit))) as unknown;
	} catch (error) {
		if (error instanceof CommunityError) throw error;
		throw new CommunityError("La solicitud debe contener JSON válido.");
	}
}

export async function communityActor() {
	const { userId, sessionId } = await auth();
	if (!userId || !sessionId)
		throw new CommunityError("Inicia sesión para publicar. Tu diseño sigue abierto.", 401);
	const user = await currentUser();
	if (!user) throw new CommunityError("Vuelve a iniciar sesión.", 401);
	const session = await (await clerkClient()).sessions.getSession(sessionId);
	if (session.status !== "active" || session.userId !== userId)
		throw new CommunityError("La sesión terminó. Vuelve a iniciar sesión.", 401);
	return {
		ownerId: userId,
		sessionId,
		authorName:
			[user.firstName, user.lastName].filter(Boolean).join(" ").slice(0, 100) || "Creador",
	};
}

export function requestSecret(request: Request) {
	return secretSchema.parse(request.headers.get("authorization")?.replace(/^Bearer /, ""));
}

export async function verifyGrantSession(grant: CommunityGrant) {
	const session = await (await clerkClient()).sessions
		.getSession(grant.session_id)
		.catch(() => null);
	if (!session || session.status !== "active" || session.userId !== grant.owner_id)
		throw new CommunityError("SESSION_ENDED: Vuelve a verificar tu cuenta antes de publicar.", 401);
}

export async function activeRequestGrant(request: Request) {
	const secret = requestSecret(request);
	const grant = requireActiveGrant(await grantForSecret(secret));
	await verifyGrantSession(grant);
	return { secret, grant };
}

export async function communityResponse(
	request: Request,
	work: () => Promise<unknown>,
	sameOrigin = request.method !== "GET",
) {
	try {
		if (sameOrigin) requireSameOrigin(request);
		const result = await work();
		return result instanceof Response
			? result
			: Response.json(result, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		const status =
			error instanceof CommunityError
				? error.status
				: error instanceof z.ZodError
					? 400
					: error instanceof Error && "status" in error && error.status === 403
						? 403
						: 503;
		const message =
			error instanceof CommunityError
				? error.message
				: error instanceof z.ZodError
					? error.issues[0]?.message
					: status === 403
						? "La solicitud no viene de esta página."
						: "El servicio no está disponible. Tu diseño sigue guardado; consulta el estado antes de reintentar.";
		return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
	}
}
