import { expect, test } from "bun:test";
import { inspectField, inspectFrameTimes } from "./shader-inspection";

function field(heights: number[]) {
	return new Float32Array(heights.flatMap((height) => [height, 0.25, -0.5, 1]));
}

test("a visible material has finite samples in all channels and enough height variation", () => {
	expect(inspectField(field([-0.25, 0, 0.25]))).toBeCloseTo(0.5);
	for (const samples of [field([0, 0]), field([0, 0.01]), new Float32Array(), new Float32Array(5)])
		expect(() => inspectField(samples)).toThrow();
	for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
		for (let channel = 0; channel < 4; channel++) {
			const samples = field([-0.5, 0.5]);
			samples[channel] = bad;
			expect(() => inspectField(samples)).toThrow("inválidos");
		}
	}
});

test("broad saturation fails admission while occasional sharp highlights remain valid", () => {
	expect(() => inspectField(field(Array.from({ length: 20 }, (_, i) => (i % 2 ? -1 : 1))))).toThrow(
		"saturado",
	);
	expect(() => inspectField(field([1, -1, 0, 0.3, 0.6]))).not.toThrow();
});

test("warm median excludes the first frame and rejects sustained excessive latency", () => {
	expect(inspectFrameTimes([100, 2, 20, 3])).toBe(3);
	expect(inspectFrameTimes([1, 30, 20, 30])).toBe(30);
	expect(() => inspectFrameTimes([0, 31, 1, 31])).toThrow("pesado");
	for (const times of [
		[1, 2],
		[1, 2, Number.NaN, 4],
		[1, 2, Number.POSITIVE_INFINITY, 4],
		[1, -1, 2, 3],
	])
		expect(() => inspectFrameTimes(times)).toThrow("medir");
});
