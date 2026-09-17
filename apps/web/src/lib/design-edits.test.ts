import { describe, expect, it } from "bun:test";
import { badgeDesignExamples } from "@crafter-station/badge-studio-design/badge-design-examples";
import { applyDesignEdits, normalizeGeneratedEdits } from "./design-edits";

describe("art direction edits", () => {
	it("normalizes only changed layers without touching the base direction", () => {
		const base = badgeDesignExamples[0];
		const original = structuredClone(base);
		const name = base.front.layers.find((layer) => layer.id === "name");
		if (!name) throw new Error("Missing bound name");
		const edits = normalizeGeneratedEdits({
			description: "A".repeat(200),
			front: { upsert: [{ ...name, x: -20, color: "#abc" }] },
		});
		const result = applyDesignEdits(base, edits);
		expect(result.description.length).toBe(180);
		expect(result.front.layers.find((layer) => layer.id === "name")).toMatchObject({
			x: 0,
			color: "#aabbcc",
		});
		expect(result.back).toEqual(base.back);
		expect(result.material).toEqual(base.material);
		expect(base).toEqual(original);
	});
	it("changes one piece of typography while preserving every other layer and material", () => {
		for (const source of badgeDesignExamples) {
			const name = source.front.layers.find(
				(layer) => layer.kind === "text" && layer.binding === "name",
			);
			if (!name) throw new Error("Missing bound name");
			const next = applyDesignEdits(source, { front: { upsert: [{ ...name, color: "#aaffdd" }] } });
			expect(next.material).toEqual(source.material);
			expect(next.back).toEqual(source.back);
			expect(next.front.layers.filter((layer) => layer.id !== name.id)).toEqual(
				source.front.layers.filter((layer) => layer.id !== name.id),
			);
			expect(next.front.layers.find((layer) => layer.id === name.id)).toMatchObject({
				color: "#aaffdd",
			});
		}
	});
	it("rejects missing IDs, repeated replacements, incomplete order and lost identity", () => {
		const base = badgeDesignExamples[0];
		for (const patch of [
			{ front: { remove: ["missing"] } },
			{ front: { upsert: [base.front.layers[0], base.front.layers[0]] } },
			{ front: { order: [base.front.layers[0].id] } },
			{
				front: {
					remove: base.front.layers
						.filter((layer) => layer.kind === "portrait")
						.map((layer) => layer.id),
				},
			},
		])
			expect(() => applyDesignEdits(base, patch)).toThrow();
	});
	it("does not replace a preserved physical recipe when changing only speed", () => {
		const base = structuredClone(badgeDesignExamples[0]);
		const result = applyDesignEdits(base, { material: { speed: 0.1 } });
		expect(result.material).toEqual({ ...base.material, speed: 0.1 });
		expect(base.material.speed).not.toBe(0.1);
	});
});
