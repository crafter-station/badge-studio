import { describe, expect, it } from "bun:test";
import { badgeDesignExamples } from "@crafter-station/badge-studio-design/badge-design-examples";
import {
	type DesignEditorState,
	replaceDesign,
	undoDesign,
	updateDesignLayer,
} from "./design-state";

function initial(): DesignEditorState {
	return {
		design: structuredClone(badgeDesignExamples[0]),
		locks: { front: [], back: [], material: false },
		past: [],
	};
}

describe("design editor", () => {
	it("edits only the selected face and retains its background", () => {
		const state = initial();
		const next = updateDesignLayer(state, "front", "name", { x: 82 });
		expect(next.design.front.layers.find((layer) => layer.id === "name")?.x).toBe(82);
		expect(next.design.back).toEqual(state.design.back);
		expect(next.design.front.background).toBe(state.design.front.background);
	});

	it("scopes locks to a face and prevents manual edits to locked layers", () => {
		const state = initial();
		state.locks.front = ["name"];
		expect(updateDesignLayer(state, "front", "name", { x: 82 })).toBe(state);
		expect(updateDesignLayer(state, "back", "name", { x: 82 })).not.toBe(state);
	});

	it("hides protected layers independently without losing opacity, geometry or undo", () => {
		const state = initial();
		const original = state.design.front.layers.find((layer) => layer.id === "portrait");
		if (!original) throw new Error("Fixture requires portrait");
		original.opacity = 0.35;
		state.locks.front = ["portrait"];
		const hidden = updateDesignLayer(state, "front", "portrait", { visible: false });
		expect(hidden.design.front.layers.find((layer) => layer.id === "portrait")).toEqual({
			...original,
			visible: false,
		});
		expect(hidden.design.back).toEqual(state.design.back);
		expect(hidden.locks.front).toEqual(["portrait"]);
		expect(updateDesignLayer(hidden, "front", "portrait", { x: 200, visible: true })).toBe(hidden);
		const shown = updateDesignLayer(hidden, "front", "portrait", { visible: true });
		expect(shown.design.front.layers.find((layer) => layer.id === "portrait")).toMatchObject({
			visible: true,
			opacity: 0.35,
		});
		expect(undoDesign(hidden).design).toEqual(state.design);
	});

	it("rejects invalid geometry and QR obstruction without losing the last design", () => {
		const state = initial();
		state.design.back.layers.push({
			id: "occluder",
			kind: "shape",
			x: 800,
			y: 1400,
			w: 40,
			h: 40,
			shape: "rectangle",
			color: "#ffffff",
			radius: 0,
			stroke: 0,
			opacity: 1,
		});
		const qr = state.design.back.layers.find((layer) => layer.kind === "qr");
		if (!qr) throw new Error("Fixture requires QR");
		expect(updateDesignLayer(state, "front", "portrait", { x: 950 })).toBe(state);
		expect(updateDesignLayer(state, "back", "occluder", { x: qr.x, y: qr.y })).toBe(state);
		expect(updateDesignLayer(state, "back", "qr", { w: 200, h: 200 })).toBe(state);
	});

	it("resets locks for a different direction and bounds undo history", () => {
		let state = initial();
		state.locks.front = ["name"];
		state = replaceDesign(state, badgeDesignExamples[1], false);
		expect(state.locks.front).toEqual([]);
		for (let i = 0; i < 20; i++)
			state = replaceDesign(state, { ...state.design, name: `Design ${i}` });
		expect(state.past.length).toBe(12);
		expect(undoDesign(state).design.name).toBe("Design 18");
	});
});
