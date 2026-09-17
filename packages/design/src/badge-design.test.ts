import { describe, expect, it } from "bun:test";
import { badgeDesignSchema, preserveDesignLocks } from "./badge-design";
import { badgeDesignExamples } from "./badge-design-examples";

describe("badge design contract", () => {
	it("keeps v1 documents valid without new typography or physical material fields", () => {
		const legacy = structuredClone(badgeDesignExamples[0]);
		for (const face of [legacy.front, legacy.back])
			for (const layer of face.layers) {
				layer.channel = undefined;
				if (layer.kind === "text") {
					layer.baselineOffset = undefined;
					layer.fit = undefined;
				}
			}
		expect(badgeDesignSchema.parse(legacy)).toEqual(legacy);
	});
	it("rejects rotated overflow, malformed paths and transparent or low-contrast QR", () => {
		const base = badgeDesignExamples[0];
		for (const patch of [
			{ opacity: 0.9 },
			{ foreground: "#fefefe", background: "#ffffff" },
			{ foreground: "#00000080" },
			{ rotation: 90 },
		]) {
			const design = structuredClone(base);
			design.back.layers = design.back.layers.map((layer) =>
				layer.kind === "qr" ? { ...layer, ...patch } : layer,
			);
			expect(badgeDesignSchema.safeParse(design).success).toBe(false);
		}
		for (const path of ["L0 0", "M1e999 0", "M20000 0"]) {
			const design = structuredClone(base);
			design.front.layers.push({
				id: "bad-path",
				kind: "graphic",
				pattern: "path",
				path,
				x: 0,
				y: 0,
				w: 500,
				h: 500,
				color: "#000000",
				accent: "#ffffff",
				density: 1,
				seed: 1,
			});
			expect(badgeDesignSchema.safeParse(design).success).toBe(false);
		}
		const rotated = structuredClone(base);
		rotated.front.layers[0].rotation = 45;
		expect(badgeDesignSchema.safeParse(rotated).success).toBe(false);
	});
	it("accepts all editable base directions", () => {
		for (const design of badgeDesignExamples)
			expect(badgeDesignSchema.safeParse(design).success).toBe(true);
	});
	it("persists hidden layers and only counts visible layers as QR obstructions", () => {
		const design = structuredClone(badgeDesignExamples[0]);
		const qr = design.back.layers.find((layer) => layer.kind === "qr");
		if (!qr) throw new Error("Fixture requires QR");
		const cover = {
			id: "hidden-cover",
			kind: "shape" as const,
			shape: "rectangle" as const,
			x: qr.x,
			y: qr.y,
			w: qr.w,
			h: qr.h,
			color: "#ffffff",
			radius: 0,
			stroke: 0,
			opacity: 0.45,
			visible: false,
		};
		design.back.layers.push(cover);
		expect(badgeDesignSchema.parse(design).back.layers.at(-1)).toEqual(cover);
		cover.visible = true;
		expect(badgeDesignSchema.safeParse(design).success).toBe(false);
		cover.visible = false;
		cover.x = 1000;
		expect(badgeDesignSchema.safeParse(design).success).toBe(false);
	});
	it("rejects out of bounds geometry, duplicate IDs, missing identity and covered QR", () => {
		for (const change of [
			(d: (typeof badgeDesignExamples)[0]) => {
				d.front.layers[0].w = 2000;
			},
			(d: (typeof badgeDesignExamples)[0]) => {
				d.front.layers[1].id = d.front.layers[0].id;
			},
			(d: (typeof badgeDesignExamples)[0]) => {
				d.front.layers = d.front.layers.filter((l) => l.kind !== "portrait");
			},
			(d: (typeof badgeDesignExamples)[0]) => {
				d.back.layers.push({
					id: "cover",
					kind: "shape",
					shape: "rectangle",
					x: 76,
					y: 960,
					w: 360,
					h: 360,
					color: "#ffffff",
					radius: 0,
					opacity: 1,
					stroke: 1,
				});
			},
		]) {
			const d = structuredClone(badgeDesignExamples[0]);
			change(d);
			expect(badgeDesignSchema.safeParse(d).success).toBe(false);
		}
	});
	it("restores locked layers even when missing, scoped per face, and material", () => {
		const current = badgeDesignExamples[0];
		const next = structuredClone(current);
		next.front.layers = next.front.layers.filter((l) => l.id !== "portrait");
		next.back.layers = next.back.layers.map((l) => (l.id === "name" ? { ...l, x: 80 } : l));
		next.material.surface = "chrome";
		const result = preserveDesignLocks(current, next, {
			front: ["portrait"],
			back: [],
			material: true,
		});
		expect(result.front.layers.find((l) => l.id === "portrait")).toEqual(
			current.front.layers.find((l) => l.id === "portrait"),
		);
		expect(result.back.layers.find((l) => l.id === "name")?.x).toBe(80);
		expect(result.material).toEqual(current.material);
	});
});
