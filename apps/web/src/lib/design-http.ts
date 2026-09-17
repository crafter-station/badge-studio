import { join } from "node:path";
import {
	badgeDesignSchema,
	designLockSchema,
} from "@crafter-station/badge-studio-design/badge-design";
import sharp from "sharp";
import { z } from "zod";
import { attachArtwork } from "./design-artwork";
import { generateArtwork, generateDesigns, once } from "./design-generation";
import { readShowcaseAsset } from "./design-showcase-assets";
import { DesignError, DesignStore } from "./design-store";
import { BadgeAccessError, requireSameOrigin, resolveBadgeAttendee } from "./prism-auth";

const emptyLocks = { front: [], back: [], material: false };
const generation = z.object({
	prompt: z.string().trim().min(3).max(1500),
	event: z.string().trim().min(1).max(80),
	referenceId: z.string().uuid().optional(),
	current: badgeDesignSchema.optional(),
	base: badgeDesignSchema.optional(),
	locks: designLockSchema.default(emptyLocks),
	requestId: z.string().uuid(),
});
const artwork = z.object({
	design: badgeDesignSchema,
	referenceId: z.string().uuid().optional(),
	locks: designLockSchema.default(emptyLocks),
	requestId: z.string().uuid(),
});
const save = z.object({
	design: badgeDesignSchema,
	designId: z.string().uuid().optional(),
	expectedVersion: z.number().int().positive().optional(),
});
async function bytes(request: Request, max: number) {
	if (Number(request.headers.get("content-length")) > max)
		throw new DesignError(413, "La solicitud es demasiado grande.");
	const reader = request.body?.getReader();
	if (!reader) throw new DesignError(400, "Falta la solicitud.");
	let size = 0;
	const chunks: Uint8Array[] = [];
	try {
		while (true) {
			const part = await reader.read();
			if (part.done) break;
			size += part.value.length;
			if (size > max) {
				await reader.cancel();
				throw new DesignError(413, "La solicitud es demasiado grande.");
			}
			chunks.push(part.value);
		}
	} finally {
		reader.releaseLock();
	}
	return Buffer.concat(chunks);
}
function json(value: unknown, status = 200) {
	return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function handleDesignRequest(request: Request, path: string[] = []) {
	try {
		if (process.env.VERCEL)
			throw new DesignError(
				503,
				"Este piloto necesita almacenamiento persistente antes de publicarse.",
			);
		const write = request.method === "POST";
		if (write) requireSameOrigin(request);
		const user = await resolveBadgeAttendee(request);
		const scope = { ownerId: user.ownerId, eventId: user.eventId };
		const store = new DesignStore(
			process.env.PRISM_DESIGN_DATA_DIR || join(process.cwd(), ".prism-designs"),
			readShowcaseAsset,
		);
		const signal = AbortSignal.any([
			request.signal,
			AbortSignal.timeout(path[0] === "artwork" ? 170_000 : 170_000),
		]);
		if (request.method === "GET") {
			if (path.length === 0)
				return json({
					designs: await store.list(scope),
					generationAvailable: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
					artworkAvailable: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
					demo: user.demo,
				});
			if (path.length === 1) return json(await store.get(scope, path[0]));
			if (path.length === 2 && path[0] === "assets")
				return new Response(new Uint8Array(await store.asset(scope, path[1])), {
					headers: {
						"Content-Type": "image/png",
						"Cache-Control": "private, no-store",
						"X-Content-Type-Options": "nosniff",
					},
				});
		}
		if (!write) throw new DesignError(405, "Método no permitido.");
		if (path[0] === "reference" && path.length === 1) {
			const body = await bytes(request, 4_000_000);
			const form = await new Response(body, {
				headers: { "Content-Type": request.headers.get("content-type") || "" },
			}).formData();
			const image = form.get("reference");
			if (
				!(image instanceof File) ||
				!["image/png", "image/jpeg", "image/webp"].includes(image.type)
			)
				throw new DesignError(400, "Elige una imagen PNG, JPG o WebP.");
			const normalized = await sharp(await image.arrayBuffer(), { limitInputPixels: 24_000_000 })
				.rotate()
				.resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
				.png()
				.toBuffer();
			signal.throwIfAborted();
			return json({ id: await store.putAsset(scope, normalized) });
		}
		let body: unknown;
		try {
			body = JSON.parse((await bytes(request, 512_000)).toString());
		} catch (error) {
			if (error instanceof DesignError) throw error;
			throw new DesignError(400, "La solicitud no es JSON válido.");
		}
		if (path.length === 0) {
			const value = save.parse(body);
			return json(await store.save(scope, value.design, value.designId, value.expectedVersion));
		}
		if (path.length !== 1) throw new DesignError(404, "Ruta no encontrada.");
		if (path[0] === "generate") {
			const value = generation.parse(body);
			if (value.current?.artwork) await store.asset(scope, value.current.artwork.assetId);
			if (value.base?.artwork) await store.asset(scope, value.base.artwork.assetId);
			const reference = value.referenceId ? await store.asset(scope, value.referenceId) : undefined;
			return json(
				await once(JSON.stringify(scope), value.requestId, value, async () => ({
					designs: await generateDesigns({ ...value, reference, signal }),
				})),
			);
		}
		if (path[0] === "artwork") {
			const value = artwork.parse(body);
			if (value.design.artwork) await store.asset(scope, value.design.artwork.assetId);
			if (
				(["front", "back"] as const).some((side) =>
					value.design[side].layers.some(
						(layer) => layer.kind === "image" && value.locks[side].includes(layer.id),
					),
				)
			)
				throw new DesignError(409, "Desbloquea la ilustración antes de regenerarla.");
			const reference = value.referenceId ? await store.asset(scope, value.referenceId) : undefined;
			return json(
				await once(JSON.stringify(scope), value.requestId, value, async () => {
					attachArtwork(value.design, "00000000-0000-4000-8000-000000000000");
					const image = await generateArtwork(value.design, reference, signal);
					signal.throwIfAborted();
					const assetId = await store.putAsset(scope, image);
					return { design: attachArtwork(value.design, assetId) };
				}),
			);
		}
		throw new DesignError(404, "Ruta no encontrada.");
	} catch (error) {
		if (error instanceof DesignError || error instanceof BadgeAccessError)
			return json({ error: error.message }, error.status);
		if (error instanceof z.ZodError)
			return json(
				{ error: "Revisa el texto, las capas y el espacio del QR antes de continuar." },
				400,
			);
		if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name))
			return json(
				{ error: "La operación tardó demasiado o fue cancelada. Conservamos tu diseño." },
				408,
			);
		console.error("[design-service]", error instanceof Error ? error.name : "unknown");
		return json({ error: "No pudimos completar esta exploración. Tu diseño sigue intacto." }, 502);
	}
}
