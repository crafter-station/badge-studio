import { z } from "zod";
import { shaderCodeIssue } from "./prism-shader";
import type { PrismRecipe, PrismStyle } from "./prism-style";

const text = (max: number) =>
	z
		.string()
		.trim()
		.min(1)
		.max(max)
		.regex(/^[^\p{Cc}\p{Cf}]+$/u);
const range = (min: number, max: number) => z.number().finite().min(min).max(max);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const prismFieldSchema = z
	.object({
		layers: z
			.array(
				z
					.object({
						basis: z.enum(["noise", "cells", "ribbons", "rings"]),
						scale: range(0.5, 6),
						stretch: range(0.3, 3),
						angle: range(-180, 180),
						warp: range(0, 2),
						drift: range(-0.5, 0.5),
						weight: range(0.1, 1),
						blend: z.enum(["add", "multiply"]),
					})
					.strict(),
			)
			.min(1)
			.max(4)
			.refine((layers) => layers[0]?.blend === "add", "Start with an additive layer."),
		relief: range(0, 1),
		refraction: range(0, 0.5),
		film: range(0, 1),
		coverage: range(0.15, 1),
	})
	.strict();

export const prismShaderSchema = z
	.object({
		version: z.literal(1),
		code: z
			.string()
			.max(4800)
			.superRefine((code, ctx) => {
				const issue = shaderCodeIssue(code);
				if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
			}),
	})
	.strict();

export const prismStyleSchema = z
	.object({
		version: z.literal(1),
		name: text(48),
		description: text(160),
		surface: z.enum(["prism", "satin", "chrome"]),
		finish: z.enum(["crystal", "opal", "obsidian"]),
		palette: z.array(color).length(3) as unknown as z.ZodType<[string, string, string]>,
		accent: color,
		portrait: z
			.object({ strength: range(0, 1), saturation: range(0, 1.5), contrast: range(0.65, 1.4) })
			.strict(),
		texture: z
			.object({
				pattern: z.enum(["none", "grain", "contours", "brushed", "grid"]),
				amount: range(0, 0.45),
				scale: range(0.25, 2),
			})
			.strict(),
		material: z.object({ roughness: range(0.12, 0.85), iridescence: range(0, 0.65) }).strict(),
		field: prismFieldSchema.optional(),
		shader: prismShaderSchema.optional(),
		motion: z.object({ speed: range(0, 1), amplitude: range(0, 0.75) }).strict(),
		heading: z.enum(["sans", "serif", "mono"]),
	})
	.strict() satisfies z.ZodType<PrismStyle>;

export const prismRecipeSchema = prismStyleSchema
	.extend({
		material: z.object({ roughness: range(0, 1), iridescence: range(0, 0.65) }).strict(),
		seed: z.number().int().min(0).max(4294967295),
		promptVersion: z.enum([
			"style-director-v1",
			"material-director-v2",
			"material-director-v3",
			"shader-director-v1",
			"shader-director-v2",
		]),
		model: text(100),
	})
	.strict()
	.refine((recipe) => !recipe.shader || Boolean(recipe.field), {
		path: ["field"],
		message: "A shader material requires a fallback field.",
	}) satisfies z.ZodType<PrismRecipe>;

export const styleRequestSchema = z
	.object({
		prompt: text(600),
		mode: z.enum(["compositor", "shader"]).optional(),
		current: prismRecipeSchema.optional(),
	})
	.strict();

export const styleOutputSchema = z
	.object({
		styles: z
			.array(prismStyleSchema.extend({ field: prismFieldSchema }))
			.min(1)
			.max(3),
	})
	.strict();

const generatedUnitControl = (bounds: z.ZodNumber) =>
	range(0, 1)
		.transform((value) => Math.min(bounds.maxValue ?? 1, Math.max(bounds.minValue ?? 0, value)))
		.pipe(bounds);
const generatedColor = z
	.string()
	.trim()
	.regex(
		/^#{0,2}[0-9a-fA-F]{6}$/,
		"Use six hexadecimal digits, e.g. #e06c9f. Convert color names to hex; no CSS names or functions.",
	)
	.transform((value) => `#${value.replace(/^#+/, "")}`)
	.pipe(color)
	.describe("A six-digit hexadecimal color with one #, e.g. #e06c9f. No color names.");

export const styleGenerationSchema = z
	.object({
		styles: z
			.array(
				prismStyleSchema.omit({ version: true, shader: true }).extend({
					field: prismFieldSchema,
					palette: z.array(generatedColor).length(3),
					accent: generatedColor,
					material: prismStyleSchema.shape.material.extend({
						roughness: generatedUnitControl(prismStyleSchema.shape.material.shape.roughness),
						iridescence: generatedUnitControl(prismStyleSchema.shape.material.shape.iridescence),
					}),
				}),
			)
			.min(1)
			.max(3),
	})
	.strict();

export const shaderGenerationSchema = z
	.object({
		style: styleGenerationSchema.shape.styles.element.extend({
			shader: prismShaderSchema.omit({ version: true }).extend({
				code: prismShaderSchema.shape.code.refine(
					(code) => !/\bnormalize\s*\(/.test(code),
					"normalize can receive a zero vector. Use v / max(length(v), 0.0001) instead.",
				),
			}),
		}),
	})
	.strict();
