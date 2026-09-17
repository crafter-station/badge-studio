import { expect, test } from "bun:test";
import { materialSignature } from "./signature";
import { advanceTurn } from "./turn";

test("the spin passes continuously through the edge and settles on both faces", () => {
	let state: [number, number] = [0, 0];
	let crossedEdge = false;
	for (let frame = 0; frame < 180; frame++) {
		const next = advanceTurn(...state, Math.PI, 1 / 60);
		expect(Math.abs(next[0] - state[0])).toBeLessThan(0.3);
		if (next[0] > Math.PI / 2) crossedEdge = true;
		state = next;
	}
	expect(crossedEdge).toBe(true);
	expect(state).toEqual([Math.PI, 0]);
	for (let frame = 0; frame < 180; frame++) state = advanceTurn(...state, 0, 1 / 60);
	expect(state).toEqual([0, 0]);
});

test("rapid reversal keeps finite bounded momentum, reduced motion changes immediately", () => {
	let state: [number, number] = [0, 0];
	for (let frame = 0; frame < 180; frame++) {
		const target = frame % 7 < 3 ? 0 : Math.PI;
		state = advanceTurn(...state, target, frame === 70 ? 100 : 1 / 60);
		expect(state.every(Number.isFinite)).toBe(true);
		expect(state[0]).toBeGreaterThan(-0.2);
		expect(state[0]).toBeLessThan(Math.PI + 0.2);
	}
	expect(advanceTurn(...state, Math.PI, 1 / 60, true)).toEqual([Math.PI, 0]);
	expect(advanceTurn(...state, 0, 1 / 60, true)).toEqual([0, 0]);
});

test("material signature preserves every seed bit and uses finite normalized values", () => {
	const signature = { seed: 0x6d92a8bb, version: 1 as const };
	expect(materialSignature(signature)).toEqual({
		seed: 0x6d92a8bb,
		code: "6D92·A8BB",
		values: [187 / 255, 168 / 255, 146 / 255, 109 / 255],
	});
	expect(materialSignature(signature)).toEqual(materialSignature(structuredClone(signature)));
	expect(materialSignature({ seed: 0xffffffff, version: 1 }).values).toEqual([1, 1, 1, 1]);
	expect(materialSignature({ seed: 0, version: 1 }).values).toEqual([0, 0, 0, 0]);
});
