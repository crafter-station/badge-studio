import type { BadgeLayer } from "@crafter-station/badge-studio-design/badge-design";
import { type CanvasFilterStack, drawFiltered } from "./canvas-filter";
import { filterPixels } from "./filters";

type PortraitLayer = Extract<BadgeLayer, { kind: "portrait" }>;

export function coverDesignImage(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	w: number,
	h: number,
	layer?: PortraitLayer,
) {
	const crop = layer?.crop;
	const scale = Math.max(w / image.width, h / image.height) * (crop?.zoom ?? 1);
	const cw = w / scale;
	const ch = h / scale;
	const x =
		layer?.cropMode === "focus"
			? Math.max(0, Math.min(image.width - cw, image.width * (crop?.x ?? 0.5) - cw / 2))
			: (image.width - cw) * (crop?.x ?? 0.5);
	const y =
		layer?.cropMode === "focus"
			? Math.max(0, Math.min(image.height - ch, image.height * (crop?.y ?? 0.5) - ch / 2))
			: (image.height - ch) * (crop?.y ?? 0.5);
	ctx.drawImage(image, x, y, cw, ch, 0, 0, w, h);
}

export function paintDesignPhoto(
	ctx: CanvasRenderingContext2D,
	layer: PortraitLayer,
	image: ImageBitmap,
) {
	const photo = document.createElement("canvas");
	photo.width = Math.ceil(layer.w);
	photo.height = Math.ceil(layer.h);
	const surface = photo.getContext("2d");
	if (!surface) return;
	const stack: CanvasFilterStack = {
		contrast:
			layer.contrast ?? (layer.filter === "original" ? 1 : layer.filter === "warm" ? 1.07 : 1.16),
		saturate: layer.saturation,
		brightness: layer.brightness,
		blur: layer.blur || undefined,
	};
	if (["mono", "rose", "blue", "warm"].includes(layer.filter)) stack.grayscale = 1;
	if (layer.filter === "warm") stack.sepia = 0.5;
	drawFiltered(surface, stack, { x: 0, y: 0, width: layer.w, height: layer.h }, () =>
		coverDesignImage(surface, image, layer.w, layer.h, layer),
	);
	if (["thermal", "silver", "cyanotype", "vintage"].includes(layer.filter)) {
		const pixels = surface.getImageData(0, 0, photo.width, photo.height);
		filterPixels(
			pixels.data,
			layer.filter === "silver" ? "mono" : (layer.filter as "thermal" | "cyanotype" | "vintage"),
		);
		surface.putImageData(pixels, 0, 0);
	}
	const tint =
		layer.tint ??
		(layer.filter === "rose" ? "#c58bae" : layer.filter === "blue" ? "#73bac8" : undefined);
	if (tint) {
		const pixels = surface.getImageData(0, 0, photo.width, photo.height);
		const alpha = new Uint8ClampedArray(photo.width * photo.height);
		for (let i = 0; i < alpha.length; i++) {
			alpha[i] = pixels.data[i * 4 + 3];
			pixels.data[i * 4 + 3] = 255;
		}
		surface.putImageData(pixels, 0, 0);
		surface.globalCompositeOperation = layer.tintMode ?? "multiply";
		surface.globalAlpha = layer.tintOpacity ?? 1;
		surface.fillStyle = tint;
		surface.fillRect(0, 0, layer.w, layer.h);
		surface.globalAlpha = 1;
		const tinted = surface.getImageData(0, 0, photo.width, photo.height);
		for (let i = 0; i < alpha.length; i++) tinted.data[i * 4 + 3] = alpha[i];
		surface.putImageData(tinted, 0, 0);
	}
	if (layer.fade) {
		surface.globalCompositeOperation = "destination-in";
		for (const horizontal of [true, false]) {
			const start = horizontal ? layer.fade.x : layer.fade.top;
			const end = horizontal ? (layer.fade.right ?? layer.fade.x) : layer.fade.bottom;
			const gradient = surface.createLinearGradient(
				0,
				0,
				horizontal ? layer.w : 0,
				horizontal ? 0 : layer.h,
			);
			gradient.addColorStop(0, start ? "#00000000" : "#000000");
			gradient.addColorStop(start, "#000000");
			gradient.addColorStop(1 - end, "#000000");
			gradient.addColorStop(1, end ? "#00000000" : "#000000");
			surface.fillStyle = gradient;
			surface.fillRect(0, 0, layer.w, layer.h);
		}
	}
	ctx.drawImage(photo, 0, 0);
}
