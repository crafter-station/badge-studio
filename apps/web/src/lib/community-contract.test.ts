import { describe, expect, test } from "bun:test";
import { designCatalog, findDesign } from "@crafter-station/badge-studio-design/catalog";
import {
	canonicalJson,
	communityDigest,
	communitySnapshotSchema,
	publicParticipant,
} from "./community-contract";
import { demoParticipantForDesign } from "./studio-participant";

const design = findDesign("noche-abierta");
if (!design) throw new Error("Missing approved catalog design.");
const snapshot = {
	format: 1,
	design,
	participant: publicParticipant(demoParticipantForDesign(design)),
	images: { portrait: "a".repeat(64), artwork: null },
};

describe("public snapshot boundary", () => {
	test("every native catalog direction remains publishable", () => {
		for (const document of designCatalog) {
			const candidate = {
				...snapshot,
				design: document,
				participant: publicParticipant(demoParticipantForDesign(document)),
				images: { portrait: "a".repeat(64), artwork: document.artwork ? "b".repeat(64) : null },
			};
			expect(communitySnapshotSchema.safeParse(candidate).success).toBe(true);
		}
	});

	test("rejects credentials, oversized normalized URLs, and unreadable QR density", () => {
		for (const publicUrl of [
			"https://user:password@example.com/",
			`https://example.com/${"a".repeat(400)}`,
			`https://example.com/${"ñ".repeat(80)}`,
		]) {
			expect(
				communitySnapshotSchema.safeParse({
					...snapshot,
					participant: { ...snapshot.participant, publicUrl },
				}).success,
			).toBe(false);
		}
		const value = structuredClone(snapshot);
		value.participant.publicUrl = `https://example.com/${"a".repeat(320)}`;
		for (const layer of value.design.back.layers) {
			if (layer.kind === "qr") {
				layer.w = 160;
				layer.h = 160;
			}
		}
		expect(communitySnapshotSchema.safeParse(value).success).toBe(false);
	});

	test("preserves the complete native document and deliberately selected identity", () => {
		const parsed = communitySnapshotSchema.parse(snapshot);
		expect(parsed.design).toEqual(design);
		expect(parsed.participant.name).toBeTruthy();
		expect("portraitUrl" in parsed.participant).toBe(false);
	});

	test("rejects hidden required layers, missing artwork and executable QR URLs", () => {
		for (const kind of ["name", "role", "portrait", "qr"]) {
			const value = structuredClone(snapshot);
			for (const side of ["front", "back"] as const)
				for (const layer of value.design[side].layers)
					if ((layer.kind === "text" && layer.binding === kind) || layer.kind === kind)
						layer.visible = false;
			expect(communitySnapshotSchema.safeParse(value).success).toBe(false);
		}
		const artwork = structuredClone(snapshot);
		artwork.design.artwork = { assetId: crypto.randomUUID() };
		expect(communitySnapshotSchema.safeParse(artwork).success).toBe(false);
		expect(
			communitySnapshotSchema.safeParse({
				...snapshot,
				participant: { ...snapshot.participant, publicUrl: "javascript:alert(1)" },
			}).success,
		).toBe(false);
	});

	test("canonical hashes bind every nested value independently of key order", async () => {
		expect(await communityDigest(canonicalJson({ a: 1, nested: { z: 2, a: 3 } }))).toBe(
			await communityDigest(canonicalJson({ nested: { a: 3, z: 2 }, a: 1 })),
		);
		expect(await communityDigest(canonicalJson(snapshot))).not.toBe(
			await communityDigest(
				canonicalJson({ ...snapshot, images: { ...snapshot.images, portrait: "b".repeat(64) } }),
			),
		);
	});
});
