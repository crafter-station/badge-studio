import { type PrismRecipe, styleRgb } from "@crafter-station/badge-studio-design/prism-style";

export function recipePixels(pixels: Uint8ClampedArray, recipe: PrismRecipe) {
	const colors = recipe.palette.map(styleRgb);
	const { strength, saturation, contrast } = recipe.portrait;
	for (let i = 0; i < pixels.length; i += 4) {
		const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
		const point = Math.max(0, Math.min(1.99999, ((luminance / 255 - 0.5) * contrast + 0.5) * 2));
		const lower = Math.floor(point);
		const mix = point - lower;
		for (let channel = 0; channel < 3; channel++) {
			const natural =
				((luminance + (pixels[i + channel] - luminance) * saturation) / 255 - 0.5) *
					contrast *
					255 +
				127.5;
			const tint = colors[lower][channel] * (1 - mix) + colors[lower + 1][channel] * mix;
			pixels[i + channel] = natural * (1 - strength) + tint * strength;
		}
	}
}

export function paintRecipeTexture(
	ctx: CanvasRenderingContext2D,
	recipe: PrismRecipe,
	portrait = false,
) {
	const { pattern, amount, scale } = recipe.texture;
	if (pattern === "none" || !amount) return;
	let state = recipe.seed;
	const next = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
	ctx.save();
	ctx.strokeStyle = recipe.accent;
	ctx.fillStyle = recipe.accent;
	ctx.lineWidth = 1.5 * scale;
	ctx.globalAlpha = amount * (portrait ? 0.55 : 0.8);
	if (pattern === "grain") {
		for (let i = 0; i < 6500; i++) {
			const size = (0.5 + next() * 2) * scale;
			ctx.fillRect(next() * 1024, next() * 1536, size, size);
		}
	} else if (pattern === "contours") {
		for (let band = 0; band < 30; band++) {
			ctx.beginPath();
			for (let y = 0; y <= 1536; y += 8) {
				const x =
					760 +
					band * 14 * scale +
					Math.sin((y * 0.005) / scale + band * 0.12 + (recipe.seed % 19)) * 110;
				if (y) ctx.lineTo(x, y);
				else ctx.moveTo(x, y);
			}
			ctx.stroke();
		}
	} else {
		const step = (pattern === "grid" ? 48 : 5) * scale;
		ctx.beginPath();
		for (let y = 0; y < 1536; y += step) {
			ctx.moveTo(0, y);
			ctx.lineTo(1024, y - (pattern === "brushed" ? 60 : 0));
		}
		if (pattern === "grid")
			for (let x = 0; x < 1024; x += step) {
				ctx.moveTo(x, 0);
				ctx.lineTo(x, 1536);
			}
		ctx.stroke();
	}
	ctx.restore();
}
