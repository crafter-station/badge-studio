import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const shader = readFileSync(new URL("./prism.wgsl", import.meta.url), "utf8");
const front = shader.slice(shader.indexOf("@fragment fn fs_main"));

function powCalls(source: string) {
	const calls: { base: string; exponent: string }[] = [];
	for (const match of source.matchAll(/\bpow\s*\(/g)) {
		const start = match.index + match[0].length;
		let depth = 1;
		let comma = -1;
		for (let at = start; at < source.length; at++) {
			if (source[at] === "(") depth++;
			if (source[at] === "," && depth === 1) comma = at;
			if (source[at] === ")" && --depth === 0) {
				calls.push({
					base: source.slice(start, comma).trim(),
					exponent: source.slice(comma + 1, at).trim(),
				});
				break;
			}
		}
	}
	return calls;
}

function mask(name: string) {
	const expression = new RegExp(`let ${name} = ([^;]+);`).exec(front)?.[1];
	if (!expression) throw new Error(`Missing front mask: ${name}`);
	const evaluate = new Function(
		"faceOffset",
		"faceRadius",
		"pow",
		"exp",
		"abs",
		`return ${expression};`,
	);
	return (x: number, y: number, radius: number) =>
		evaluate(
			{ x, y },
			radius,
			(base: number, exponent: number) => {
				if (base < 0) throw new Error(`WGSL pow domain: ${base} ** ${exponent}`);
				return base ** exponent;
			},
			Math.exp,
			Math.abs,
		) as number;
}

test("even powers in signed lighting fields have nonnegative bases", () => {
	const calls = powCalls(shader).filter(({ exponent }) => /^(2|4|6)\.0$/.test(exponent));
	expect(calls.length).toBeGreaterThan(0);
	for (const { base } of calls) expect(base).toMatch(/^abs\([\s\S]+\)$/);
});

test.each(["identity", "eyeLeft", "eyeRight", "headRegion"])(
	"%s remains finite in every focus quadrant and on the axes",
	(name) => {
		const evaluate = mask(name);
		for (const radius of [0.1, 0.3, 0.5])
			for (const x of [-1.49, -0.3, -0.000001, 0, 0.000001, 0.3, 1.49])
				for (const y of [-2.26, -0.3, -0.000001, 0, 0.000001, 0.3, 2.26]) {
					const value = evaluate(x, y, radius);
					expect(Number.isFinite(value)).toBe(true);
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(1);
				}
	},
);

test.each(["identity", "headRegion"])("%s preserves symmetry around the focus", (name) => {
	const evaluate = mask(name);
	for (const radius of [0.1, 0.3, 0.5])
		for (const x of [0.01, 0.1, 0.3])
			for (const y of [0.01, 0.1, 0.3]) {
				const value = evaluate(x, y, radius);
				expect(evaluate(-x, y, radius)).toBeCloseTo(value, 12);
				expect(evaluate(x, -y, radius)).toBeCloseTo(value, 12);
				expect(evaluate(-x, -y, radius)).toBeCloseTo(value, 12);
			}
});
