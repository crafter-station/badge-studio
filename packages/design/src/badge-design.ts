import { z } from "zod";
import { prismRecipeSchema } from "./prism-style-schema";

const color = z.string().regex(/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i);
const box = {
	id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
	x: z.number().min(0).max(1023),
	y: z.number().min(0).max(1535),
	w: z.number().min(1).max(1024),
	h: z.number().min(1).max(1536),
	rotation: z.number().min(-180).max(180).optional(),
	opacity: z.number().min(0).max(1).optional(),
	visible: z.boolean().optional(),
	channel: z.enum(["print", "ink"]).optional(),
	protectMaterial: z.boolean().optional(),
};
const text = z.object({
	...box,
	kind: z.literal("text"),
	text: z.string().max(160),
	binding: z.enum([
		"none",
		"name",
		"role",
		"organization",
		"number",
		"event",
		"location",
		"date",
		"bio",
		"roleOrganization",
		"website",
		"roleCode",
		"admissionRole",
		"signature",
		"template",
	]),
	color,
	font: z.enum(["sans", "serif", "mono", "display", "brand", "script", "pixel", "archive"]),
	size: z.number().min(12).max(220),
	weight: z.enum(["400", "500", "600", "700", "800", "900"]),
	align: z.enum(["left", "center", "right"]),
	tracking: z.number().min(-8).max(40).optional(),
	lineHeight: z.number().min(0.7).max(2).optional(),
	transform: z.enum(["none", "uppercase", "lowercase"]).optional(),
	segment: z.enum(["all", "first", "last"]).optional(),
	fit: z.enum(["wrap", "shrink", "spread"]).optional(),
	baseline: z.enum(["top", "alphabetic"]).optional(),
	italic: z.boolean().optional(),
	prefix: z.string().max(30).optional(),
	suffix: z.string().max(30).optional(),
	highlights: z
		.array(z.object({ text: z.string().min(1).max(40), color }))
		.max(8)
		.optional(),
	baselineOffset: z.number().min(0).max(260).optional(),
	numberDigits: z.number().int().min(1).max(8).optional(),
});
const shape = z.object({
	...box,
	kind: z.literal("shape"),
	shape: z.enum(["rectangle", "ellipse", "line", "frame", "corners", "arch", "bevel"]),
	color,
	radius: z.number().min(0).max(160),
	stroke: z.number().min(0).max(20),
	opacity: z.number().min(0).max(1),
});
const portrait = z.object({
	...box,
	kind: z.literal("portrait"),
	radius: z.number().min(0).max(400),
	filter: z.enum([
		"original",
		"mono",
		"rose",
		"blue",
		"warm",
		"thermal",
		"silver",
		"cyanotype",
		"vintage",
	]),
	crop: z
		.object({
			x: z.number().min(0).max(1),
			y: z.number().min(0).max(1),
			zoom: z.number().min(1).max(12),
		})
		.optional(),
	cropMode: z.enum(["cover", "focus"]).optional(),
	fade: z
		.object({
			x: z.number().min(0).max(0.5),
			right: z.number().min(0).max(0.5).optional(),
			top: z.number().min(0).max(0.5),
			bottom: z.number().min(0).max(0.5),
		})
		.optional(),
	tint: color.optional(),
	tintMode: z.enum(["multiply", "color"]).optional(),
	tintOpacity: z.number().min(0).max(1).optional(),
	contrast: z.number().min(0.5).max(2).optional(),
	brightness: z.number().min(0.3).max(1.8).optional(),
	blur: z.number().min(0).max(24).optional(),
	saturation: z.number().min(0).max(2).optional(),
	clip: z.enum(["rectangle", "arch", "ellipse"]).optional(),
});
const qr = z.object({
	...box,
	kind: z.literal("qr"),
	foreground: color.optional(),
	background: color.optional(),
	align: z.enum(["center", "start"]).optional(),
	maxCellSize: z.number().int().min(2).max(20).optional(),
});
const effect = z.object({
	...box,
	kind: z.literal("effect"),
	effect: z.enum(["ribbons", "contours", "orbits", "grain", "chromatic-flow"]),
	colors: z.array(color).length(3),
	scale: z.number().min(0.5).max(6),
	opacity: z.number().min(0).max(1),
});
const graphic = z.object({
	...box,
	kind: z.literal("graphic"),
	pattern: z.enum([
		"grid",
		"snow",
		"sky",
		"grain",
		"terrain",
		"seal",
		"cross",
		"window",
		"stamp",
		"scanlines",
		"path",
		"paper",
		"chromatic-paper",
		"checkerboard",
	]),
	color,
	ink: color.optional(),
	accent: color,
	density: z.number().min(0.1).max(3),
	seed: z.number().int().min(0).max(4294967295),
	path: z
		.string()
		.max(16000)
		.regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,eE+\-\s]*$/)
		.optional(),
	stroke: z.number().min(0).max(20).optional(),
	variant: z
		.enum(["plain", "technical", "editorial", "postal", "snow", "grid", "waves"])
		.optional(),
	reverse: z.boolean().optional(),
	fill: z.boolean().optional(),
});
const gradient = z.object({
	...box,
	kind: z.literal("gradient"),
	direction: z.enum(["horizontal", "vertical", "diagonal"]),
	stops: z
		.array(z.object({ at: z.number().min(0).max(1), color }))
		.min(2)
		.max(8),
});
const image = z.object({
	...box,
	kind: z.literal("image"),
	asset: z.literal("art"),
	opacity: z.number().min(0).max(1),
	radius: z.number().min(0).max(160),
});
export const badgeLayerSchema = z.discriminatedUnion("kind", [
	text,
	shape,
	portrait,
	qr,
	effect,
	image,
	graphic,
	gradient,
]);
const face = z.object({ background: color, layers: z.array(badgeLayerSchema).min(3).max(96) });
export const badgeDesignObjectSchema = z.object({
	version: z.literal(1),
	source: z.string().max(60).optional(),
	name: z.string().min(1).max(60),
	description: z.string().max(180),
	artwork: z.object({ assetId: z.string().uuid() }).optional(),
	event: z.string().min(1).max(80),
	artPrompt: z.string().max(1200),
	material: z.object({
		surface: z.enum(["satin", "prism", "chrome"]),
		roughness: z.number().min(0).max(1),
		iridescence: z.number().min(0).max(0.65),
		speed: z.number().min(0).max(1),
		recipe: prismRecipeSchema.optional(),
		effect: z.enum(["standard", "ribbons", "topographic"]).optional(),
		focus: z
			.object({
				x: z.number().min(0).max(1),
				y: z.number().min(0).max(1),
				radius: z.number().min(0.1).max(0.5),
			})
			.optional(),
	}),
	front: face,
	back: face,
});
export type BadgeDesign = z.infer<typeof badgeDesignObjectSchema>;
export type BadgeLayer = z.infer<typeof badgeLayerSchema>;
export type DesignSide = "front" | "back";

