import { expect, test } from "bun:test";
import { shaderCodeIssue } from "./prism-shader";
import { prismRecipeSchema, styleRequestSchema } from "./prism-style-schema";
import { recipeFixture } from "./prism-style.fixture";

const code =
	"let q = p + pointer * 0.2; let n = noise2(q + seed.xy); return sin(q.x * 5.0 + t + n) * 0.6;";
test.each(["shader-director-v1", "shader-director-v2"])(
	"%s formulas survive the saved-recipe and request boundaries",
	(promptVersion) => {
		const recipe = {
			...recipeFixture,
			shader: { version: 1, code },
			promptVersion,
		};
		expect(shaderCodeIssue(code)).toBeUndefined();
		expect(prismRecipeSchema.parse(JSON.parse(JSON.stringify(recipe)))).toEqual(recipe);
		expect(
			styleRequestSchema.parse({ prompt: "Más relieve", current: recipe, mode: "shader" }).current,
		).toEqual(recipe);
		expect(prismRecipeSchema.safeParse({ ...recipe, field: undefined }).success).toBe(false);
		expect(prismRecipeSchema.safeParse({ ...recipeFixture, field: undefined }).success).toBe(true);
	},
);

test("unsupported functions name the problem without widening call admission", () => {
	for (const name of ["mat2x2", "ribbons", "rings", "noise", "textureLoad"])
		expect(shaderCodeIssue(`return ${name}(p);`)).toBe(`Función no admitida: ${name}.`);
	expect(shaderCodeIssue(`return ${Array(80).fill("sin(p.x)").join(" + ")};`)).toBeUndefined();
	expect(shaderCodeIssue(`return ${Array(81).fill("sin(p.x)").join(" + ")};`)).toBe(
		"La fórmula admite hasta 80 llamadas.",
	);
});

test("stored and generated code cannot escape the pure bounded function", () => {
	for (const invalid of [
		"return 0.0; } @compute @workgroup_size(1) fn attack() { loop {} }",
		"loop { } return 1.0;",
		"for (var i = 0; i < 99999; i++) {} return 0.0;",
		"return textureLoad(photo, vec2i(0), 0).r;",
		"return invented(p,t,pointer,seed);",
		"let x = field.time; return x;",
		"let p = vec2f(0.0); return p.x;",
		"return sin(p.x); // injected",
		"return 0.0; /* hidden */",
		"return 0.0; return 1.0;",
		"let a = a + 1.0; return a;",
		"let a = 1.0; let a = 2.0; return a;",
		"return p[0];",
		"return p.constructor;",
		"return q.x;",
		"return sin(p.x); garbage",
		`return ${"sin(".repeat(17)}p.x${")".repeat(17)};`,
		`return ${Array(13).fill("noise2(p)").join(" + ")};`,
		`${Array.from({ length: 40 }, (_, i) => `let a${i} = p.x;`).join(" ")} return p.y;`,
		"return 0.0;".padEnd(4801),
	]) {
		expect(shaderCodeIssue(invalid)).toBeDefined();
		expect(
			prismRecipeSchema.safeParse({ ...recipeFixture, shader: { version: 1, code: invalid } })
				.success,
		).toBe(false);
	}
});

test("bounded arithmetic supports original topology and varying seeded parameters", () => {
	for (let i = 1; i <= 50; i++) {
		const formula = `let uv = p * ${i}.0; let wave = sin(uv.x + t) * cos(uv.y - t); return mix(wave, cells2(uv + seed.xy), 0.25);`;
		expect(shaderCodeIssue(formula)).toBeUndefined();
	}
	expect(shaderCodeIssue("let q = p * 1.5e-2; return select(q.x, q.y, t < 0.2); ")).toBeUndefined();
});
