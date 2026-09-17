import { styleFonts } from "@crafter-station/badge-studio-design/prism-style";
import { createAndesFoil, createAndesPortrait } from "./andes";
import { createBack, signatureSeal } from "./back";
import { createDesignFoil, createDesignPrint } from "./design";
import { loadDesignArtwork } from "./design-assets";
import { createEditionFoil, createEditionPortrait } from "./edition";
import { paintMaterialPreview } from "./material-preview";
import { paintRecipeTexture, recipePixels } from "./recipe";
export { createBack } from "./back";
import { filterPixels } from "./filters";
import { type PrismAppearance, type PrismBadgeData, type PrismSide, cropRectangle } from "./types";

export function createPrint(
	image: ImageBitmap,
	appearance: PrismAppearance,
	materialPreview = false,
	data?: PrismBadgeData,
	artwork?: ImageBitmap,
) {
	if (data?.document) return createDesignPrint(image, data, appearance, artwork);

	if (data?.design === "andes") return createAndesPortrait(image, data, appearance);
	if (data?.edition) return createEditionPortrait(image, data, appearance);
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1536;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("No se pudo preparar el retrato.");
	context.fillStyle = "#172942";
	context.fillRect(0, 0, 1024, 1536);
	const crop = cropRectangle(image.width, image.height, appearance.crop);
	context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, 1024, 1536);
	if (appearance.recipe || (appearance.filter && appearance.filter !== "original")) {
		const pixels = context.getImageData(0, 0, 1024, 1536);
		if (appearance.recipe) recipePixels(pixels.data, appearance.recipe);
		else filterPixels(pixels.data, appearance.filter);
		context.putImageData(pixels, 0, 0);
	}
	if (appearance.recipe) paintRecipeTexture(context, appearance.recipe, true);
	if (appearance.recipe && materialPreview)
		paintMaterialPreview(context, appearance.recipe, appearance.face);
	const thermal = appearance.filter === "thermal";
	const bottom = context.createLinearGradient(0, 1040, 0, 1536);
	bottom.addColorStop(0, thermal ? "#050d3100" : "#111c2a00");
	bottom.addColorStop(0.5, thermal ? "#050d3188" : "#111c2a88");
	bottom.addColorStop(1, thermal ? "#050d31dd" : "#111c2ade");
	context.fillStyle = bottom;
	context.fillRect(0, 1040, 1024, 496);
	if (appearance.surface && appearance.surface !== "prism") {
		context.save();
		context.globalCompositeOperation = "screen";
		context.lineWidth = 1.2;
		context.strokeStyle = thermal ? "#ce48892d" : "#97acbe25";
		for (const side of [-1, 1]) {
			for (let line = 0; line < 5; line++) {
				context.beginPath();
				for (let y = 160; y < 1300; y += 4) {
					const x =
						512 +
						side *
							(358 +
								line * 31 +
								Math.sin(y * 0.009 + line * 0.75) * 24 +
								Math.sin(y * 0.019 + line * 0.31) * 12);
					if (y === 160) context.moveTo(x, y);
					else context.lineTo(x, y);
				}
				context.stroke();
			}
		}
		context.restore();
	}
	return canvas;
}

function fit(
	context: CanvasRenderingContext2D,
	text: string,
	size: number,
	width: number,
	font = "Arial",
) {
	context.font = `500 ${size}px ${font}`;
	const measured = context.measureText(text).width;
	context.font = `500 ${Math.min(size, (size * width) / Math.max(1, measured))}px ${font}`;
}

