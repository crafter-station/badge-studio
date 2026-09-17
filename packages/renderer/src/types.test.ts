import { describe, expect, test } from "bun:test";
import { nameLines } from "./print";
import { cropRectangle, defaultPrismAppearance, normalizeAppearance } from "./types";

describe("portrait geometry", () => {
	test("old saved badges keep prism and original defaults", () => {
		const { surface, filter, ...legacy } = defaultPrismAppearance;
		expect(normalizeAppearance(legacy)).toEqual(defaultPrismAppearance);
		expect(normalizeAppearance({ ...legacy, surface: "chrome", filter: "thermal" })).toMatchObject({
			surface: "chrome",
			filter: "thermal",
		});
	});
	test("landscape crops stay within the source image at either edge", () => {
		for (const x of [0, 0.5, 1]) {
			for (const y of [0, 0.5, 1]) {
				for (const zoom of [1, 1.5, 2.5]) {
					const crop = cropRectangle(2400, 1600, { x, y, zoom });
					expect(crop.x).toBeGreaterThanOrEqual(0);
					expect(crop.y).toBeGreaterThanOrEqual(0);
					expect(crop.x + crop.width).toBeLessThanOrEqual(2400);
					expect(crop.y + crop.height).toBeLessThanOrEqual(1600);
					expect(crop.width / crop.height).toBeCloseTo(2 / 3);
				}
			}
		}
	});
	test("NaN and out-of-range controls cannot reach GPU uniforms", () => {
		const normalized = normalizeAppearance({
			...defaultPrismAppearance,
			crop: { x: Number.NaN, y: -50, zoom: 80 },
		});
		expect(normalized.crop).toEqual({ x: 0.5, y: 0, zoom: 2.5 });
	});
	test("normalization returns a stable value without sharing mutable input coordinates", () => {
		const input = structuredClone(defaultPrismAppearance);
		const snapshot = structuredClone(input);
		const normalized = normalizeAppearance(input);
		expect(normalized).toEqual(normalizeAppearance(input));
		expect(normalized).toEqual(snapshot);
		expect(normalized).not.toBe(input);
		expect(normalized.crop).not.toBe(input.crop);
		expect(normalized.face).not.toBe(input.face);
		expect(input).toEqual(snapshot);
	});
	test("a long name preserves every word while balancing two lines", () => {
		const name = "María Alejandra Fernández de la Cruz";
		const lines = nameLines(name);
		expect(lines.length).toBe(2);
		expect(lines.join(" ")).toBe(name.toLocaleUpperCase());
	});
});

test("PNG encoding rejects cancellation instead of returning a late fallback image", async () => {
	const { toPng } = await import("./print");
	let finish: (blob: Blob | null) => void = () => {};
	const canvas = {
		toBlob: (callback: typeof finish) => {
			finish = callback;
		},
	} as HTMLCanvasElement;
	const abort = new AbortController();
	const encoding = toPng(canvas, abort.signal);
	abort.abort();
	await expect(encoding).rejects.toMatchObject({ name: "AbortError" });
	finish(new Blob(["late"]));
	await expect(toPng(canvas, abort.signal)).rejects.toMatchObject({ name: "AbortError" });
	const next = toPng(canvas);
	const png = new Blob(["current"]);
	finish(png);
	expect(await next).toBe(png);
});
