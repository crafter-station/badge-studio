import {
	type PrismField,
	type PrismRecipe,
	styleRgb,
} from "@crafter-station/badge-studio-design/prism-style";
import type { PrismAppearance } from "./types";

const fract = (value: number) => value - Math.floor(value);
const hash = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;
function noise(x: number, y: number) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = fract(x);
	const fy = fract(y);
	const u = fx * fx * (3 - 2 * fx);
	const v = fy * fy * (3 - 2 * fy);
	return (
		mix(mix(hash(ix, iy), hash(ix + 1, iy), u), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v) *
			2 -
		1
	);
}

export function previewHeight(field: PrismField, seed: number, x: number, y: number) {
	const seedX = (seed % 997) / 23;
	const seedY = ((seed >>> 10) % 991) / 23;
	let height = 0;
	let weight = 0;
	for (const layer of field.layers) {
		const angle = (layer.angle * Math.PI) / 180;
		let px = (x * Math.cos(angle) - y * Math.sin(angle)) * layer.scale * layer.stretch + seedX;
		let py =
			((x * Math.sin(angle) + y * Math.cos(angle)) * layer.scale) / Math.sqrt(layer.stretch) +
			seedY;
		const warpX = noise(px * 0.62 + 3.1, py * 0.62 + 3.1);
		const warpY = noise(px * 0.62 + 17.8, py * 0.62 + 17.8);
		px += (warpX + height * 0.65) * layer.warp;
		py += (warpY - height * 0.4) * layer.warp;
		let value = noise(px, py);
		if (layer.basis === "ribbons") value = Math.sin(px * Math.PI + noise(px * 0.45, py * 0.45) * 2);
		else if (layer.basis === "rings") value = Math.cos(Math.hypot(px - seedX, py - seedY) * 4);
		else if (layer.basis === "cells") {
			let nearest = 10;
			let second = 10;
			for (let cy = -1; cy <= 1; cy++) {
				for (let cx = -1; cx <= 1; cx++) {
					const bx = Math.floor(px) + cx;
					const by = Math.floor(py) + cy;
					const distance = Math.hypot(bx + hash(bx, by) - px, by + hash(by, bx + 13) - py);
					if (distance < nearest) {
						second = nearest;
						nearest = distance;
					} else second = Math.min(second, distance);
				}
			}
			value = (second - nearest) * 1.6 - 0.5;
		}
		height =
			layer.blend === "multiply"
				? height * mix(1, value, layer.weight)
				: height + value * layer.weight;
		weight += layer.weight;
	}
	return height / Math.max(1, weight);
}

export function paintMaterialPreview(
	ctx: CanvasRenderingContext2D,
	recipe: PrismRecipe,
	face?: PrismAppearance["face"],
) {
	const { field } = recipe;
	if (!field) return;
	const width = 128;
	const height = 192;
	const values = new Float32Array((width + 1) * (height + 1));
	for (let y = 0; y <= height; y++)
		for (let x = 0; x <= width; x++)
			values[y * (width + 1) + x] = previewHeight(
				field,
				recipe.seed,
				(x / width - 0.5) * 1.49,
				(0.5 - y / height) * 2.26,
			);
	const plate = document.createElement("canvas");
	plate.width = width;
	plate.height = height;
	const plateContext = plate.getContext("2d");
	if (!plateContext) return;
	const pixels = plateContext.createImageData(width, height);
	const accent = styleRgb(recipe.accent);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * (width + 1) + x;
			const h = values[i];
			const slope = (values[i + 1] - h) * width * field.relief * 0.2;
			const shine = Math.exp(-(((slope + 0.38) / 0.3) ** 2));
			const shade = Math.min(1, Math.abs(slope) * 0.7);
			const identity = face
				? Math.exp(
						-(((x / width - face.x) / (face.radius * 1.3)) ** 4) -
							((y / height - face.y) / (face.radius * 1.5)) ** 4,
					)
				: 0;
			const offset = (y * width + x) * 4;
			for (let c = 0; c < 3; c++) {
				const film = 0.5 + 0.5 * Math.cos(h * 7 + c * 2.1);
				pixels.data[offset + c] = mix(
					shine > shade ? 245 : accent[c] * 0.28,
					film * 255,
					field.film * 0.45,
				);
			}
			pixels.data[offset + 3] =
				(shine * 0.4 + shade * 0.25) * field.coverage * (1 - identity * 0.98) * (face ? 170 : 80);
		}
	}
	plateContext.putImageData(pixels, 0, 0);
	ctx.drawImage(plate, 0, 0, 1024, 1536);
}