export function nameLines(name: string) {
	const words = name.trim().toLocaleUpperCase().split(/\s+/);
	if (name.length <= 19 || words.length === 1) return [words.join(" ")];
	let split = 1;
	let difference = Number.POSITIVE_INFINITY;
	for (let index = 1; index < words.length; index++) {
		const delta = Math.abs(
			words.slice(0, index).join(" ").length - words.slice(index).join(" ").length,
		);
		if (delta < difference) {
			difference = delta;
			split = index;
		}
	}
	return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

export function createFoil(data: PrismBadgeData, appearance?: PrismAppearance) {
	if (data.document) return createDesignFoil(data, appearance);

	if (data.design === "andes") return createAndesFoil(data);
	if (data.edition) return createEditionFoil(data);
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1536;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("No se pudo preparar la tipografía.");
	const foil = context.createLinearGradient(65, 0, 960, 0);
	for (const [stop, color] of [
		[0, "#e0dcef"],
		[0.25, "#ecf1ea"],
		[0.5, "#cdddee"],
		[0.75, "#e5d5e9"],
		[1, "#d9e9ec"],
	] as const)
		foil.addColorStop(stop, color);
	const smooth = appearance?.surface && appearance.surface !== "prism";
	const thermal = appearance?.filter === "thermal";
	context.fillStyle = smooth ? "#e8eaf0" : foil;
	context.textAlign = "center";
	context.letterSpacing = "2px";
	if (!smooth) {
		fit(context, data.eventName, 25, 820);
		context.fillText(data.eventName, 512, 135);
	}
	context.save();
	context.strokeStyle = smooth ? "#d7e2ef" : "#dfdaed";
	context.globalAlpha = 0.7;
	signatureSeal(context, data.signature, 901, 214, 35);
	context.restore();
	const lines = nameLines(data.name);
	lines.forEach((line, index) => {
		fit(
			context,
			line,
			lines.length === 1 ? (smooth ? 112 : 118) : 80,
			smooth ? 850 : 860,
			appearance?.recipe ? styleFonts[appearance.recipe.heading] : "Arial",
		);
		context.fillText(line, 512, lines.length === 1 ? 1298 : 1215 + index * 92);
	});
	context.fillStyle = appearance?.recipe
		? appearance.recipe.palette[2]
		: thermal
			? "#ff704c"
			: smooth
				? "#bfcbd8"
				: foil;
	context.letterSpacing = smooth ? "15px" : "6px";
	fit(context, (data.metadata?.roleLabel || "Living Prism").toLocaleUpperCase(), 31, 850);
	context.fillText((data.metadata?.roleLabel || "Living Prism").toLocaleUpperCase(), 512, 1380);
	context.letterSpacing = "1px";
	context.fillStyle = smooth ? "#b8bdcd" : foil;
	fit(context, data.organization ?? "", smooth ? 22 : 26, 830);
	context.fillText(data.organization ?? "", 512, 1427);
	if (smooth) {
		context.globalAlpha = 0.65;
		context.textAlign = "left";
		fit(context, data.eventName, 16, 700);
		context.fillText(data.eventName, 120, 1480);
		context.strokeStyle = thermal ? "#f7647788" : "#a3b9d49e";
		context.lineWidth = 1.5;
		for (const x of [64, 960]) {
			for (const y of [90, 1450]) {
				context.beginPath();
				context.moveTo(x - 24, y);
				context.lineTo(x + 24, y);
				context.moveTo(x, y - 24);
				context.lineTo(x, y + 24);
				context.stroke();
			}
		}
	}
	context.textAlign = "right";
	fit(context, `№ ${String(data.number).padStart(3, "0")}`, 23, 240);
	context.fillText(`№ ${String(data.number).padStart(3, "0")}`, 920, 1480);
	context.fillStyle = /^#[0-9a-f]{6}$/i.test(data.accentColor ?? "")
		? (data.accentColor ?? "#cee6f0")
		: "#cee6f0";
	if (!smooth) context.fillRect(105, 1470, 66, 3);
	return canvas;
}

export async function loadPortrait(url: string, signal?: AbortSignal) {
	const response = await fetch(url, {
		signal: signal
			? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
			: AbortSignal.timeout(20_000),
	});
	if (!response.ok) throw new Error("No se pudo cargar el retrato.");
	return createImageBitmap(await response.blob());
}

export function toPng(canvas: HTMLCanvasElement, signal?: AbortSignal) {
	return new Promise<Blob>((resolve, reject) => {
		const aborted = () => reject(new DOMException("Aborted", "AbortError"));
		if (signal?.aborted) return aborted();
		signal?.addEventListener("abort", aborted, { once: true });
		try {
			canvas.toBlob((blob) => {
				signal?.removeEventListener("abort", aborted);
				if (signal?.aborted) aborted();
				else if (blob) resolve(blob);
				else reject(new Error("No se pudo exportar el badge."));
			}, "image/png");
		} catch (error) {
			signal?.removeEventListener("abort", aborted);
			reject(error);
		}
	});
}

export async function drawFallback(
	canvas: HTMLCanvasElement,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	signal?: AbortSignal,
	side: PrismSide = "front",
) {
	const image =
		side === "front" || data.document ? await loadPortrait(data.portraitUrl, signal) : undefined;
	let artwork: ImageBitmap | undefined;
	try {
		artwork = await loadDesignArtwork(data, signal);
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
		canvas.width = 1080;
		canvas.height = 1440;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("No se pudo preparar la imagen.");
		const smooth = appearance.surface && appearance.surface !== "prism";
		const chrome = appearance.surface === "chrome";
		const thermal = appearance.filter === "thermal";
		context.fillStyle =
			data.design === "andes" || data.edition
				? "#050406"
				: !smooth && appearance.finish === "obsidian"
					? "#0e0f12"
					: !smooth && appearance.finish === "opal"
						? "#ece8f0"
						: "#efeee9";
		context.fillRect(0, 0, 1080, 1440);
		context.save();
		context.shadowColor = "#15222d45";
		context.shadowBlur = 55;
		context.shadowOffsetY = 25;
		context.fillStyle = smooth ? (thermal && !chrome ? "#d65770" : "#a1aab5") : "#819dab";
		context.beginPath();
		context.roundRect(158, 112, 764, 1160, 48);
		context.fill();
		context.restore();
		context.save();
		context.beginPath();
		context.roundRect(166, 120, 748, 1144, 40);
		context.clip();
		if (image && side === "front") {
			context.drawImage(createPrint(image, appearance, true, data, artwork), 166, 120, 748, 1144);
			const glow = context.createLinearGradient(166, 120, 914, 1264);
			glow.addColorStop(0, chrome ? "#edf6ffaa" : smooth ? "#ffffff08" : "#b7e1f078");
			glow.addColorStop(0.3, chrome ? "#d2e3ff30" : "#f1e0fc08");
			glow.addColorStop(0.6, chrome ? "#08132255" : "#91b5d708");
			glow.addColorStop(0.78, chrome ? "#e9f4ff88" : "#ffffff00");
			glow.addColorStop(1, chrome ? "#8c9aad22" : "#dae5d912");
			context.save();
			if (appearance.recipe) context.globalAlpha = 1 - appearance.recipe.material.roughness * 0.8;
			context.fillStyle = glow;
			if (!data.document) context.fillRect(166, 120, 748, 1144);
			context.restore();
			if (chrome && !data.document) {
				const footer = context.createLinearGradient(0, 860, 0, 1130);
				footer.addColorStop(0, "#0a122000");
				footer.addColorStop(1, "#0a1220dd");
				context.fillStyle = footer;
				context.fillRect(166, 860, 748, 404);
			}
			context.drawImage(createFoil(data, appearance), 166, 120, 748, 1144);
		} else context.drawImage(createBack(data, appearance, image, artwork), 166, 120, 748, 1144);
		context.restore();
		if (appearance.recipe) {
			const edge = context.createLinearGradient(164, 118, 916, 1266);
			appearance.recipe.palette.forEach((color, index) => edge.addColorStop(index / 2, color));
			context.strokeStyle = edge;
			context.lineWidth = 3 + appearance.recipe.material.iridescence * 6;
			context.beginPath();
			context.roundRect(160, 114, 760, 1156, 44);
			context.stroke();
		}
		context.strokeStyle = smooth && thermal && !chrome ? "#fc7046aa" : "#e2f5fb99";
		context.lineWidth = 3;
		context.beginPath();
		context.roundRect(164, 118, 752, 1148, 44);
		context.stroke();
		context.fillStyle = smooth ? "#03060d" : "#dfe6e5";
		context.beginPath();
		context.roundRect(460, 150, 160, 15, 10);
		context.fill();
	} finally {
		image?.close();
		artwork?.close();
	}
}