function overlaps(a: BadgeLayer, b: BadgeLayer) {
	const aa = designLayerBounds(a);
	const bb = designLayerBounds(b);
	return aa.x < bb.x + bb.w && aa.x + aa.w > bb.x && aa.y < bb.y + bb.h && aa.y + aa.h > bb.y;
}
export function designLayerBounds(layer: Pick<BadgeLayer, "x" | "y" | "w" | "h" | "rotation">) {
	const angle = ((layer.rotation ?? 0) * Math.PI) / 180;
	const swap = Math.abs(layer.rotation ?? 0) === 90;
	const width = swap ? layer.h : layer.w;
	const height = swap ? layer.w : layer.h;
	const w = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height;
	const h = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height;
	return { x: layer.x + (layer.w - w) / 2, y: layer.y + (layer.h - h) / 2, w, h };
}
function luminance(hex: string) {
	const rgb = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
	return rgb
		.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
		.reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}
export function designIssues(design: BadgeDesign) {
	const issues: string[] = [];
	for (const side of ["front", "back"] as const) {
		const layers = design[side].layers;
		const ids = new Set<string>();
		for (const [i, layer] of layers.entries()) {
			if (ids.has(layer.id)) issues.push(`${side}: ID repetido ${layer.id}`);
			ids.add(layer.id);
			const bounds = designLayerBounds(layer);
			if (
				bounds.x < -0.01 ||
				bounds.y < -0.01 ||
				bounds.x + bounds.w > 1024.01 ||
				bounds.y + bounds.h > 1536.01
			)
				issues.push(`${side}.${layer.id}: fuera del badge`);
			if (["text", "portrait", "qr"].includes(layer.kind) && bounds.y < 89.99)
				issues.push(`${side}.${layer.id}: reserva superior de 90 px`);
			if ((layer.kind === "portrait" || layer.kind === "image") && layer.channel === "ink")
				issues.push(`${side}.${layer.id}: las imágenes pertenecen a la impresión`);
			if (layer.kind === "graphic" && layer.pattern === "path") {
				const path = layer.path?.trim() ?? "";
				const numbers = path.match(/[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) ?? [];
				if (
					!/^[Mm]/.test(path) ||
					numbers.some(
						(value) => !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 16384,
					)
				)
					issues.push(`${side}.${layer.id}: trazado inválido o fuera de rango`);
			}
			if (layer.kind === "qr") {
				const minimum = side === "front" ? 128 : 280;
				if (
					layer.w < minimum ||
					layer.w !== layer.h ||
					layer.rotation ||
					(layer.opacity ?? 1) !== 1
				)
					issues.push(`${side}.${layer.id}: QR cuadrado de al menos ${minimum} px`);
				const foreground = layer.foreground ?? "#111111";
				const background = layer.background ?? "#ffffff";
				const light = Math.max(luminance(foreground), luminance(background));
				const dark = Math.min(luminance(foreground), luminance(background));
				if (
					(light + 0.05) / (dark + 0.05) < 4.5 ||
					[foreground, background].some(
						(value) => value.length > 7 && value.slice(7).toLowerCase() !== "ff",
					)
				)
					issues.push(`${side}.${layer.id}: el QR necesita colores opacos y contrastantes`);
				if (
					layer.visible !== false &&
					layers.slice(i + 1).some((l) => l.visible !== false && overlaps(layer, l))
				)
					issues.push(`${side}.${layer.id}: QR tapado por otra capa`);
			}
		}
		if (!layers.some((l) => l.kind === "text" && l.binding === "name"))
			issues.push(`${side}: falta el nombre vinculado`);
	}
	if (
		design.front.layers.filter((l) => l.kind === "portrait").length < 1 ||
		design.front.layers.filter((l) => l.kind === "portrait").length > 4
	)
		issues.push("front: debe tener un retrato");
	for (const side of ["front", "back"] as const)
		if (design[side].layers.filter((layer) => layer.kind === "effect").length > 24)
			issues.push(`${side}: máximo 24 efectos`);
	if (!design.back.layers.some((l) => l.kind === "qr")) issues.push("back: falta el QR");
	if (
		!design.back.layers.some(
			(l) =>
				l.kind === "text" &&
				(["role", "roleOrganization", "admissionRole"].includes(l.binding) ||
					(l.binding === "template" && /\{(?:role|roleOrganization|admissionRole)\}/.test(l.text))),
		)
	)
		issues.push("back: falta el rol vinculado");
	return issues;
}
export const badgeDesignSchema = badgeDesignObjectSchema.superRefine((design, context) => {
	for (const message of designIssues(design))
		context.addIssue({ code: z.ZodIssueCode.custom, message });
});
export const designLockSchema = z.object({
	front: z.array(z.string()).max(96),
	back: z.array(z.string()).max(96),
	material: z.boolean(),
});
export type DesignLocks = z.infer<typeof designLockSchema>;
export function preserveDesignLocks(
	current: BadgeDesign,
	next: BadgeDesign,
	locks: DesignLocks,
): BadgeDesign {
	const output = structuredClone(next);
	if (locks.material) output.material = structuredClone(current.material);
	for (const side of ["front", "back"] as const) {
		const locked = new Set(locks[side]);
		output[side].layers = output[side].layers.filter((l) => !locked.has(l.id));
		for (const [index, layer] of current[side].layers.entries()) {
			if (locked.has(layer.id))
				output[side].layers.splice(
					Math.min(index, output[side].layers.length),
					0,
					structuredClone(layer),
				);
		}
	}
	return badgeDesignSchema.parse(output);
}
