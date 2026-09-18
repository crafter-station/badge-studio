import { describe, expect, test } from "bun:test";
import { badgeDesignSchema } from "@crafter-station/badge-studio-design/badge-design";
import { designCatalog, findDesign } from "@crafter-station/badge-studio-design/catalog";
import { agentParticipantSchema, editFromAgent, imageFileFromDataUrl } from "./design-agent";
import type { DesignEditorState } from "./design-state";

function state(source = "prism"): DesignEditorState {
	const design = findDesign(source);
	if (!design) throw new Error("Fixture missing");
	return {
		design: structuredClone(design),
		locks: { front: [], back: [], material: false },
		past: [],
	};
}

describe("browser agent edits", () => {
	test("all catalog styles stay valid and selecting one resets locks with an undo step", () => {
		const initial = state();
		initial.locks.material = true;
		for (const design of designCatalog) {
			const next = editFromAgent(initial, { action: "select", source: design.source });
			expect(next.design).toEqual(badgeDesignSchema.parse(design));
			expect(next.locks).toEqual({ front: [], back: [], material: false });
			expect(editFromAgent(next, { action: "undo" }).design).toEqual(initial.design);
		}
	});

	test("a batch changes both faces, event and physical material in one reversible step", () => {
		const initial = state();
		const next = editFromAgent(initial, {
			action: "patch",
			edits: {
				event: "Test gathering",
				front: { background: "#eeddbb" },
				back: { background: "#ccbbaa" },
				material: { roughness: 0.6 },
			},
		});
		expect(next.design.event).toBe("Test gathering");
		expect(next.design.front.background).toBe("#eeddbb");
		expect(next.design.back.background).toBe("#ccbbaa");
		expect(next.design.material.roughness).toBe(0.6);
		expect(next.past).toHaveLength(1);
		expect(editFromAgent(next, { action: "undo" }).design).toEqual(initial.design);
	});

	test("bad layout, missing QR and unsupported commands do not mutate the starting document", () => {
		const initial = state();
		const fingerprint = JSON.stringify(initial);
		const portrait = initial.design.front.layers.find((layer) => layer.kind === "portrait");
		const qr = initial.design.back.layers.find((layer) => layer.kind === "qr");
		if (!portrait || !qr) throw new Error("Fixture missing");
		for (const action of [
			{
				action: "patch",
				edits: { name: "Must not commit", front: { upsert: [{ ...portrait, x: 5000 }] } },
			},
			{ action: "patch", edits: { back: { remove: [qr.id] } } },
			{ action: "patch", edits: { front: { order: ["unknown"] } } },
			{ action: "patch", edits: { typo: "ignored?" } },
			{ action: "select", source: "missing" },
			{ action: "generate", prompt: "Call a paid model" },
		]) {
			expect(() => editFromAgent(initial, action)).toThrow();
			expect(JSON.stringify(initial)).toBe(fingerprint);
		}
	});

	test("locks reject material, replacement, layer movement and deletion but permit visibility", () => {
		const initial = state();
		const layer = initial.design.front.layers.find((item) => item.kind === "portrait");
		if (!layer) throw new Error("Fixture missing");
		initial.locks = { front: [layer.id], back: [], material: true };
		const replacement = structuredClone(initial.design);
		replacement.material.roughness = 0.9;
		for (const edit of [
			{ action: "replace", design: replacement },
			{ action: "patch", edits: { material: { roughness: 0.9 } } },
			{ action: "patch", edits: { front: { upsert: [{ ...layer, x: layer.x + 1 }] } } },
			{ action: "patch", edits: { front: { remove: [layer.id] } } },
			{
				action: "patch",
				edits: { front: { order: initial.design.front.layers.map((item) => item.id).reverse() } },
			},
		])
			expect(() => editFromAgent(initial, edit)).toThrow();
		const hidden = editFromAgent(initial, {
			action: "patch",
			edits: { front: { upsert: [{ ...layer, visible: false }] } },
		});
		expect(hidden.design.front.layers.find((item) => item.id === layer.id)?.visible).toBe(false);
		expect(hidden.locks).toEqual(initial.locks);
		expect(() =>
			editFromAgent(initial, {
				action: "locks",
				locks: { front: ["absent"], back: [], material: false },
			}),
		).toThrow();
		expect(() =>
			editFromAgent(initial, {
				action: "locks",
				locks: { front: [layer.id, layer.id], back: [], material: false },
			}),
		).toThrow();
	});

	test("validated documents can replace a layout and bounded histories retain only 12 steps", () => {
		let current = state();
		for (let index = 0; index < 40; index++) {
			current = editFromAgent(current, {
				action: "replace",
				design: { ...current.design, name: `Iteration ${index}` },
			});
			expect(current.past.length).toBeLessThanOrEqual(12);
		}
		expect(current.design.name).toBe("Iteration 39");
	});
});

test("participant inputs reject script URLs, invalid IDs, overly long fields and undeclared properties", () => {
	for (const input of [
		{ publicUrl: "javascript:alert(1)" },
		{ publicUrl: "file:///private/photo" },
		{ number: -1 },
		{ number: 2.2 },
		{ number: 1_000_000 },
		{ name: "x".repeat(81) },
		{ apiKey: "never-accepted" },
	])
		expect(agentParticipantSchema.safeParse(input).success).toBe(false);
	expect(
		agentParticipantSchema.parse({
			name: "Another participant",
			publicUrl: "https://example.com/badge",
		}).name,
	).toBe("Another participant");
});

test("image transfer only decodes bounded, declared raster bytes without fetching remote URLs", async () => {
	const image = imageFileFromDataUrl("data:image/png;base64,aGVsbG8=");
	expect(image.type).toBe("image/png");
	expect(await image.text()).toBe("hello");
	for (const value of [
		"https://example.com/image.png",
		"file:///tmp/photo.png",
		"blob:https://example.com/1",
		"data:image/svg+xml;base64,PHN2Zz4=",
		"data:text/html;base64,aGVsbG8=",
		"data:image/png;base64,!!!!",
		"data:image/png;base64,a",
		"x".repeat(5_600_001),
	])
		expect(() => imageFileFromDataUrl(value)).toThrow();
});
