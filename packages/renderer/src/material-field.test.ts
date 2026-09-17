import { expect, test } from "bun:test";
import type { PrismField } from "@crafter-station/badge-studio-design/prism-style";
import { styleFixture } from "../../design/src/prism-style.fixture";
import { fieldCoating, fieldUniforms } from "./material-field";
import { previewHeight } from "./material-preview";

test("field uniforms encode topology and clear every unused layer", () => {
	const encoded = fieldUniforms({
		...styleFixture.field,
		layers: [
			styleFixture.field.layers[0],
			{
				...styleFixture.field.layers[0],
				basis: "cells",
				angle: 90,
				blend: "multiply",
				drift: -0.2,
			},
		],
	});
	expect(encoded.layer1).toEqual([1, 2, 1, Math.PI / 2]);
	expect(encoded.flow1).toEqual([1, -0.2, 1, 1]);
	expect(encoded.flow2[2]).toBe(0);
	expect(fieldUniforms().flow0[2]).toBe(0);
	expect(fieldCoating()).toEqual([0, 0, 0, 0]);
});

test("static approximation responds to topology, seed and composition without a palette", () => {
	function sample(field: PrismField, seed = 123) {
		return Array.from({ length: 100 }, (_, i) =>
			previewHeight(field, seed, ((i % 10) - 5) / 5, (Math.floor(i / 10) - 5) / 5),
		);
	}
	const field = styleFixture.field;
	const baseline = sample(field);
	expect(sample(field)).toEqual(baseline);
	expect(sample(field, 321)).not.toEqual(baseline);
	for (const basis of ["cells", "rings", "ribbons"] as const)
		expect(sample({ ...field, layers: [{ ...field.layers[0], basis }] })).not.toEqual(baseline);
	const second = { ...field.layers[0], basis: "ribbons" as const, weight: 0.4 };
	const composed = sample({ ...field, layers: [field.layers[0], second] });
	expect(composed).not.toEqual(baseline);
	expect(composed.every(Number.isFinite)).toBe(true);
	expect(
		sample({ ...field, layers: [field.layers[0], { ...second, blend: "multiply" }] }),
	).not.toEqual(composed);
});
