/**
 * Portrait treatments rely on the canvas 2D `filter` property. WebKit only
 * shipped it in Safari 18, so on older Safari and every iOS ≤ 17 browser the
 * assignment is silently ignored and the photo renders untouched — in colour
 * while every other surface (exports, other browsers, the share image) shows
 * the intended treatment. These helpers detect support and replay the same
 * CSS filter chain on raw pixels when it is missing.
 */

export type CanvasFilterStack = {
	grayscale?: number;
	sepia?: number;
	contrast?: number;
	saturate?: number;
	brightness?: number;
	blur?: number;
};

const ORDER = ["grayscale", "sepia", "contrast", "saturate", "brightness", "blur"] as const;

export function canvasFilterCss(stack: CanvasFilterStack) {
	const parts = [];
	for (const key of ORDER) {
		const value = stack[key];
		if (value === undefined) continue;
		parts.push(key === "blur" ? `blur(${value}px)` : `${key}(${value})`);
	}
	return parts.length ? parts.join(" ") : "none";
}

export function supportsCanvasFilter(ctx: CanvasRenderingContext2D) {
	return typeof ctx.filter === "string";
}

/**
 * Applies `stack` to RGBA pixels in the order CSS evaluates it. Blur is the
 * only step left out: it needs neighbouring pixels and never changes colour.
 */
export function filterStackPixels(pixels: Uint8ClampedArray, stack: CanvasFilterStack) {
	const gray = stack.grayscale ?? 0;
	const sepia = stack.sepia ?? 0;
	const contrast = stack.contrast ?? 1;
	const saturate = stack.saturate ?? 1;
	const brightness = stack.brightness ?? 1;
	if (gray === 0 && sepia === 0 && contrast === 1 && saturate === 1 && brightness === 1) return;
	const intercept = 255 * (0.5 - contrast / 2);
	for (let i = 0; i < pixels.length; i += 4) {
		let r = pixels[i];
		let g = pixels[i + 1];
		let b = pixels[i + 2];
		if (gray > 0) {
			// Filter Effects Level 1 grayscale matrix.
			const nr = (0.2126 + 0.7874 * (1 - gray)) * r + 0.7152 * gray * g + 0.0722 * gray * b;
			const ng = 0.2126 * gray * r + (0.7152 + 0.2848 * (1 - gray)) * g + 0.0722 * gray * b;
			const nb = 0.2126 * gray * r + 0.7152 * gray * g + (0.0722 + 0.9278 * (1 - gray)) * b;
			r = nr;
			g = ng;
			b = nb;
		}
		if (sepia > 0) {
			const nr = (0.393 + 0.607 * (1 - sepia)) * r + 0.769 * sepia * g + 0.189 * sepia * b;
			const ng = 0.349 * sepia * r + (0.686 + 0.314 * (1 - sepia)) * g + 0.168 * sepia * b;
			const nb = 0.272 * sepia * r + 0.534 * sepia * g + (0.131 + 0.869 * (1 - sepia)) * b;
			r = nr;
			g = ng;
			b = nb;
		}
		if (contrast !== 1) {
			r = r * contrast + intercept;
			g = g * contrast + intercept;
			b = b * contrast + intercept;
		}
		if (saturate !== 1) {
			const nr =
				(0.213 + 0.787 * saturate) * r +
				(0.715 - 0.715 * saturate) * g +
				(0.072 - 0.072 * saturate) * b;
			const ng =
				(0.213 - 0.213 * saturate) * r +
				(0.715 + 0.285 * saturate) * g +
				(0.072 - 0.072 * saturate) * b;
			const nb =
				(0.213 - 0.213 * saturate) * r +
				(0.715 - 0.715 * saturate) * g +
				(0.072 + 0.928 * saturate) * b;
			r = nr;
			g = ng;
			b = nb;
		}
		if (brightness !== 1) {
			r *= brightness;
			g *= brightness;
			b *= brightness;
		}
		pixels[i] = r;
		pixels[i + 1] = g;
		pixels[i + 2] = b;
	}
}

/**
 * Runs `draw` with `stack` applied. Uses the native `filter` when the context
 * supports it and otherwise filters the pixels `draw` produced inside `box`.
 */
export function drawFiltered(
	ctx: CanvasRenderingContext2D,
	stack: CanvasFilterStack,
	box: { x: number; y: number; width: number; height: number },
	draw: () => void,
) {
	if (supportsCanvasFilter(ctx)) {
		ctx.filter = canvasFilterCss(stack);
		draw();
		ctx.filter = "none";
		return;
	}
	draw();
	const x = Math.max(0, Math.floor(box.x));
	const y = Math.max(0, Math.floor(box.y));
	const width = Math.min(ctx.canvas.width - x, Math.ceil(box.width));
	const height = Math.min(ctx.canvas.height - y, Math.ceil(box.height));
	if (width <= 0 || height <= 0) return;
	const pixels = ctx.getImageData(x, y, width, height);
	filterStackPixels(pixels.data, stack);
	ctx.putImageData(pixels, x, y);
}
