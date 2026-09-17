import { describe, expect, it } from "bun:test";
import { badgeDesignSchema } from "@crafter-station/badge-studio-design/badge-design";
import { badgeDesignExamples } from "@crafter-station/badge-studio-design/badge-design-examples";
import { normalizeGeneratedDesign } from "./design-normalize";
describe("model output normalization", () => {
	it("fits overflowing geometry and expands shorthand colors without changing identity", () => {
		const source = structuredClone(badgeDesignExamples[0]);
		source.front.background = "#fff";
		const portrait = source.front.layers.find((l) => l.kind === "portrait");
		if (!portrait) throw new Error("Missing fixture portrait");
		portrait.x = 950;
		const name = source.front.layers.find((l) => l.kind === "text" && l.binding === "name");
		if (!name) throw new Error("Missing fixture name");
		if (name.kind === "text") name.size = 16;
		const fixed = badgeDesignSchema.parse(normalizeGeneratedDesign(source));
		expect(fixed.front.background).toBe("#ffffff");
		expect(fixed.front.layers.find((l) => l.id === portrait.id)?.x).toBe(1024 - portrait.w);
		expect(fixed.front.layers.find((l) => l.id === name.id)).toMatchObject({
			binding: "name",
			size: 16,
		});
		expect(source.front.background).toBe("#fff");
	});
	it("preserves valid art direction rather than simplifying its material or print geometry", () => {
		for (const design of badgeDesignExamples) {
			const normalized = normalizeGeneratedDesign(design);
			expect(normalized).toEqual(design);
			expect(badgeDesignSchema.safeParse(normalized).success).toBe(true);
		}
	});
	it("admits fine rules while still rejecting unknown kinds and nonfinite geometry", () => {
		const source = structuredClone(badgeDesignExamples[0]);
		source.front.layers.unshift({
			id: "fine-rule",
			kind: "shape",
			shape: "rectangle",
			x: 80,
			y: 460,
			w: 864,
			h: 1,
			color: "#fff",
			radius: 0,
			opacity: 1,
			stroke: 0,
		});
		expect(badgeDesignSchema.safeParse(normalizeGeneratedDesign(source)).success).toBe(true);
		source.front.layers[0].x = Number.NaN;
		expect(badgeDesignSchema.safeParse(normalizeGeneratedDesign(source)).success).toBe(false);
		expect(
			badgeDesignSchema.safeParse(
				normalizeGeneratedDesign({ front: { layers: [{ kind: "script", code: "alert(1)" }] } }),
			).success,
		).toBe(false);
	});
});
