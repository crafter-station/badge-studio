import { defineConfig } from "tsup";
export default defineConfig({
	entry: [
		"src/index.ts",
		"src/catalog.ts",
		"src/badge-design.ts",
		"src/badge-design-examples.ts",
		"src/prism-style.ts",
		"src/prism-style-schema.ts",
		"src/prism-shader.ts",
	],
	format: ["esm"],
	dts: true,
	clean: true,
	splitting: true,
	sourcemap: true,
});
