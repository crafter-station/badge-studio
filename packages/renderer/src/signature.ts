import type { PrismSignature } from "./types";

export function materialSignature(signature: PrismSignature = { seed: 0, version: 1 }) {
	const seed = signature.seed >>> 0;
	const hex = seed.toString(16).padStart(8, "0").toUpperCase();
	return {
		code: `${hex.slice(0, 4)}·${hex.slice(4)}`,
		seed,
		values: [seed & 255, (seed >>> 8) & 255, (seed >>> 16) & 255, seed >>> 24].map(
			(value) => value / 255,
		),
	};
}
