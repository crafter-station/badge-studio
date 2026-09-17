import { describe, expect, it } from "bun:test";
import { once, runDesignBatch } from "./design-generation";
describe("generation batch cancellation", () => {
	it("aborts remaining proposals when one fails", async () => {
		const failure = new Error("proposal failed");
		const cancelled: number[] = [];
		const batch = runDesignBatch(3, new AbortController().signal, async (index, signal) => {
			if (index === 0) throw failure;
			return new Promise<never>((_, reject) => {
				signal.addEventListener("abort", () => {
					cancelled.push(index);
					reject(signal.reason);
				});
			});
		});
		await expect(batch).rejects.toThrow("proposal failed");
		expect(cancelled).toEqual([1, 2]);
	});
	it("propagates cancellation and never starts an already cancelled batch", async () => {
		const controller = new AbortController();
		let calls = 0;
		const batch = runDesignBatch(2, controller.signal, async (_, signal) => {
			calls++;
			return new Promise<never>((_, reject) => {
				signal.addEventListener("abort", () => reject(signal.reason));
			});
		});
		controller.abort(new Error("cancelled"));
		await expect(batch).rejects.toThrow("cancelled");
		await expect(
			runDesignBatch(3, controller.signal, async () => {
				calls++;
			}),
		).rejects.toThrow("cancelled");
		expect(calls).toBe(2);
	});
});
describe("generation request identity", () => {
	it("shares an in-flight result and refuses payload changes under the same ID", async () => {
		let calls = 0;
		let complete!: (value: string) => void;
		const run = () => {
			calls++;
			return new Promise<string>((resolve) => {
				complete = resolve;
			});
		};
		const key = crypto.randomUUID();
		const a = once("owner:event", key, { brief: "a" }, run);
		const b = once("owner:event", key, { brief: "a" }, run);
		expect(() => once("owner:event", key, { brief: "b" }, run)).toThrow();
		complete("result");
		expect(await a).toBe("result");
		expect(await b).toBe("result");
		expect(calls).toBe(1);
	});
	it("allows retry after failure and separates owners", async () => {
		const key = crypto.randomUUID();
		await expect(
			once("one", key, {}, async () => {
				throw new Error("offline");
			}),
		).rejects.toThrow("offline");
		expect(await once("one", key, {}, async () => 1)).toBe(1);
		expect(await once("two", key, {}, async () => 2)).toBe(2);
	});
});
