import type {
	BadgeDesign,
	BadgeLayer,
	DesignSide,
} from "@crafter-station/badge-studio-design/badge-design";
import QRCode from "qrcode";
import { paintDesignGraphic } from "./design-graphics";
import { coverDesignImage, paintDesignPhoto } from "./design-photo";
import { paintDesignText } from "./design-text";
import type { PrismAppearance, PrismBadgeData } from "./types";

export function designAppearance(design: BadgeDesign): PrismAppearance {
	if (design.material.recipe) {
		const recipe = design.material.recipe;
		return {
			surface: design.material.surface,
			filter: design.front.layers.some(
				(layer) =>
					layer.kind === "portrait" && layer.filter === "thermal" && layer.visible !== false,
			)
				? "thermal"
				: "original",
			finish: recipe.finish,
			motion: "living",
			crop: { x: 0.5, y: 0.5, zoom: 1 },
			face: design.material.focus ?? { x: 0.5, y: 0.48, radius: 0.26 },
			recipe: {
				...recipe,
				surface: design.material.surface,
				material: {
					roughness: design.material.roughness,
					iridescence: design.material.iridescence,
				},
				motion: { ...recipe.motion, speed: design.material.speed },
			},
		};
	}
	const activeEffect = design.front.layers.find((l) => l.kind === "effect" && l.visible !== false);
	const colors =
		activeEffect?.kind === "effect"
			? activeEffect.colors
			: [design.front.background, "#c9c3dd", "#e6d3e9"];
	return {
		surface: design.material.surface,
		filter: "original",
		finish: "crystal",
		motion: "living",
		crop: { x: 0.5, y: 0.5, zoom: 1 },
		face: { x: 0.5, y: 0.5, radius: 0.25 },
		recipe: {
			promptVersion: "style-director-v1",
			model: "layered-design-v1",
			version: 1,
			name: design.name,
			description: design.description,
			surface: design.material.surface,
			finish: "crystal",
			palette: colors as [string, string, string],
			accent: colors[1],
			portrait: { strength: 0, saturation: 1, contrast: 1 },
			texture: { pattern: "none", amount: 0, scale: 1 },
			material: { roughness: design.material.roughness, iridescence: design.material.iridescence },
			motion: { speed: design.material.speed, amplitude: 0.25 },
			heading: "sans",
			seed: 170926,
		},
	};
}
function plate() {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1536;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No se pudo preparar el diseño.");
	return { canvas, ctx };
}
function effect(ctx: CanvasRenderingContext2D, layer: Extract<BadgeLayer, { kind: "effect" }>) {
	const { w, h, colors, scale } = layer;
	if (layer.effect === "chromatic-flow") {
		const tile = document.createElement("canvas");
		tile.width = 192;
		tile.height = 288;
		const surface = tile.getContext("2d");
		if (!surface) return;
		const pixels = surface.createImageData(192, 288);
		const rgb = (value: string) =>
			[1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
		const [base, pink, cyan] = colors.map(rgb);
		for (let y = 0; y < 288; y++)
			for (let x = 0; x < 192; x++) {
				const py = (0.5 - y / 288) * 2.26;
				const bend = Math.sin(py * 2.4) * 0.28 + Math.sin(py * 1.15) * 0.13;
				const v = ((x / 192 - 0.5) * 1.49 * 0.9 + bend) * scale;
				const weights = [
					Math.exp(-(((v + 0.03) / 0.22) ** 2)) * 0.92,
					Math.exp(-(((v - 0.35) / 0.13) ** 2)) * 0.72,
				];
				for (let c = 0; c < 3; c++)
					pixels.data[(y * 192 + x) * 4 + c] =
						255 *
						((base[c] * (1 - weights[0]) + pink[c] * weights[0]) * (1 - weights[1]) +
							cyan[c] * weights[1]);
				pixels.data[(y * 192 + x) * 4 + 3] = 255;
			}
		surface.putImageData(pixels, 0, 0);
		ctx.drawImage(tile, 0, 0, w, h);
		return;
	}
	const gradient = ctx.createLinearGradient(0, h, w, 0);
	colors.forEach((c, i) => gradient.addColorStop(i / 2, c));
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = colors[2];
	ctx.lineWidth = 1.5;
	for (let i = 0; i < 14; i++) {
		ctx.beginPath();
		const t = i / 14;
		if (layer.effect === "orbits") {
			ctx.ellipse(
				w / 2,
				h / 2,
				Math.max(1, w * t * 0.6),
				Math.max(1, h * t * 0.55),
				-0.25,
				0,
				Math.PI * 2,
			);
		} else if (layer.effect === "grain") {
			ctx.globalAlpha = layer.opacity * 0.22;
			for (let j = 0; j < 70; j++) {
				const x = (((i * 997 + j * 773) % 997) / 997) * w;
				const y = (((i * 503 + j * 337) % 991) / 991) * h;
				ctx.fillStyle = colors[j % 3];
				ctx.fillRect(x, y, 2, 2);
			}
		} else {
			for (let j = 0; j <= 80; j++) {
				const x = (j / 80) * w;
				const y = h * t + Math.sin((j / 80) * 6 * scale + t * 4) * h * 0.11;
				if (j === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
		}
		ctx.stroke();
	}
}
function paint(
	ctx: CanvasRenderingContext2D,
	input: BadgeLayer,
	data: PrismBadgeData,
	portrait?: ImageBitmap,
	artwork?: ImageBitmap,
) {
	let layer = input;
	ctx.save();
	ctx.translate(layer.x, layer.y);
	if (layer.rotation) {
		const swap = Math.abs(layer.rotation) === 90;
		ctx.translate(layer.w / 2, layer.h / 2);
		ctx.rotate((layer.rotation * Math.PI) / 180);
		if (swap) layer = { ...layer, w: layer.h, h: layer.w };
		ctx.translate(-layer.w / 2, -layer.h / 2);
	}
	ctx.beginPath();
	if (layer.kind === "portrait" && layer.clip === "ellipse")
		ctx.ellipse(layer.w / 2, layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
	else
		ctx.roundRect(
			0,
			0,
			layer.w,
			layer.h,
			layer.kind === "portrait" && layer.clip === "arch"
				? [layer.w / 2, layer.w / 2, 0, 0]
				: "radius" in layer
					? Math.min(layer.radius, layer.w / 2, layer.h / 2)
					: 0,
		);
	ctx.clip();
	ctx.globalAlpha = layer.opacity ?? 1;
	if (layer.kind === "text") paintDesignText(ctx, layer, data);
	else if (layer.kind === "effect") effect(ctx, layer);
	else if (layer.kind === "graphic") paintDesignGraphic(ctx, layer);
	else if (layer.kind === "shape") {
		const inset = layer.shape === "frame" ? layer.stroke / 2 : 0;
		ctx.fillStyle = layer.color;
		ctx.strokeStyle = layer.color;
		ctx.lineWidth = layer.stroke;
		ctx.beginPath();
		if (layer.shape === "ellipse")
			ctx.ellipse(layer.w / 2, layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
		else
			ctx.roundRect(
				inset,
				inset,
				layer.w - inset * 2,
				layer.h - inset * 2,
				layer.shape === "arch" ? [layer.w / 2, layer.w / 2, 0, 0] : layer.radius,
			);
		if (layer.shape === "corners") {
			const length = Math.min(28, layer.w / 4, layer.h / 4);
			for (const [x, y, dx, dy] of [
				[2, 2, 1, 1],
				[layer.w - 2, 2, -1, 1],
				[2, layer.h - 2, 1, -1],
				[layer.w - 2, layer.h - 2, -1, -1],
			]) {
				ctx.beginPath();
				ctx.moveTo(x + dx * length, y);
				ctx.lineTo(x, y);
				ctx.lineTo(x, y + dy * length);
				ctx.stroke();
			}
		} else if (layer.shape === "bevel") {
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(2, layer.h - 2);
			ctx.lineTo(2, 2);
			ctx.lineTo(layer.w - 2, 2);
			ctx.stroke();
			ctx.strokeStyle = "#777777";
			ctx.beginPath();
			ctx.moveTo(2, layer.h - 2);
			ctx.lineTo(layer.w - 2, layer.h - 2);
			ctx.lineTo(layer.w - 2, 2);
			ctx.stroke();
		} else if (layer.shape === "frame") ctx.stroke();
		else if (layer.shape === "line") {
			ctx.fillRect(0, (layer.h - layer.stroke) / 2, layer.w, layer.stroke);
		} else ctx.fill();
	} else if (layer.kind === "qr") {
		const url = new URL(data.publicUrl || "https://crafters.chat/");
		if (
			!["http:", "https:"].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.href.length > 400
		)
			throw new Error("El destino del QR no es válido.");
		const matrix = QRCode.create(url.href, { errorCorrectionLevel: "M" }).modules;
		const cell = Math.min(layer.maxCellSize ?? 20, Math.floor(layer.w / (matrix.size + 8)));
		if (cell < 2) throw new Error("El QR necesita más espacio.");
		const offset =
			layer.align === "start" ? cell * 4 : Math.floor((layer.w - cell * matrix.size) / 2);
		ctx.fillStyle = layer.background ?? "#ffffff";
		const size = layer.align === "start" ? (matrix.size + 8) * cell : layer.w;
		ctx.fillRect(0, 0, size, size);
		ctx.fillStyle = layer.foreground ?? "#111111";
		for (let r = 0; r < matrix.size; r++)
			for (let c = 0; c < matrix.size; c++)
				if (matrix.get(r, c)) ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
	} else if (layer.kind === "gradient") {
		const gradient = ctx.createLinearGradient(
			0,
			0,
			layer.direction === "vertical" ? 0 : layer.w,
			layer.direction === "horizontal" ? 0 : layer.h,
		);
		for (const stop of layer.stops) gradient.addColorStop(stop.at, stop.color);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, layer.w, layer.h);
	} else if (layer.kind === "portrait" && portrait) paintDesignPhoto(ctx, layer, portrait);
	else if (layer.kind === "image" && artwork) coverDesignImage(ctx, artwork, layer.w, layer.h);

	ctx.restore();
}
export function createDesignFace(
	data: PrismBadgeData,
	side: DesignSide,
	portrait?: ImageBitmap,
	artwork?: ImageBitmap,
	channel?: "print" | "ink",
) {
	const design = data.document;
	if (!design) throw new Error("Falta el documento del diseño.");
	const { canvas, ctx } = plate();
	if (channel !== "ink") {
		ctx.fillStyle = design[side].background;
		ctx.fillRect(0, 0, 1024, 1536);
	}
	for (const layer of design[side].layers) {
		if (layer.visible === false) continue;
		const layerChannel = layer.channel ?? (["text", "qr"].includes(layer.kind) ? "ink" : "print");
		if (!channel || channel === layerChannel) paint(ctx, layer, data, portrait, artwork);
	}
	return canvas;
}
export function createDesignPrint(
	image: ImageBitmap,
	data: PrismBadgeData,
	_appearance?: PrismAppearance,
	artwork?: ImageBitmap,
) {
	return createDesignFace(
		data,
		"front",
		image,
		artwork,
		data.document?.material.recipe ? "print" : undefined,
	);
}
export function createDesignBack(
	data: PrismBadgeData,
	_appearance?: PrismAppearance,
	portrait?: ImageBitmap,
	artwork?: ImageBitmap,
) {
	return createDesignFace(data, "back", portrait, artwork);
}
export function createDesignFoil(data?: PrismBadgeData, _appearance?: PrismAppearance) {
	return data?.document?.material.recipe
		? createDesignFace(data, "front", undefined, undefined, "ink")
		: plate().canvas;
}
export function createDesignMask(data: PrismBadgeData) {
	const { canvas, ctx } = plate();
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, 1024, 1536);
	if (!data.document) return canvas;
	ctx.globalCompositeOperation = "lighter";
	if (data.document.material.recipe) {
		for (const side of ["front", "back"] as const) {
			for (const layer of data.document[side].layers) {
				if (layer.visible === false) continue;
				const color = side === "front" ? "#ff0000" : "#00ff00";
				if (side === "back" && layer.kind === "text") {
					paint(ctx, { ...layer, color, highlights: undefined }, data);
					continue;
				}
				if (
					!(side === "front" && (layer.kind === "portrait" || layer.kind === "image")) &&
					layer.kind !== "qr" &&
					!layer.protectMaterial
				)
					continue;
				paint(
					ctx,
					{
						...layer,
						kind: "shape",
						shape: layer.kind === "portrait" ? (layer.clip ?? "rectangle") : "rectangle",
						color,
						radius: "radius" in layer ? layer.radius : 0,
						opacity: 1,
						stroke: 0,
					},
					data,
				);
			}
		}
		return canvas;
	}
	ctx.globalCompositeOperation = "lighter";
	for (const side of ["front", "back"] as const) {
		ctx.fillStyle = side === "front" ? "#ff0000" : "#00ff00";
		for (const layer of data.document[side].layers) {
			if (layer.visible === false) continue;
			if (layer.kind === "effect") continue;
			if (layer.kind === "image" && !data.artworkUrl) continue;
			if (layer.kind === "text") {
				paint(ctx, { ...layer, color: side === "front" ? "#ff0000" : "#00ff00" }, data);
			} else if (layer.kind === "shape") {
				paint(ctx, { ...layer, color: side === "front" ? "#ff0000" : "#00ff00" }, data);
			} else if (layer.kind !== "graphic" && layer.kind !== "gradient") {
				ctx.fillRect(layer.x - 1, layer.y - 1, layer.w + 2, layer.h + 2);
			}
		}
	}
	return canvas;
}
