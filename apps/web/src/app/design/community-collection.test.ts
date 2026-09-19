import { afterEach, expect, test } from "bun:test";
import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import { IDBFactory } from "fake-indexeddb";
import type { CommunityPublication } from "../../lib/community-contract";
import { BrowserDesignStore } from "./browser-design-store";
import { copyCommunityDesign, loadCommunityCollection } from "./community-collection";

const originalFetch = globalThis.fetch;
const originalDatabase = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalDatabase) Object.defineProperty(globalThis, "indexedDB", originalDatabase);
	else Reflect.deleteProperty(globalThis, "indexedDB");
});

function publication(id: string): CommunityPublication {
	return {
		id,
		version: 1,
		state: "published",
		url: `/community/${id}`,
		authorName: "Example author",
		createdAt: "2026-09-19T00:00:00.000Z",
		updatedAt: "2026-09-19T00:00:00.000Z",
		snapshot: {
			format: 1,
			design: structuredClone(designCatalog[0]),
			participant: {
				name: "Original author",
				role: "Maker",
				organization: "Example",
				number: 1,
				eventName: "Example event",
				publicUrl: "https://example.com",
				signature: { seed: 1, version: 1 },
				metadata: {
					location: "",
					bio: "",
					website: "",
					eventName: "Example event",
					roleLabel: "Maker",
					eventDate: "",
				},
			},
			images: { portrait: "a".repeat(64), artwork: null },
		},
		images: { portrait: "/api/community/media/portrait", artwork: null },
	};
}

test("the full community collection follows cursors and deduplicates page boundaries", async () => {
	const first = Array.from({ length: 24 }, (_, i) => publication(`badge-${i}`));
	const seen: string[] = [];
	const sizes: number[] = [];
	globalThis.fetch = (async (input: string | URL | Request) => {
		seen.push(String(input));
		return Response.json(
			seen.length === 1
				? { items: first, nextCursor: "next-page" }
				: { items: [first[23], publication("last-badge")], nextCursor: null },
		);
	}) as unknown as typeof fetch;
	let items: CommunityPublication[] = [];
	await loadCommunityCollection(new AbortController().signal, (page) => {
		items = page;
		sizes.push(page.length);
	});
	expect(seen).toEqual(["/api/community?limit=24", "/api/community?limit=24&cursor=next-page"]);
	expect(sizes).toEqual([24, 25]);
	expect(items.at(-1)?.id).toBe("last-badge");
});

test("collection failure retains the successful page and a repeated cursor cannot loop forever", async () => {
	let calls = 0;
	let items: CommunityPublication[] = [];
	globalThis.fetch = (async () => {
		calls++;
		return calls === 1
			? Response.json({ items: [publication("first")], nextCursor: "next" })
			: Response.json({ error: "Temporarily unavailable" }, { status: 503 });
	}) as unknown as typeof fetch;
	await expect(
		loadCommunityCollection(new AbortController().signal, (page) => {
			items = page;
		}),
	).rejects.toThrow("Temporarily unavailable");
	expect(items.map((item) => item.id)).toEqual(["first"]);
	calls = 0;
	globalThis.fetch = (async () => {
		calls++;
		return Response.json({ items: [], nextCursor: "same" });
	}) as unknown as typeof fetch;
	await expect(loadCommunityCollection(new AbortController().signal, () => {})).rejects.toThrow(
		"rest of Community",
	);
	expect(calls).toBe(2);
});

test("an aborted late collection response cannot commit stale items", async () => {
	const controller = new AbortController();
	let updates = 0;
	globalThis.fetch = (async () => {
		controller.abort();
		return Response.json({ items: [publication("stale")], nextCursor: null });
	}) as unknown as typeof fetch;
	await expect(
		loadCommunityCollection(controller.signal, () => {
			updates++;
		}),
	).rejects.toThrow();
	expect(updates).toBe(0);
});

test("remix copies only the artwork into durable local storage without mutating the original", async () => {
	const factory = new IDBFactory();
	Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: factory });
	const original = publication("with-art");
	original.images.artwork = "/api/community/media/artwork";
	original.snapshot.design.artwork = { assetId: "old-asset" };
	const source = structuredClone(original);
	const fetched: string[] = [];
	globalThis.fetch = (async (input: string | URL | Request) => {
		fetched.push(String(input));
		return new Response(new Blob(["artwork bytes"], { type: "image/png" }));
	}) as unknown as typeof fetch;
	const copy = await copyCommunityDesign(original, new AbortController().signal);
	expect(original).toEqual(source);
	expect(fetched).toEqual(["/api/community/media/artwork"]);
	expect(copy.artwork?.assetId).not.toBe("old-asset");
	expect(copy.front).toEqual(source.snapshot.design.front);
	expect(copy.back).toEqual(source.snapshot.design.back);
	expect(copy.material).toEqual(source.snapshot.design.material);
	const saved = await new BrowserDesignStore(factory).save({ design: copy });
	const reopened = new BrowserDesignStore(factory);
	expect((await reopened.get(saved.id)).design).toEqual(copy);
	expect(await (await reopened.asset(copy.artwork?.assetId ?? "")).text()).toBe("artwork bytes");
});

test("artwork failure and cancellation do not return an incomplete remix", async () => {
	const source = publication("unavailable-art");
	source.images.artwork = "/api/community/media/missing";
	globalThis.fetch = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
	await expect(copyCommunityDesign(source, new AbortController().signal)).rejects.toThrow(
		"artwork",
	);
	const controller = new AbortController();
	controller.abort();
	await expect(copyCommunityDesign(publication("plain"), controller.signal)).rejects.toThrow();
});
