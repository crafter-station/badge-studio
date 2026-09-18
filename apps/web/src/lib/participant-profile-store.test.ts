import { describe, expect, it, spyOn } from "bun:test";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { emptyIdentity } from "./participant-profile";
import { ParticipantProfileStore } from "./participant-profile-store";

const alex = { ...emptyIdentity, name: "Alex Rivera", role: "Speaker", started: true };
const photo = () => new Blob(["original portrait bytes"], { type: "image/png" });

describe("shared participant storage", () => {
	it("opens empty, persists one photo and restores it after closing and reopening", async () => {
		const factory = new IDBFactory();
		const store = new ParticipantProfileStore(factory);
		expect(await store.read()).toEqual({ identity: emptyIdentity, photo: null });
		await store.save(alex, photo());
		store.close();
		const restored = await new ParticipantProfileStore(factory).read();
		expect(restored.identity).toEqual(alex);
		expect(await restored.photo?.text()).toBe("original portrait bytes");
		expect(restored.photo?.type).toBe("image/png");
		expect(JSON.stringify(restored.identity)).not.toContain("blob:");
	});

	it("updates identity without removing the photo, then clears just the photo", async () => {
		const store = new ParticipantProfileStore(new IDBFactory());
		await store.save(alex, photo());
		const changed = { ...alex, name: "Jo", number: 45 };
		await store.save(changed);
		expect(await (await store.read()).photo?.text()).toBe("original portrait bytes");
		await store.save(changed, null);
		expect(await store.read()).toEqual({ identity: changed, photo: null });
	});

	it("replaces the previous image instead of retaining multiple copies", async () => {
		const factory = new IDBFactory();
		const store = new ParticipantProfileStore(factory);
		await store.save(alex, photo());
		await store.save(alex, new Blob(["replacement"], { type: "image/webp" }));
		expect(await (await store.read()).photo?.text()).toBe("replacement");
		const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
			const open = factory.open("badge-studio-participant-v1");
			open.onerror = () => reject(open.error);
			open.onsuccess = () => {
				const tx = open.result.transaction("profile");
				const request = tx.objectStore("profile").getAllKeys();
				tx.oncomplete = () => {
					open.result.close();
					resolve(request.result);
				};
			};
		});
		expect(keys).toEqual(["identity", "photo"]);
	});

	it("rejects malformed metadata and unsupported, empty or oversized photos without changes", async () => {
		const store = new ParticipantProfileStore(new IDBFactory());
		await store.save(alex, photo());
		for (const invalid of [
			{ ...alex, name: "A".repeat(81) },
			{ ...alex, number: 0 },
			{ ...alex, number: 1.5 },
			{ ...alex, number: 1_000_000 },
		])
			await expect(store.save(invalid)).rejects.toThrow();
		for (const invalid of [
			new Blob(["unsafe"], { type: "image/svg+xml" }),
			new Blob([], { type: "image/png" }),
			new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "image/png" }),
		])
			await expect(store.save({ ...alex, name: "Not saved" }, invalid)).rejects.toThrow();
		expect((await store.read()).identity).toEqual(alex);
		expect(await (await store.read()).photo?.text()).toBe("original portrait bytes");
	});

	it("rolls back metadata when the photo write fails, then safely retries", async () => {
		const store = new ParticipantProfileStore(new IDBFactory());
		await store.save(alex, photo());
		const put = IDBObjectStore.prototype.put;
		const failure = spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
			this: IDBObjectStore,
			value: unknown,
			key?: IDBValidKey,
		) {
			if (key === "photo") throw new DOMException("Full", "QuotaExceededError");
			return put.call(this, value, key);
		});
		try {
			await expect(
				store.save({ ...alex, name: "Pending" }, new Blob(["next"], { type: "image/png" })),
			).rejects.toThrow("Full");
		} finally {
			failure.mockRestore();
		}
		expect((await store.read()).identity).toEqual(alex);
		expect(await (await store.read()).photo?.text()).toBe("original portrait bytes");
		await store.save({ ...alex, name: "Retried" }, photo());
		expect((await store.read()).identity.name).toBe("Retried");
	});

	it("cancels a transaction after writing identity and preserves the last complete profile", async () => {
		const store = new ParticipantProfileStore(new IDBFactory());
		await store.save(alex, photo());
		const controller = new AbortController();
		const put = IDBObjectStore.prototype.put;
		const cancellation = spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
			this: IDBObjectStore,
			value: unknown,
			key?: IDBValidKey,
		) {
			const request = put.call(this, value, key);
			if (key === "identity") controller.abort();
			return request;
		});
		try {
			await expect(
				store.save({ ...alex, name: "Cancelled" }, null, controller.signal),
			).rejects.toThrow();
		} finally {
			cancellation.mockRestore();
		}
		expect((await store.read()).identity).toEqual(alex);
		expect(await (await store.read()).photo?.text()).toBe("original portrait bytes");
	});

	it("ignores corrupt records and can replace them with a valid profile", async () => {
		const factory = new IDBFactory();
		const store = new ParticipantProfileStore(factory);
		await store.read();
		await new Promise<void>((resolve, reject) => {
			const open = factory.open("badge-studio-participant-v1");
			open.onerror = () => reject(open.error);
			open.onsuccess = () => {
				const tx = open.result.transaction("profile", "readwrite");
				tx.objectStore("profile").put({ ...alex, version: 9 }, "identity");
				tx.objectStore("profile").put("blob:http://expired/photo", "photo");
				tx.oncomplete = () => {
					open.result.close();
					resolve();
				};
			};
		});
		expect(await store.read()).toEqual({ identity: emptyIdentity, photo: null });
		await store.save(alex, photo());
		expect((await store.read()).identity).toEqual(alex);
	});
});
