import type { PrismAppearance } from "./types";

type Color = readonly [number, number, number];
const thermal: readonly Color[] = [
	[4, 9, 35],
	[10, 17, 69],
	[34, 16, 105],
	[111, 14, 133],
	[207, 23, 88],
	[252, 63, 23],
	[255, 142, 6],
	[255, 209, 12],
	[255, 236, 77],
];
const cyanotype: readonly Color[] = [
	[7, 22, 42],
	[15, 49, 82],
	[37, 84, 118],
	[99, 150, 171],
	[223, 233, 219],
];

function palette(value: number, colors: readonly Color[], pixels: Uint8ClampedArray, i: number) {
	const point = Math.min(colors.length - 1.00001, Math.max(0, value) * (colors.length - 1));
	const index = Math.floor(point);
	const fraction = point - index;
	for (let channel = 0; channel < 3; channel++)
		pixels[i + channel] =
			colors[index][channel] * (1 - fraction) + colors[index + 1][channel] * fraction;
}

export function filterPixels(pixels: Uint8ClampedArray, filter: PrismAppearance["filter"]) {
	if (!filter || filter === "original") return;
	const histogram = new Uint32Array(256);
	for (let i = 0; i < pixels.length; i += 4) {
		const value = Math.round(pixels[i] * 0.45 + pixels[i + 1] * 0.45 + pixels[i + 2] * 0.1);
		histogram[value]++;
	}
	const count = pixels.length / 4;
	let low = 0;
	let high = 255;
	let seen = 0;
	for (let value = 0; value < 256; value++) {
		seen += histogram[value];
		if (seen < count * 0.015) low = value;
		if (seen >= count * 0.985) {
			high = value;
			break;
		}
	}
	const spread = Math.max(64, high - low);
	for (let i = 0; i < pixels.length; i += 4) {
		const luminance = pixels[i] * 0.45 + pixels[i + 1] * 0.45 + pixels[i + 2] * 0.1;
		const value = Math.max(0, Math.min(1, (luminance - low) / spread));
		if (filter === "thermal") {
			palette(value ** 0.72, thermal, pixels, i);
		} else if (filter === "cyanotype") {
			palette(value ** 0.85, cyanotype, pixels, i);
		} else if (filter === "mono") {
			const silver = 13 + value ** 0.87 * 230;
			pixels[i] = silver * 0.96;
			pixels[i + 1] = silver * 0.99;
			pixels[i + 2] = silver * 1.03;
		} else if (filter === "vintage") {
			pixels[i] = 24 + pixels[i] * 0.74 + luminance * 0.14;
			pixels[i + 1] = 20 + pixels[i + 1] * 0.69 + luminance * 0.12;
			pixels[i + 2] = 22 + pixels[i + 2] * 0.57 + luminance * 0.09;
		}
	}
}
