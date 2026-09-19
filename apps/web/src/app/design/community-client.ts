import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";
import {
	type BadgeBundle,
	COMMUNITY_IMAGE_LIMIT,
	COMMUNITY_JSON_LIMIT,
	type CommunityIntent,
	type CommunityReceipt,
	type CommunitySnapshot,
	canonicalJson,
	communityDigest,
	communitySnapshotSchema,
	createPublicationSecret,
	publicParticipant,
	publicationKey,
} from "../../lib/community-contract";
import { designAssetUrl } from "./design-client";

export type PreparedPublication = {
	intent: CommunityIntent;
	secret: string;
	snapshot?: CommunitySnapshot;
	files: { portrait?: Blob; artwork?: Blob };
	receipt?: CommunityReceipt;
	consented?: boolean;
	uploaded?: boolean;
	createdAt: number;
};

export class CommunityRequestError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

export function requirePendingPublication(value?: PreparedPublication) {
	if (value?.receipt)
		throw new Error(
			"ALREADY_COMPLETED: La operación ya terminó. Conservamos su comprobante; puedes retirar la publicación si lo deseas.",
		);
}

export async function communityRequest<T>(
	path: string,
	body?: unknown,
	secret?: string,
	signal?: AbortSignal,
): Promise<T> {
	const response = await fetch(`/api/community${path}`, {
		method: body === undefined ? "GET" : "POST",
		headers: {
			...(body instanceof Blob
				? { "Content-Type": body.type }
				: body !== undefined
					? { "Content-Type": "application/json" }
					: {}),
			...(secret ? { Authorization: `Bearer ${secret}` } : {}),
		},
		body: body instanceof Blob ? body : body === undefined ? undefined : JSON.stringify(body),
		cache: "no-store",
		signal: signal
			? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
			: AbortSignal.timeout(30_000),
	});
	const result = await response.json();
	if (!response.ok)
		throw new CommunityRequestError(
			typeof result.error === "string"
				? result.error
				: (result.error?.message ?? "No pudimos completar la publicación. Tu diseño sigue aquí."),
			response.status,
		);
	return result as T;
}

export async function publicationCheckpoint(
	value?: PreparedPublication | null,
	factory: IDBFactory = indexedDB,
	signal?: AbortSignal,
): Promise<PreparedPublication | undefined> {
	signal?.throwIfAborted();
	const opening = factory.open("badge-studio-publication-v1", 1);
	opening.onupgradeneeded = () => opening.result.createObjectStore("checkpoint");
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		const abort = () => reject(signal?.reason);
		signal?.addEventListener("abort", abort, { once: true });
		opening.onsuccess = () => {
			signal?.removeEventListener("abort", abort);
			if (signal?.aborted) opening.result.close();
			else resolve(opening.result);
		};
		opening.onerror = () => {
			signal?.removeEventListener("abort", abort);
			reject(opening.error);
		};
	});
	try {
		signal?.throwIfAborted();
		return await new Promise((resolve, reject) => {
			const transaction = database.transaction(
				"checkpoint",
				value === undefined ? "readonly" : "readwrite",
			);
			const store = transaction.objectStore("checkpoint");
			const request =
				value === undefined
					? store.get("active")
					: value === null
						? store.delete("active")
						: store.put(value, "active");
			const abort = () => transaction.abort();
			signal?.addEventListener("abort", abort, { once: true });
			transaction.oncomplete = () => {
				signal?.removeEventListener("abort", abort);
				resolve(value === undefined ? request.result : (value ?? undefined));
			};
			transaction.onabort = () => {
				signal?.removeEventListener("abort", abort);
				reject(
					signal?.reason ??
						transaction.error ??
						new Error("No pudimos guardar la versión para publicar."),
				);
			};
		});
	} finally {
		database.close();
	}
}

