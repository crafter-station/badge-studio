import { expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import {
	type PreparedPublication,
	publicationCheckpoint,
	requirePendingPublication,
} from "./community-client";

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
