import type { PrismShader } from "./prism-shader";

export type PrismField = {
	layers: {
		basis: "noise" | "cells" | "ribbons" | "rings";
		scale: number;
		stretch: number;
		angle: number;
		warp: number;
		drift: number;
		weight: number;
		blend: "add" | "multiply";
	}[];
	relief: number;
	refraction: number;
	film: number;
	coverage: number;
};

export type PrismStyle = {
	version: 1;
	name: string;
	description: string;
	surface: "prism" | "satin" | "chrome";
	finish: "crystal" | "opal" | "obsidian";
	palette: [string, string, string];
	accent: string;
	portrait: { strength: number; saturation: number; contrast: number };
	texture: {
		pattern: "none" | "grain" | "contours" | "brushed" | "grid";
		amount: number;
		scale: number;
	};
	material: { roughness: number; iridescence: number };
	field?: PrismField;
	shader?: PrismShader;
	motion: { speed: number; amplitude: number };
	heading: "sans" | "serif" | "mono";
};

export type PrismRecipe = PrismStyle & {
	seed: number;
	promptVersion:
		| "style-director-v1"
		| "material-director-v2"
		| "material-director-v3"
		| "shader-director-v1"
		| "shader-director-v2";
	model: string;
};

export const styleFonts = { sans: "Arial", serif: "Georgia", mono: "monospace" } as const;

export function styleRgb(hex: string): [number, number, number] {
	return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)) as [
		number,
		number,
		number,
	];
}

export function styleInk(colors: string[]) {
	const luminance =
		colors.reduce((total, color) => {
			const rgb = styleRgb(color).map((value) =>
				value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4,
			);
			return total + rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
		}, 0) / colors.length;
	return luminance > 0.179 ? "#17191d" : "#fffaf0";
}