async function sourceImage(url: string, signal?: AbortSignal, preserveOriginal = false) {
	if (!url) throw new Error("Añade una foto antes de publicar.");
	const resolved = new URL(url, window.location.origin);
	if (resolved.protocol !== "blob:" && resolved.origin !== window.location.origin)
		throw new Error("Importa la imagen en el editor antes de publicarla.");
	const response = await fetch(resolved, { signal });
	if (!response.ok) throw new Error("No pudimos leer una imagen del badge.");
	let image = await response.blob();
	if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
		throw new Error("Usa imágenes PNG, JPEG o WebP.");
	if (image.size > COMMUNITY_IMAGE_LIMIT) {
		if (preserveOriginal)
			throw new Error(
				"Para guardar el paquete completo, importa una versión de la imagen de menos de 3 MB y revisa la vista previa.",
			);
		const bitmap = await createImageBitmap(image);
		try {
			if (bitmap.width * bitmap.height > 24_000_000)
				throw new Error("La imagen supera 24 megapíxeles.");
			const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);
			const context = canvas.getContext("2d");
			if (!context) throw new Error("No pudimos preparar la imagen.");
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			image = await new Promise<Blob>((resolve, reject) =>
				canvas.toBlob(
					(blob) => (blob ? resolve(blob) : reject(new Error("No pudimos preparar la imagen."))),
					"image/webp",
					0.9,
				),
			);
		} finally {
			bitmap.close();
		}
	}
	if (!image.size || image.size > COMMUNITY_IMAGE_LIMIT)
		throw new Error("Reduce la imagen a menos de 3 MB antes de publicar.");
	return image;
}

export async function preparePublication(
	design: BadgeDesign,
	participant: PrismBadgeData,
	target?: { publicationId: string; expectedVersion: number },
	signal?: AbortSignal,
	preserveOriginal = false,
): Promise<PreparedPublication> {
	const document = structuredClone(design);
	const person = publicParticipant(participant);
	const portrait = await sourceImage(participant.portraitUrl ?? "", signal, preserveOriginal);
	const artwork = document.artwork
		? await sourceImage(designAssetUrl(document.artwork.assetId), signal, preserveOriginal)
		: undefined;
	const snapshot = communitySnapshotSchema.parse({
		format: 1,
		design: document,
		participant: person,
		images: {
			portrait: await communityDigest(portrait),
			artwork: artwork ? await communityDigest(artwork) : null,
		},
	});
	const serialized = canonicalJson(snapshot);
	if (new TextEncoder().encode(serialized).length > COMMUNITY_JSON_LIMIT)
		throw new Error("El diseño supera el límite de publicación de 256 KB.");
	signal?.throwIfAborted();
	return {
		intent: {
			operationId: crypto.randomUUID(),
			snapshotHash: await communityDigest(serialized),
			title: document.name,
			participantName: person.name,
			...(target ? { action: "update", ...target } : { action: "create" }),
		},
		secret: createPublicationSecret(),
		snapshot,
		files: { portrait, artwork },
		createdAt: Date.now(),
	};
}

export async function authorizationUrl(prepared: PreparedPublication) {
	const url = new URL("/community/authorize", window.location.origin);
	url.hash = new URLSearchParams({
		request: JSON.stringify({
			secretHash: publicationKey(prepared.secret, await communityDigest(prepared.secret)),
			intent: prepared.intent,
		}),
	}).toString();
	return url.href;
}

export async function createBadgeBundle(
	design: BadgeDesign,
	participant: PrismBadgeData,
	signal?: AbortSignal,
): Promise<BadgeBundle> {
	const prepared = await preparePublication(design, participant, undefined, signal, true);
	async function image(blob?: Blob) {
		if (!blob) return null;
		const bytes = new Uint8Array(await blob.arrayBuffer());
		let binary = "";
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return {
			mimeType: blob.type as BadgeBundle["images"]["portrait"]["mimeType"],
			base64: btoa(binary),
		};
	}
	const portrait = await image(prepared.files.portrait);
	if (!prepared.snapshot || !portrait) throw new Error("The badge needs a portrait.");
	const artwork = await image(prepared.files.artwork);
	signal?.throwIfAborted();
	return {
		format: "badge-studio-bundle",
		version: 1,
		snapshot: prepared.snapshot,
		images: { portrait, artwork },
	};
}
