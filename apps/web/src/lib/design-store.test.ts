import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { badgeDesignExamples } from "@crafter-station/badge-studio-design/badge-design-examples";
import { DesignStore } from "./design-store";
const folders: string[] = [];
async function store() {
	const path = await mkdtemp(join(tmpdir(), "badge-design-test-"));
	folders.push(path);
	return { path, store: new DesignStore(path) };
}
afterEach(async () => {
	await Promise.all(folders.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
const owner = { ownerId: "alice", eventId: "event-one" };
describe("design storage", () => {
	it("persists versions across store instances and rejects stale revisions", async () => {
		const { path, store: s } = await store();
		const first = await s.save(owner, badgeDesignExamples[0]);
		const next = await s.save(owner, { ...first.design, name: "Changed" }, first.id, 1);
		expect(next.version).toBe(2);
		expect((await new DesignStore(path).get(owner, first.id)).design.name).toBe("Changed");
		await expect(s.save(owner, first.design, first.id, 1)).rejects.toMatchObject({ status: 409 });
		expect(await s.list(owner)).toHaveLength(1);
	});
	it("isolates designs and image bytes by BOTH owner and event", async () => {
		const { store: s } = await store();
		const design = await s.save(owner, badgeDesignExamples[0]);
		const asset = await s.putAsset(owner, new Uint8Array([1, 2, 3]));
		for (const outsider of [
			{ ...owner, ownerId: "bob" },
			{ ...owner, eventId: "other-event" },
		]) {
			expect(await s.list(outsider)).toHaveLength(0);
			await expect(s.get(outsider, design.id)).rejects.toMatchObject({ status: 404 });
			await expect(s.asset(outsider, asset)).rejects.toMatchObject({ status: 404 });
			await expect(
				s.save(outsider, { ...design.design, artwork: { assetId: asset } }),
			).rejects.toMatchObject({ status: 404 });
		}
		expect((await s.asset(owner, asset)).length).toBe(3);
	});
	it("allows catalog artwork without exposing another participant's private assets", async () => {
		const { path, store: original } = await store();
		const publicId = "3e4a7c0f-4d5f-4e1a-8a37-b0e8e6578446";
		const privateId = await original.putAsset(owner, new Uint8Array([9, 8, 7]));
		const s = new DesignStore(path, async (id) =>
			id === publicId ? Buffer.from([1, 2, 3]) : undefined,
		);
		const outsider = { ownerId: "bob", eventId: "different-event" };
		const saved = await s.save(outsider, {
			...badgeDesignExamples[0],
			artwork: { assetId: publicId },
		});
		expect(saved.design.artwork?.assetId).toBe(publicId);
		expect(await s.asset(outsider, publicId)).toEqual(Buffer.from([1, 2, 3]));
		await expect(s.asset(outsider, privateId)).rejects.toMatchObject({ status: 404 });
		await expect(
			s.save(outsider, { ...saved.design, artwork: { assetId: privateId } }),
		).rejects.toMatchObject({ status: 404 });
		await expect(s.asset(outsider, "../escape")).rejects.toMatchObject({ status: 400 });
		expect(await s.list(outsider)).toHaveLength(1);
	});
	it("prevents two writers from overwriting the same revision and removes temporary files", async () => {
		const { path, store: s } = await store();
		const first = await s.save(owner, badgeDesignExamples[0]);
		const results = await Promise.allSettled([
			s.save(owner, { ...first.design, name: "A" }, first.id, 1),
			new DesignStore(path).save(owner, { ...first.design, name: "B" }, first.id, 1),
		]);
		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		const rejected = results.find((r) => r.status === "rejected");
		expect(rejected?.status === "rejected" && rejected.reason.status).toBe(409);
		expect((await s.get(owner, first.id)).version).toBe(2);
		const namespaces = await readdir(path);
		expect((await readdir(join(path, namespaces[0]))).sort()).toEqual([
			`${first.id}.1.design.json`,
			`${first.id}.2.design.json`,
		]);
	});
	it("rejects path traversal, oversized assets and invalid designs before saving", async () => {
		const { store: s } = await store();
		await expect(s.asset(owner, "../../escape")).rejects.toMatchObject({ status: 400 });
		await expect(s.putAsset(owner, new Uint8Array(6_000_001))).rejects.toMatchObject({
			status: 413,
		});
		await expect(
			s.save(owner, { ...badgeDesignExamples[0], front: { background: "#ffffff", layers: [] } }),
		).rejects.toThrow();
		expect(await s.list(owner)).toHaveLength(0);
	});
});
