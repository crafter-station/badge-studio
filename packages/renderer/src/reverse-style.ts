import { styleFonts, styleInk, styleRgb } from "@crafter-station/badge-studio-design/prism-style";
import { paintMaterialPreview } from "./material-preview";
import { paintRecipeTexture } from "./recipe";
import { materialSignature } from "./signature";
import type { PrismAppearance, PrismSignature } from "./types";

export function reversePalette(appearance: PrismAppearance) {
	const filter = appearance.filter ?? "original";
	if (appearance.recipe) {
		const recipe = appearance.recipe;
		const light = styleInk([recipe.palette[1]]) === "#17191d";
		const base = light ? 244 : 18;
		const colors = recipe.palette.map(
			(color) =>
				`#${styleRgb(color)
					.map((value) =>
						Math.round(base * 0.82 + value * 0.18)
							.toString(16)
							.padStart(2, "0"),
					)
					.join("")}`,
		);
		const ink = styleInk(colors);
		return { filter, colors, ink, muted: ink, accent: ink, headline: styleFonts[recipe.heading] };
	}
	switch (filter) {
		case "thermal":
			return {
				filter,
				colors: ["#101945", "#171431", "#25102e"],
				ink: "#fff0dd",
				muted: "#c5b8d8",
				accent: "#ff8050",
				headline: "Arial",
			};
		case "mono":
			return {
				filter,
				colors: ["#e7edf2", "#b5c1cb", "#dce4e9"],
				ink: "#172432",
				muted: "#465462",
				accent: "#223e56",
				headline: "Arial",
			};
		case "cyanotype":
			return {
				filter,
				colors: ["#174472", "#12365f", "#092849"],
				ink: "#f0f3dc",
				muted: "#afcfdd",
				accent: "#d2e4d4",
				headline: "monospace",
			};
		case "vintage":
			return {
				filter,
				colors: ["#e7d6b6", "#f0e3c8", "#c9b18b"],
				ink: "#392b20",
				muted: "#665443",
				accent: "#8f4030",
				headline: "Georgia",
			};
		default:
			return appearance.surface === "prism"
				? {
						filter,
						colors: ["#e0e5ed", "#f2ede6", "#cecfe0"],
						ink: "#282637",
						muted: "#5c596f",
						accent: "#726079",
						headline: "Arial",
					}
				: {
						filter,
						colors: ["#f5efe4", "#eae6df", "#d3d7da"],
						ink: "#292e32",
						muted: "#62696e",
						accent: "#506c70",
						headline: "Arial",
					};
	}
}

export function paintReverseSurface(
	ctx: CanvasRenderingContext2D,
	appearance: PrismAppearance,
	identity?: PrismSignature,
) {
	const palette = reversePalette(appearance);
	const { values, seed } = materialSignature(identity);
	const gradient = ctx.createLinearGradient(0, 0, 1024, 1536);
	palette.colors.forEach((color, index) => gradient.addColorStop(index / 2, color));
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 1024, 1536);
	if (appearance.recipe) {
		paintRecipeTexture(ctx, appearance.recipe);
		paintMaterialPreview(ctx, appearance.recipe);
		return palette;
	}
	ctx.save();
	if (palette.filter === "thermal") {
		for (const [x, y, radius] of [
			[970, 520, 540],
			[40, 1450, 400],
		]) {
			const heat = ctx.createRadialGradient(x, y, 0, x, y, radius);
			heat.addColorStop(0, "#ffc42baa");
			heat.addColorStop(0.24, "#f94e3499");
			heat.addColorStop(0.53, "#a0216055");
			heat.addColorStop(1, "#35196600");
			ctx.fillStyle = heat;
			ctx.fillRect(0, 0, 1024, 1536);
		}
		ctx.strokeStyle = "#ff774c";
		ctx.globalAlpha = 0.23;
		for (let band = 0; band < 28; band++) {
			ctx.beginPath();
			for (let y = 0; y <= 1536; y += 8) {
				const x = 825 + band * 12 + Math.sin(y * 0.008 + band * 0.11 + values[2] * 4) * 100;
				if (!y) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}
	} else if (palette.filter === "mono") {
		const sheen = ctx.createLinearGradient(0, 0, 1024, 430);
		for (const [stop, color] of [
			[0, "#ffffff00"],
			[0.3, "#ffffff99"],
			[0.4, "#effaff00"],
			[0.7, "#354b5c33"],
			[0.88, "#ffffffaa"],
			[1, "#ffffff00"],
		] as const)
			sheen.addColorStop(stop, color);
		ctx.fillStyle = sheen;
		ctx.fillRect(0, 0, 1024, 1536);
		ctx.strokeStyle = "#2e4559";
		ctx.globalAlpha = 0.07;
		for (let y = 0; y < 1536; y += 5) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(1024, y - 50);
			ctx.stroke();
		}
	} else if (palette.filter === "cyanotype") {
		ctx.strokeStyle = "#b8dce6";
		ctx.globalAlpha = 0.07;
		for (let x = 48; x < 1024; x += 40) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, 1536);
			ctx.stroke();
		}
		for (let y = 0; y < 1536; y += 40) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(1024, y);
			ctx.stroke();
		}
		ctx.globalAlpha = 0.45;
		for (const [x, y] of [
			[64, 184],
			[960, 184],
			[64, 1388],
			[960, 1388],
		]) {
			ctx.beginPath();
			ctx.moveTo(x - 12, y);
			ctx.lineTo(x + 12, y);
			ctx.moveTo(x, y - 12);
			ctx.lineTo(x, y + 12);
			ctx.stroke();
		}
		ctx.setLineDash([8, 12]);
		ctx.strokeRect(64, 184, 896, 1204);
	} else if (palette.filter === "vintage") {
		let state = seed;
		const next = () => {
			state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
			return state / 4294967296;
		};
		ctx.fillStyle = "#61472f";
		for (let index = 0; index < 4500; index++) {
			ctx.globalAlpha = 0.03 + next() * 0.06;
			ctx.fillRect(next() * 1024, next() * 1536, 0.6 + next() * 2.2, 0.5 + next());
		}
		ctx.globalAlpha = 0.28;
		ctx.strokeStyle = "#705031";
		ctx.strokeRect(62, 184, 900, 1202);
		ctx.strokeRect(69, 191, 886, 1188);
	} else {
		ctx.strokeStyle = palette.accent;
		ctx.globalAlpha = 0.17;
		for (let band = 0; band < 20; band++) {
			ctx.beginPath();
			for (let y = 0; y <= 1536; y += 8) {
				const x = 830 + band * 17 + Math.sin(y * 0.006 + band * 0.12 + values[2] * 5) * 65;
				if (!y) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}
	}
	ctx.restore();
	return palette;
}
