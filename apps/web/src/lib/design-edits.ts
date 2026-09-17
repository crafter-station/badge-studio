import {
	type BadgeDesign,
	type DesignLocks,
	badgeDesignObjectSchema,
	badgeDesignSchema,
	badgeLayerSchema,
	preserveDesignLocks,
} from "@crafter-station/badge-studio-design/badge-design";
import { z } from "zod";
import { normalizeGeneratedDesign } from "./design-normalize";

const faceEdits = z.object({
	background: badgeDesignObjectSchema.shape.front.shape.background.optional(),
	upsert: z.array(badgeLayerSchema).max(96).optional(),
	remove: z.array(z.string()).max(96).optional(),
	order: z.array(z.string()).max(96).optional(),
});
export const designEditsSchema = z.object({
	name: badgeDesignObjectSchema.shape.name.optional(),
	description: badgeDesignObjectSchema.shape.description.optional(),
	artPrompt: badgeDesignObjectSchema.shape.artPrompt.optional(),
	material: badgeDesignObjectSchema.shape.material.partial().optional(),
	front: faceEdits.optional(),
	back: faceEdits.optional(),
});
export type DesignEdits = z.infer<typeof designEditsSchema>;

export function normalizeGeneratedEdits(value: unknown): unknown {
	if (!value || typeof value !== "object") return value;
	const input = structuredClone(value) as Record<string, unknown>;
	if (typeof input.description === "string") input.description = input.description.slice(0, 180);
	for (const side of ["front", "back"]) {
		const face = input[side];
		if (!face || typeof face !== "object") continue;
		const change = face as Record<string, unknown>;
		if (!Array.isArray(change.upsert)) continue;
		const normalized = normalizeGeneratedDesign({
			[side]: { layers: change.upsert },
		}) as Record<string, { layers: unknown[] }>;
		change.upsert = normalized[side].layers;
	}
	return input;
}

export function applyDesignEdits(
	base: BadgeDesign,
	input: unknown,
	locks?: DesignLocks,
): BadgeDesign {
	const edits = designEditsSchema.parse(input);
	const next = structuredClone(base);
	if (edits.name !== undefined) next.name = edits.name;
	if (edits.description !== undefined) next.description = edits.description;
	if (edits.artPrompt !== undefined) next.artPrompt = edits.artPrompt;
	if (edits.material) next.material = { ...next.material, ...edits.material };
	for (const side of ["front", "back"] as const) {
		const change = edits[side];
		if (!change) continue;
		const face = next[side];
		if (change.background) face.background = change.background;
		for (const id of change.remove ?? []) {
			if (!face.layers.some((layer) => layer.id === id))
				throw new Error(`No existe ${side}.${id}.`);
			face.layers = face.layers.filter((layer) => layer.id !== id);
		}
		const replacements = new Set<string>();
		for (const layer of change.upsert ?? []) {
			if (replacements.has(layer.id)) throw new Error(`Cambio repetido ${side}.${layer.id}.`);
			replacements.add(layer.id);
			const index = face.layers.findIndex((item) => item.id === layer.id);
			if (index >= 0) face.layers[index] = layer;
			else {
				const qr = face.layers.findIndex((item) => item.kind === "qr");
				face.layers.splice(qr < 0 ? face.layers.length : qr, 0, layer);
			}
		}
		if (change.order) {
			if (
				change.order.length !== face.layers.length ||
				new Set(change.order).size !== face.layers.length
			)
				throw new Error(`El orden debe incluir todas las capas de ${side} exactamente una vez.`);
			face.layers = change.order.map((id) => {
				const layer = face.layers.find((item) => item.id === id);
				if (!layer) throw new Error(`No existe ${side}.${id}.`);
				return layer;
			});
		}
	}
	return locks ? preserveDesignLocks(base, next, locks) : badgeDesignSchema.parse(next);
}
