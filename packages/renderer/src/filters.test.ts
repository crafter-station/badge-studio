import { expect, test } from "bun:test";
import { filterPixels } from "./filters";

const ramp = () =>
	new Uint8ClampedArray(
		Array.from({ length: 256 }, (_, value) => [value, value, value, 213]).flat(),
	);

test("thermal keeps shadows blue and moves highlights through orange to yellow without changing alpha", () => {
	const pixels = ramp();
	filterPixels(pixels, "thermal");
	expect(pixels[12 * 4 + 2]).toBeGreaterThan(pixels[12 * 4] * 3);
	expect(pixels[150 * 4]).toBeGreaterThan(240);
	expect(pixels[150 * 4 + 1]).toBeGreaterThan(pixels[150 * 4 + 2] * 2);
	expect(pixels[240 * 4]).toBeGreaterThan(245);
	expect(pixels[240 * 4 + 1]).toBeGreaterThan(220);
	for (let i = 3; i < pixels.length; i += 4) expect(pixels[i]).toBe(213);
});

test("filters are deterministic; natural preserves every source pixel", () => {
	const input = ramp();
	const original = input.slice();
	filterPixels(input, "original");
	expect(input).toEqual(original);
	const outputs = new Set<string>();
	for (const filter of ["thermal", "mono", "cyanotype", "vintage"] as const) {
		const first = original.slice();
		const second = original.slice();
		filterPixels(first, filter);
		filterPixels(second, filter);
		expect(first).toEqual(second);
		expect(first).not.toEqual(original);
		outputs.add(Buffer.from(first).toString("base64"));
	}
	expect(outputs.size).toBe(4);
});

test("a uniform dark image remains finite and does not divide by a zero exposure range", () => {
	for (const filter of ["thermal", "mono", "cyanotype", "vintage"] as const) {
		const pixels = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
		filterPixels(pixels, filter);
		expect(pixels[0] + pixels[1] + pixels[2]).toBeGreaterThan(0);
		expect(pixels.slice(0, 4)).toEqual(pixels.slice(4));
	}
});
