import type { BadgeDesign, BadgeLayer } from "../badge-design";
export type TextLayer = Extract<BadgeLayer, { kind: "text" }>;
export type PortraitLayer = Extract<BadgeLayer, { kind: "portrait" }>;
export type GraphicLayer = Extract<BadgeLayer, { kind: "graphic" }>;
export const t = (
	id: string,
	value: string,
	x: number,
	baseline: number,
	w: number,
	size: number,
	font: TextLayer["font"],
	color: string,
	extra: Partial<TextLayer> = {},
): TextLayer => ({
	id,
	kind: "text",
	binding: value.startsWith("$") ? (value.slice(1) as TextLayer["binding"]) : "none",
	text: value.startsWith("$") ? "" : value,
	x,
	y: baseline - size,
	w,
	h: Math.min(size * 1.15, 1536 - baseline + size),
	size,
	font,
	color,
	weight: ["mono", "pixel", "script"].includes(font) ? "400" : "700",
	align: "left",
	baseline: "alphabetic",
	baselineOffset: size,
	fit: "shrink",
	lineHeight: 1,
	...extra,
});
export const s = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
	shape: Extract<BadgeLayer, { kind: "shape" }>["shape"] = "rectangle",
	opacity = 1,
): Extract<BadgeLayer, { kind: "shape" }> => ({
	id,
	kind: "shape",
	x,
	y,
	w,
	h,
	color,
	shape,
	opacity,
	channel: "ink",
	radius: 0,
	stroke: shape === "corners" ? 4 : 2,
});
export const p = (
	x: number,
	y: number,
	w: number,
	h: number,
	extra: Partial<PortraitLayer> = {},
): PortraitLayer => ({
	id: "portrait",
	kind: "portrait",
	x,
	y,
	w,
	h,
	radius: 0,
	filter: "mono",
	crop: { x: 0.5, y: 0.5, zoom: 1 },
	...extra,
});
export const g = (
	id: string,
	pattern: GraphicLayer["pattern"],
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
	accent = color,
	extra: Partial<GraphicLayer> = {},
): GraphicLayer => ({
	id,
	kind: "graphic",
	pattern,
	x,
	y,
	w,
	h,
	color,
	accent,
	density: 1,
	seed: 1,
	...extra,
});
export const q = (x: number, y: number, w: number): Extract<BadgeLayer, { kind: "qr" }> => ({
	id: "qr",
	kind: "qr",
	x,
	y,
	w,
	h: w,
	align: "start",
	foreground: "#090a0b",
});
export const upper = { transform: "uppercase" as const };
export const rule = (id: string, y: number, color: string, x = 84, w = 856): BadgeLayer =>
	s(id, x, y, w, 1.5, color, "rectangle", 0.35);
export const flow = (): GraphicLayer =>
	g("flow", "chromatic-paper", 0, 0, 1024, 1536, "#f8eff3", "#f563fc");
export function design(
	source: string,
	event: string,
	description: string,
	background: string,
	front: BadgeLayer[],
	back: BadgeLayer[],
	surface: BadgeDesign["material"]["surface"] = "satin",
): BadgeDesign {
	return {
		version: 1,
		source,
		name: event,
		event,
		description,
		artPrompt: "",
		material: {
			surface,
			roughness: surface === "prism" ? 0.35 : 0.78,
			iridescence: surface === "prism" ? 0.34 : 0.02,
			speed: 0.4,
		},
		front: { background, layers: front },
		back: { background, layers: back },
	};
}
