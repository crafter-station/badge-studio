import { describe, expect, it } from "bun:test";
import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import { IDBFactory } from "fake-indexeddb";
import { BrowserDesignStore } from "./browser-design-store";

const design = designCatalog.find((item) => item.source === "gtm");

describe("public studio browser storage", () => {
	it("persists a validated design across store instances and keeps the latest version", async () => {
		const factory = new IDBFactory();
		const store = new BrowserDesignStore(factory);
		const entry = await store.save({ design });
		expect(entry.version).toBe(1);
		const reopened = new BrowserDesignStore(factory);
		expect(await reopened.get(entry.id)).toEqual(entry);
		const updated = await reopened.save({
			design: { ...design, name: "My launch badge" },
			designId: entry.id,
			expectedVersion: 1,
		});
		expect(updated.version).toBe(2);
		expect((await store.list()).map((item) => item.design.name)).toEqual(["My launch badge"]);
	});

	it("lets only one concurrent edit win and preserves it after a stale save", async () => {
		const store = new BrowserDesignStore(new IDBFactory());
		const first = await store.save({ design });
		const results = await Promise.allSettled(
			["Left tab", "Right tab"].map((name) =>
				store.save({
					design: { ...design, name },
					designId: first.id,
					expectedVersion: 1,
				}),
			),
		);
		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
		expect((await store.get(first.id)).version).toBe(2);
	});

	it("retains uploaded artwork bytes and rejects missing artwork without saving", async () => {
		const factory = new IDBFactory();
		const store = new BrowserDesignStore(factory);
		const id = await store.putAsset(new Blob(["test image bytes"], { type: "image/png" }));
		const entry = await store.save({ design: { ...design, artwork: { assetId: id } } });
		const reopened = new BrowserDesignStore(factory);
		expect(await (await reopened.asset(id)).text()).toBe("test image bytes");
		expect((await reopened.get(entry.id)).design.artwork?.assetId).toBe(id);
		await expect(
			store.save({ design: { ...design, artwork: { assetId: crypto.randomUUID() } } }),
		).rejects.toThrow("Falta la ilustración");
		expect(await store.list()).toHaveLength(1);
	});

	it("accepts built-in illustrations without uploading a duplicate", async () => {
		const store = new BrowserDesignStore(new IDBFactory());
		const illustrated = designCatalog.find((item) => item.source === "herbario-azul");
		const entry = await store.save({ design: illustrated });
		expect(entry.design.artwork).toEqual(illustrated?.artwork);
	});

	it.each([
		"71d4488f-4cb9-4867-ba52-3abe520284c6",
		"314f02d1-316d-4e17-b51a-e3f448555fca",
		"743a479e-26b2-47a6-a2c5-2ed0ac00b668",
	])(
		"keeps saved first-edition artwork available after redesigning the catalog: %s",
		async (assetId) => {
			const factory = new IDBFactory();
			const entry = await new BrowserDesignStore(factory).save({
				design: { ...design, artwork: { assetId } },
			});
			const reopened = new BrowserDesignStore(factory);
			const restored = await reopened.get(entry.id);
			expect(restored.design.artwork?.assetId).toBe(assetId);
			const next = await reopened.save({
				design: restored.design,
				designId: restored.id,
				expectedVersion: restored.version,
			});
			expect(next.version).toBe(2);
			expect(next.design.artwork?.assetId).toBe(assetId);
		},
	);

	it("rejects invalid documents, unknown IDs and invalid images without changing storage", async () => {
		const store = new BrowserDesignStore(new IDBFactory());
		for (const value of [null, {}, { design: {} }, { design, designId: "bad-id" }])
			await expect(store.save(value)).rejects.toThrow();
		await expect(store.get(crypto.randomUUID())).rejects.toThrow("No encontramos");
		await expect(
			store.save({ design, designId: crypto.randomUUID(), expectedVersion: 1 }),
		).rejects.toThrow("No encontramos");
		await expect(store.putAsset(new Blob(["bad"], { type: "text/html" }))).rejects.toThrow("PNG");
		await expect(store.putAsset(new Blob([], { type: "image/png" }))).rejects.toThrow("6 MB");
		await expect(
			store.putAsset(new Blob([new Uint8Array(6_000_001)], { type: "image/png" })),
		).rejects.toThrow("6 MB");
		expect(await store.list()).toEqual([]);
	});

	it("does not commit an operation that was already cancelled", async () => {
		const store = new BrowserDesignStore(new IDBFactory());
		const controller = new AbortController();
		controller.abort();
		await expect(store.save({ design }, controller.signal)).rejects.toThrow();
		expect(await store.list()).toEqual([]);
	});
});
