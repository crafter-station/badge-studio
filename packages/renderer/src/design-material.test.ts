import { expect, test } from "bun:test";
import { findDesign } from "@crafter-station/badge-studio-design/catalog";
import { badgeDesignExamples } from "../../design/src/badge-design-examples";
import { recipeFixture } from "../../design/src/prism-style.fixture";
import { designAppearance } from "./design";
import { designMaterialData } from "./design-material";

test("native, generic and physical documents select distinct rendering paths", () => {
	const design = structuredClone(badgeDesignExamples[0]);
	expect(designMaterialData().mode).toEqual([0, 0, 0, 0]);
	expect(designMaterialData(design).mode).toEqual([1, 0, 0, 0]);
	design.material.recipe = recipeFixture;
	expect(designMaterialData(design).mode).toEqual([2, 0, 0, 0]);
});

test("original materials preserve the physical shader and thermal lighting independently of layout", () => {
	for (const [id, surface] of [
		["thermal", "satin"],
		["prism", "prism"],
		["chrome", "chrome"],
	]) {
		const design = findDesign(id);
		if (!design) throw new Error(`Missing original: ${id}`);
		const appearance = designAppearance(design);
		expect(appearance.surface).toBe(surface);
		expect(appearance.recipe?.field).toBeUndefined();
		expect(designMaterialData(design).mode[0]).toBe(2);
		expect(appearance.filter).toBe(id === "thermal" ? "thermal" : "original");
	}
	const thermal = structuredClone(findDesign("thermal"));
	if (!thermal) throw new Error("Missing thermal fixture");
	const portrait = thermal.front.layers.find((layer) => layer.kind === "portrait");
	if (!portrait) throw new Error("Missing portrait");
	portrait.visible = false;
	expect(designAppearance(thermal).filter).toBe("original");
});

test("hidden effects are removed from both GPU face buffers without shifting visible settings", () => {
	const design = structuredClone(badgeDesignExamples[0]);
	const effect = {
		id: "hidden-effect",
		kind: "effect" as const,
		effect: "orbits" as const,
		x: 0,
		y: 0,
		w: 1024,
		h: 1536,
		colors: ["#ff0000", "#00ff00", "#0000ff"],
		scale: 2,
		opacity: 0.6,
		visible: false,
	};
	design.front.layers.unshift(effect, { ...effect, id: "visible-effect", visible: true });
	design.back.layers.unshift(effect);
	const hidden = designMaterialData(design);
	expect(hidden.mode).toEqual([1, 1, 0, 0]);
	expect(Array.from(hidden.bytes.slice(8, 12))).toEqual([255, 0, 0, 255]);
	expect(hidden.bytes.slice(256).every((value) => value === 0)).toBe(true);
	design.front.layers[0].visible = true;
	design.back.layers[0].visible = true;
	expect(designMaterialData(design).mode).toEqual([1, 2, 1, 0]);
});
