import { expect, test } from "bun:test";
import { styleInk } from "./prism-style";
import {
	prismFieldSchema,
	prismRecipeSchema,
	prismStyleSchema,
	styleRequestSchema,
} from "./prism-style-schema";

import { recipeFixture, styleFixture } from "./prism-style.fixture";

test("style boundary rejects executable, identity, malformed and out-of-range data", () => {
	expect(prismStyleSchema.parse(styleFixture)).toEqual(styleFixture);
	for (const value of [
		{ ...styleFixture, css: "display:none" },
		{ ...styleFixture, role: "admin" },
		{ ...styleFixture, palette: ["url(evil)", "#ffffff", "#000000"] },
		{ ...styleFixture, motion: { speed: 2, amplitude: 0.2 } },
		{ ...styleFixture, portrait: { ...styleFixture.portrait, contrast: Number.NaN } },
		{ ...styleFixture, texture: { ...styleFixture.texture, amount: 1 } },
		{ ...styleFixture, name: "x".repeat(49) },
	])
		expect(prismStyleSchema.safeParse(value).success).toBe(false);
	expect(prismRecipeSchema.safeParse({ ...recipeFixture, seed: -1 }).success).toBe(false);
	expect(styleRequestSchema.safeParse({ prompt: " " }).success).toBe(false);
	expect(styleRequestSchema.safeParse({ prompt: "x".repeat(601) }).success).toBe(false);
	expect(
		styleRequestSchema.safeParse({ prompt: "cinema", current: recipeFixture, photo: "secret" })
			.success,
	).toBe(false);
});

test("ink chooses contrasting extremes", () => {
	expect(styleInk(["#ffffff", "#eeeeee"])).toBe("#17191d");
	expect(styleInk(["#102033", "#332015"])).toBe("#fffaf0");
});

test("legacy recipes survive while procedural programs have bounded, nonempty layers", () => {
	const { field: _field, ...legacy } = recipeFixture;
	expect(prismRecipeSchema.parse(legacy)).toEqual(legacy);
	const field = styleFixture.field;
	expect(prismFieldSchema.parse(field)).toEqual(field);
	for (const invalid of [
		{ ...field, layers: [] },
		{ ...field, layers: Array.from({ length: 5 }, () => field.layers[0]) },
		{ ...field, layers: [{ ...field.layers[0], blend: "multiply" }] },
		{ ...field, layers: [{ ...field.layers[0], basis: "arbitraryWGSL" }] },
		{ ...field, layers: [{ ...field.layers[0], scale: 1000 }] },
		{ ...field, layers: [{ ...field.layers[0], warp: Number.NaN }] },
		{ ...field, relief: 1.01 },
		{ ...field, code: "loop {}" },
	])
		expect(prismFieldSchema.safeParse(invalid).success).toBe(false);
});
