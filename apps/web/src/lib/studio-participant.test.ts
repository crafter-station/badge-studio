import { describe, expect, test } from "bun:test";
import { designCatalog, findDesign } from "@crafter-station/badge-studio-design/catalog";
import { demoPortraitUrl, resolveStudioPortrait } from "./portrait-studies";
import {
	demoBadgeForDesign,
	demoParticipantForDesign,
	participantForDesign,
} from "./studio-participant";

describe("shared gallery and editor participants", () => {
	test("every sample uses the same fictional participant", () => {
		for (const design of designCatalog) {
			const sample = demoBadgeForDesign(design);
			expect(sample.name).toBe("Alex Rivera");
			expect(sample.portraitUrl).toBe(
				resolveStudioPortrait(demoPortraitUrl, design.source, "event"),
			);
			expect(sample.organization).toBe(
				design.source === "noche-abierta" ? "ESTUDIO ABIERTO" : "Creative community",
			);
			expect(sample.document).toBe(design);
			expect(sample.publicUrl).toBe(demoParticipantForDesign(design).publicUrl);
		}
	});
	test("event demos include the prepared portraits, actual event details and QR destinations", () => {
		const expected = [
			["hackzero-winter", "alex-hackzero-winter", "https://hack0.dev/"],
			["peru-ai", "alex-peru-ai", "https://www.peru.ai-hackathon.co/"],
			["next-craft", "alex-next-craft", "https://thenextcraft.crafter.run/"],
			["vibecode", "alex-vibecode", "https://crafter.run/vibe"],
		];
		for (const [source, portrait, publicUrl] of expected) {
			const design = findDesign(source);
			if (!design) throw new Error(`Missing ${source}`);
			const badge = demoBadgeForDesign(design);
			expect(badge.portraitUrl).toBe(`/prism/portraits/${portrait}.webp`);
			expect(badge.publicUrl).toBe(publicUrl);
			expect(badge.metadata?.website).toBe(publicUrl);
			expect(badge.document).toBe(design);
			expect(badge.edition).toBeUndefined();
			expect(badge.design).toBeUndefined();
		}
		const christmas = findDesign("hackzero-winter");
		if (!christmas) throw new Error("Missing Christmas");
		expect(demoBadgeForDesign(christmas).metadata?.eventDate).toBe("Edición 2025");
		expect(demoBadgeForDesign(christmas).signature?.seed).toBe(3189940044);
		const sheShips = findDesign("she-ships");
		if (!sheShips) throw new Error("Missing She Ships");
		expect(demoBadgeForDesign(sheShips).portraitUrl).toBe(demoPortraitUrl);
		expect(demoBadgeForDesign(sheShips).metadata?.location).toBe("Bogotá, Colombia");
	});

	test("all catalog previews retain the editor's identity, event metadata and material seed", () => {
		for (const design of designCatalog) {
			const editor = demoParticipantForDesign(design);
			const preview = demoBadgeForDesign(design);
			for (const key of [
				"name",
				"role",
				"organization",
				"number",
				"eventName",
				"publicUrl",
				"signature",
				"metadata",
			] as const) {
				expect(preview[key]).toEqual(editor[key]);
			}
			expect(editor.portraitUrl).toBe(demoPortraitUrl);
		}
	});

	test("switching designs preserves uploaded photos and participant edits without mutating defaults", () => {
		const winter = findDesign("hackzero-winter");
		const nextCraft = findDesign("next-craft");
		if (!winter || !nextCraft) throw new Error("Missing event");
		const original = demoParticipantForDesign(winter);
		if (!original.metadata) throw new Error("Missing event metadata");
		const person = {
			...original,
			name: "Alex",
			organization: "Independent",
			number: 73,
			role: "speaker",
			portraitUrl: "blob:http://localhost/my-upload",
			metadata: { ...original.metadata, roleLabel: "Speaker" },
		};
		const updated = participantForDesign(person, nextCraft);
		expect(updated.name).toBe("Alex");
		expect(updated.portraitUrl).toBe(person.portraitUrl);
		expect(updated.organization).toBe("Independent");
		expect(updated.number).toBe(73);
		expect(updated.metadata?.roleLabel).toBe("Speaker");
		expect(updated.eventName).toBe(nextCraft.event);
		expect(updated.publicUrl).toBe("https://thenextcraft.crafter.run/");
		expect(demoParticipantForDesign(winter)).toEqual(original);
		const noche = findDesign("noche-abierta");
		if (!noche) throw new Error("Missing Noche Abierta");
		const remixed = participantForDesign(person, noche);
		expect(remixed.name).toBe("Alex");
		expect(remixed.role).toBe("speaker");
		expect(remixed.organization).toBe("Independent");
		expect(remixed.portraitUrl).toBe(person.portraitUrl);
		expect(remixed.publicUrl).toBe("https://badge-studio.crafter.run/");
		expect(remixed.metadata?.eventDate).toBe("24 OCT 2026");
		expect(remixed.metadata?.roleLabel).toBe("Speaker");
		expect(demoParticipantForDesign(noche).number).toBe(27);
	});
});
