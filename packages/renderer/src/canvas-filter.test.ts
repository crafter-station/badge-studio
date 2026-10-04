import { expect, test } from "bun:test";
import { canvasFilterCss, filterStackPixels, supportsCanvasFilter } from "./canvas-filter";

const pixel = (r: number, g: number, b: number, a = 255) => new Uint8ClampedArray([r, g, b, a]);

test("the css chain follows the order CSS evaluates filters and omits unset steps", () => {
	expect(canvasFilterCss({})).toBe("none");
	expect(canvasFilterCss({ blur: 4, contrast: 1.16, grayscale: 1, sepia: 0.5 })).toBe(
		"grayscale(1) sepia(0.5) contrast(1.16) blur(4px)",
	);
});

test("support is detected from the property, not from a successful assignment", () => {
	expect(supportsCanvasFilter({ filter: "none" } as CanvasRenderingContext2D)).toBe(true);
	expect(supportsCanvasFilter({} as CanvasRenderingContext2D)).toBe(false);
});

test("grayscale(1) collapses colour to luminance and saturate(0) does the same", () => {
	for (const stack of [{ grayscale: 1 }, { saturate: 0 }]) {
		const pixels = pixel(220, 40, 90, 200);
		filterStackPixels(pixels, stack);
		expect(pixels[0]).toBe(pixels[1]);
		expect(pixels[1]).toBe(pixels[2]);
		expect(pixels[0]).toBeGreaterThan(60);
		expect(pixels[0]).toBeLessThan(110);
		expect(pixels[3]).toBe(200);
	}
});

test("contrast pivots around mid grey and brightness scales every channel", () => {
	const contrast = pixel(200, 128, 60);
	filterStackPixels(contrast, { contrast: 2 });
	expect(Array.from(contrast)).toEqual([255, 128, 0, 255]);
	const brightness = pixel(100, 50, 200);
	filterStackPixels(brightness, { brightness: 0.5 });
	expect(Array.from(brightness)).toEqual([50, 25, 100, 255]);
});

test("the warm treatment leaves a sepia cast instead of neutral grey", () => {
	const pixels = pixel(120, 120, 120);
	filterStackPixels(pixels, { grayscale: 1, sepia: 0.5, contrast: 1.07 });
	expect(pixels[0]).toBeGreaterThan(pixels[1]);
	expect(pixels[1]).toBeGreaterThan(pixels[2]);
});

test("an identity stack leaves the pixels untouched", () => {
	const pixels = pixel(12, 200, 77, 9);
	filterStackPixels(pixels, { contrast: 1, saturate: 1, brightness: 1, blur: 3 });
	expect(Array.from(pixels)).toEqual([12, 200, 77, 9]);
});
