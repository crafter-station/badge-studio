import { loadDesignArtwork } from "./design-assets";
import { createBack, createFoil, createPrint, loadPortrait } from "./print";
import type { PrismAppearance, PrismBadgeData } from "./types";

export async function drawBadgeFace(
	canvas: HTMLCanvasElement,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	side: "front" | "back",
	signal: AbortSignal,
) {
	const portrait = await loadPortrait(data.portraitUrl, signal);
	let artwork: ImageBitmap | undefined;
	try {
		artwork = await loadDesignArtwork(data, signal);
		signal.throwIfAborted();
		canvas.width = 1024;
		canvas.height = 1536;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("No se pudo preparar el lienzo.");
		if (side === "front") {
			ctx.drawImage(createPrint(portrait, appearance, false, data, artwork), 0, 0);
			ctx.drawImage(createFoil(data, appearance), 0, 0);
		} else ctx.drawImage(createBack(data, appearance, portrait, artwork), 0, 0);
	} finally {
		portrait.close();
		artwork?.close();
	}
}

export async function drawStylePreview(
	canvas: HTMLCanvasElement,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	signal: AbortSignal,
) {
	const portrait = data.portraitUrl ? await loadPortrait(data.portraitUrl, signal) : undefined;
	let artwork: ImageBitmap | undefined;
	try {
		artwork = await loadDesignArtwork(data, signal);
		signal.throwIfAborted();
		canvas.width = 300;
		canvas.height = 280;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		if (portrait) {
			ctx.drawImage(createPrint(portrait, appearance, true, data, artwork), 8, 5, 164, 246);
			ctx.drawImage(createFoil(data, appearance), 8, 5, 164, 246);
		}
		ctx.save();
		ctx.shadowColor = "#00000040";
		ctx.shadowBlur = 12;
		ctx.drawImage(createBack(data, appearance, portrait, artwork), 170, 74, 122, 183);
		ctx.restore();
	} finally {
		portrait?.close();
		artwork?.close();
	}
}

export async function drawBadgeThumbnail(
	canvas: HTMLCanvasElement,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	signal: AbortSignal,
) {
	const portrait = await loadPortrait(data.portraitUrl, signal);
	let artwork: ImageBitmap | undefined;
	try {
		artwork = await loadDesignArtwork(data, signal);
		signal.throwIfAborted();
		canvas.width = 144;
		canvas.height = 216;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.beginPath();
		ctx.roundRect(0, 0, 144, 216, 10);
		ctx.clip();
		ctx.drawImage(createPrint(portrait, appearance, false, data, artwork), 0, 0, 144, 216);
		ctx.drawImage(createFoil(data, appearance), 0, 0, 144, 216);
		ctx.fillStyle = "#121214";
		ctx.beginPath();
		ctx.roundRect(57, 8, 30, 5, 3);
		ctx.fill();
	} finally {
		portrait.close();
		artwork?.close();
	}
}
