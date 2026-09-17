import type { PrismBadgeData } from "./types";

export function safeArtworkUrl(value: string, origin: string) {
	if (value.startsWith("data:")) {
		if (
			value.length > 8_000_000 ||
			!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
		)
			throw new Error("El recurso visual no es válido.");
		return value;
	}
	const url = new URL(value, origin);
	if (url.origin !== origin || !["http:", "https:"].includes(url.protocol))
		throw new Error("El recurso visual debe pertenecer a este estudio.");
	return url.href;
}

export async function loadDesignArtwork(data: PrismBadgeData, signal?: AbortSignal) {
	if (!data.document || !data.artworkUrl) return undefined;
	const url = safeArtworkUrl(data.artworkUrl, window.location.origin);
	const response = await fetch(url, {
		signal: signal
			? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
			: AbortSignal.timeout(20_000),
	});
	if (!response.ok) throw new Error("No se pudo cargar el recurso visual.");
	const blob = await response.blob();
	if (blob.size > 6_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(blob.type))
		throw new Error("El recurso visual no es compatible.");
	const image = await createImageBitmap(blob);
	if (signal?.aborted || image.width > 4096 || image.height > 4096) {
		image.close();
		if (signal?.aborted) signal.throwIfAborted();
		throw new Error("El recurso visual es demasiado grande.");
	}
	return image;
}
