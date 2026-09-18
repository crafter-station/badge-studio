import { describe, expect, it } from "bun:test";
import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import {
	applyParticipantIdentity,
	emptyIdentity,
	placeholderPortrait,
} from "./participant-profile";
import { resolveStudioPortrait } from "./portrait-studies";
import { demoBadgeForDesign } from "./studio-participant";

describe("one identity across the collection", () => {
	it.each(designCatalog)(
		"personalizes $source without changing art, QR or event metadata",
		(design) => {
			const original = demoBadgeForDesign(design);
			if (!original.metadata) throw new Error(`Missing metadata for ${design.source}`);
			const before = structuredClone(original);
			const identity = {
				...emptyIdentity,
				name: "Alex Rivera",
				role: "Speaker",
				organization: "My community",
				number: 42,
				started: true,
			};
			const personal = applyParticipantIdentity(original, identity, "blob:http://localhost/photo");
			expect(personal.name).toBe("Alex Rivera");
			expect(personal.role).toBe("Speaker");
			expect(personal.metadata?.roleLabel).toBe("Speaker");
			expect(personal.organization).toBe("My community");
			expect(personal.number).toBe(42);
			expect(personal.portraitUrl).toBe("blob:http://localhost/photo");
			expect(resolveStudioPortrait(personal.portraitUrl, design.source, "event")).toBe(
				"blob:http://localhost/photo",
			);
			for (const key of ["document", "eventName", "publicUrl", "artworkUrl", "signature"] as const)
				expect(personal[key]).toEqual(original[key]);
			expect(personal.metadata).toEqual({ ...original.metadata, roleLabel: "Speaker" });
			expect(original).toEqual(before);
		},
	);

	it("shows a neutral identity when starting without a photo or after removal", () => {
		for (const design of designCatalog) {
			const personal = applyParticipantIdentity(demoBadgeForDesign(design), emptyIdentity, "");
			expect(personal.portraitUrl).toBe(placeholderPortrait);
			expect(personal.name).toBe("Tu nombre");
			expect(personal.role).toBe("Participante");
			expect(personal.organization).toBe("");
			expect(resolveStudioPortrait(personal.portraitUrl, design.source, "event")).toBe(
				placeholderPortrait,
			);
		}
	});
});
