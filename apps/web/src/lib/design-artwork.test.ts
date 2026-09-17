import { describe, expect, it } from "bun:test";
import { badgeDesignExamples } from "@crafter-station/badge-studio-design/badge-design-examples";
import { attachArtwork } from "./design-artwork";
describe("decorative art composition", () => {
	it("inserts art above background effects and below identity on both faces", () => {
		const current = badgeDesignExamples[0];
		const next = attachArtwork(current, "00000000-0000-4000-8000-000000000000");
		for (const side of ["front", "back"] as const) {
			expect(next[side].layers[0]).toEqual(current[side].layers[0]);
			expect(next[side].layers[1].kind).toBe("image");
			expect(
				next[side].layers.filter(
					(l) => l.kind === "portrait" || l.kind === "qr" || l.kind === "text",
				),
			).toEqual(
				current[side].layers.filter(
					(l) => l.kind === "portrait" || l.kind === "qr" || l.kind === "text",
				),
			);
		}
		expect(current.artwork).toBeUndefined();
	});
	it("updates the asset without duplicating or moving existing art layers", () => {
		const first = attachArtwork(badgeDesignExamples[0], "00000000-0000-4000-8000-000000000000");
		const next = attachArtwork(first, "11111111-1111-4111-8111-111111111111");
		expect(next.front).toEqual(first.front);
		expect(next.back).toEqual(first.back);
		expect(next.artwork?.assetId).toBe("11111111-1111-4111-8111-111111111111");
	});
});
