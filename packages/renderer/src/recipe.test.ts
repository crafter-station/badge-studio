import { expect, test } from "bun:test";
import { recipeFixture } from "../../design/src/prism-style.fixture";
import { recipePixels } from "./recipe";
import { reversePalette } from "./reverse-style";
import { defaultPrismAppearance } from "./types";

test("portrait color transform preserves alpha, dimensions and neutral settings", () => {
	const pixels = new Uint8ClampedArray([25, 80, 120, 211, 200, 180, 160, 0]);
	const neutral = pixels.slice();
	recipePixels(neutral, {
		...recipeFixture,
		portrait: { strength: 0, saturation: 1, contrast: 1 },
	});
	expect(neutral).toEqual(pixels);
	recipePixels(pixels, recipeFixture);
	expect(pixels.length).toBe(8);
	expect(pixels[3]).toBe(211);
	expect(pixels[7]).toBe(0);
	expect(pixels.slice(0, 3)).not.toEqual(neutral.slice(0, 3));
});

test("reverse recipe uses matching palette direction and chosen typography", () => {
	const palette = reversePalette({ ...defaultPrismAppearance, recipe: recipeFixture });
	expect(palette.headline).toBe("Georgia");
	expect(palette.colors).not.toEqual(reversePalette(defaultPrismAppearance).colors);
	expect(palette.ink).toBe("#fffaf0");
});
