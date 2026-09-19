import { expect, test } from "bun:test";
import { findDesign } from "@crafter-station/badge-studio-design/catalog";
import { IDBFactory } from "fake-indexeddb";
import { communityDigest, validateBadgeBundle } from "../../lib/community-contract";
import {
	type PreparedPublication,
	createBadgeBundle,
	publicationCheckpoint,
	requirePendingPublication,
} from "./community-client";

test("portable bundles preserve source bytes and reject oversized sources instead of compressing silently", async () => {
	const design = findDesign("noche-abierta");
	if (!design) throw new Error("Missing fixture");
	const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
	const originalFetch = globalThis.fetch;
	const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
	let source = new Blob([bytes], { type: "image/png" });
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: { location: { origin: "https://example.com" } },
	});
	globalThis.fetch = (async () => new Response(source)) as unknown as typeof fetch;
	const participant = {
		id: "test",
		name: "Test Person",
		role: "Maker",
		number: 1,
		eventName: "Test",
		publicUrl: "https://example.com",
		portraitUrl: "blob:https://example.com/source",
	};
	try {
		const bundle = await createBadgeBundle(design, participant);
		expect(bundle.snapshot.images.portrait).toBe(await communityDigest(source));
		expect(bundle.images.portrait.base64).toBe(Buffer.from(bytes).toString("base64"));
		expect((await validateBadgeBundle(bundle)).bundle).toEqual(bundle);
		source = new Blob([new Uint8Array(3_000_001)], { type: "image/png" });
		await expect(createBadgeBundle(design, participant)).rejects.toThrow("menos de 3 MB");
	} finally {
		globalThis.fetch = originalFetch;
		if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
		else Reflect.deleteProperty(globalThis, "window");
	}
});

test("publication checkpoint survives browser-store reopen with image bytes and operation identity", async () => {
	const factory = new IDBFactory();
	const value: PreparedPublication = {
		intent: {
			action: "create",
			operationId: crypto.randomUUID(),
			snapshotHash: "a".repeat(64),
			title: "Test",
			participantName: "Sample",
		},
		secret: "b".repeat(64),
		files: { portrait: new Blob(["private image"], { type: "image/webp" }) },
		createdAt: Date.now(),
		consented: true,
	};
	await publicationCheckpoint(value, factory);
	const restored = await publicationCheckpoint(undefined, factory);
	expect(restored?.intent).toEqual(value.intent);
	expect(restored?.secret).toEqual(value.secret);
	expect(await restored?.files.portrait?.text()).toBe("private image");
	await publicationCheckpoint(
		{
			...value,
			receipt: { id: crypto.randomUUID(), version: 1, state: "published", url: "/community/test" },
		},
		factory,
	);
	expect((await publicationCheckpoint(undefined, factory))?.receipt?.state).toBe("published");
	await publicationCheckpoint(null, factory);
	expect(await publicationCheckpoint(undefined, factory)).toBeUndefined();
});

test("completed publication cannot be reported as cancelled or lose its receipt", async () => {
	const factory = new IDBFactory();
	const value = {
		intent: {
			action: "create",
			operationId: crypto.randomUUID(),
			snapshotHash: "a".repeat(64),
			title: "Test",
			participantName: "Sample",
		},
		secret: "b".repeat(64),
		files: {},
		createdAt: Date.now(),
		receipt: { id: crypto.randomUUID(), version: 1, state: "published", url: "/community/test" },
	} as PreparedPublication;
	await publicationCheckpoint(value, factory);
	expect(() => requirePendingPublication(value)).toThrow("ALREADY_COMPLETED");
	expect((await publicationCheckpoint(undefined, factory))?.receipt).toEqual(value.receipt);
	expect(() => requirePendingPublication({ ...value, receipt: undefined })).not.toThrow();
});
