import { expect, test } from "bun:test";
import { orbitLiveIndices, orbitPosition } from "../app/landing/orbit-math";

test("mobile material budget follows the three nearest badges around the entire orbit", () => {
	for (let step = -480; step <= 480; step++) {
		const phase = (step / 120) * Math.PI + 0.00001;
		const indices = orbitLiveIndices(phase, 12, true);
		expect(indices).toHaveLength(3);
		expect(new Set(indices).size).toBe(3);
		const admittedDepth = Math.min(
			...indices.map((index) => orbitPosition(phase, index, 12, 390).z),
		);
		for (let index = 0; index < 12; index++) {
			if (!indices.includes(index))
				expect(orbitPosition(phase, index, 12, 390).z).toBeLessThanOrEqual(admittedDepth);
		}
		expect(orbitLiveIndices(phase + Math.PI * 2, 12, true)).toEqual(indices);
	}
});

test("desktop restores all materials and small collections remain complete", () => {
	expect(orbitLiveIndices(1.2, 12, true)).toHaveLength(3);
	expect(orbitLiveIndices(1.2, 12, false)).toEqual(Array.from({ length: 12 }, (_, index) => index));
	for (const count of [0, 1, 2, 3])
		expect(orbitLiveIndices(-20, count, true)).toEqual(
			Array.from({ length: count }, (_, index) => index),
		);
});
