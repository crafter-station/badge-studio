import {
	type BadgeDesign,
	badgeDesignSchema,
	designLockSchema,
} from "@crafter-station/badge-studio-design/badge-design";
import { findDesign } from "@crafter-station/badge-studio-design/catalog";
import { z } from "zod";
import { applyDesignEdits, designEditsSchema } from "../../lib/design-edits";
import { type DesignEditorState, replaceDesign, undoDesign } from "./design-state";

export const agentEditSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("patch"), edits: designEditsSchema.strict() }).strict(),
	z.object({ action: z.literal("replace"), design: badgeDesignSchema }).strict(),
	z.object({ action: z.literal("select"), source: z.string().min(1).max(60) }).strict(),
	z.object({ action: z.literal("locks"), locks: designLockSchema.strict() }).strict(),
	z.object({ action: z.literal("undo") }).strict(),
]);

export const agentParticipantSchema = z
	.object({
		name: z.string().max(80).optional(),
		role: z.string().max(100).optional(),
		organization: z.string().max(100).optional(),
		number: z.number().int().min(1).max(999999).optional(),
		publicUrl: z
			.string()
			.max(2048)
			.url()
			.refine((value) => ["https:", "http:"].includes(new URL(value).protocol))
			.optional(),
		metadata: z
			.object({
				roleLabel: z.string().max(100).optional(),
				eventName: z.string().max(80).optional(),
				eventDate: z.string().max(100).optional(),
				location: z.string().max(100).optional(),
				website: z.string().max(200).optional(),
				bio: z.string().max(600).optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

function canonical(value: unknown) {
	return JSON.stringify(value, (_, item) =>
		item && typeof item === "object" && !Array.isArray(item)
			? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
			: item,
	);
}

function assertLocks(state: DesignEditorState, next: BadgeDesign) {
	if (state.locks.material && canonical(state.design.material) !== canonical(next.material))
		throw new Error("Material is locked. Unlock it explicitly before changing it.");
	for (const side of ["front", "back"] as const) {
		for (const id of state.locks[side]) {
			const index = state.design[side].layers.findIndex((layer) => layer.id === id);
			const layer = next[side].layers[index];
			const original = state.design[side].layers[index];
			const below = new Set(state.design[side].layers.slice(0, index).map((item) => item.id));
			if (
				!layer ||
				layer.id !== id ||
				next[side].layers.slice(0, index).some((item) => !below.has(item.id)) ||
				canonical({ ...original, visible: true }) !== canonical({ ...layer, visible: true })
			)
				throw new Error(
					`${side}.${id} is locked. Unlock it explicitly before editing or moving it.`,
				);
		}
	}
}

export function editFromAgent(state: DesignEditorState, input: unknown): DesignEditorState {
	const edit = agentEditSchema.parse(input);
	if (edit.action === "undo") {
		if (!state.past.length) throw new Error("There is no document edit to undo.");
		return undoDesign(state);
	}
	if (edit.action === "locks") {
		for (const side of ["front", "back"] as const) {
			if (
				new Set(edit.locks[side]).size !== edit.locks[side].length ||
				edit.locks[side].some((id) => !state.design[side].layers.some((layer) => layer.id === id))
			)
				throw new Error(`Locks must contain unique, existing ${side} layer IDs.`);
		}
		return { ...state, locks: edit.locks };
	}
	if (edit.action === "select") {
		const design = findDesign(edit.source);
		if (!design) throw new Error(`Unknown style: ${edit.source}. Inspect the catalog for IDs.`);
		return replaceDesign(state, design, false);
	}
	const next = edit.action === "replace" ? edit.design : applyDesignEdits(state.design, edit.edits);
	assertLocks(state, next);
	return replaceDesign(state, next);
}

export function imageFileFromDataUrl(value: string) {
	if (value.length > 5_600_000) throw new Error("Image must be smaller than 4 MB.");
	const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
	if (!match)
		throw new Error("Provide a base64 PNG, JPEG or WebP data URL. Remote URLs are not accepted.");
	let bytes: Uint8Array<ArrayBuffer>;
	try {
		bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
	} catch {
		throw new Error("The image is not valid base64.");
	}
	if (bytes.length > 4_000_000) throw new Error("Image must be smaller than 4 MB.");
	return new File([bytes], `agent.${match[1].split("/")[1]}`, { type: match[1] });
}
