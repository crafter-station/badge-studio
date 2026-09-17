import { resolveShader } from "@vgpu/wgsl/runtime";
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	splitting: true,
	sourcemap: true,
	external: [/^react/, /^vgpu/],
	esbuildPlugins: [
		{
			name: "vgpu-wgsl",
			setup(build) {
				build.onLoad({ filter: /\.wgsl$/ }, async ({ path }) => {
					const resolved = await resolveShader({ entry: path, validate: false });
					return {
						contents: `export default ${JSON.stringify(resolved.wgsl)}`,
						loader: "js",
						watchFiles: [path, ...resolved.deps],
					};
				});
			},
		},
	],
	esbuildOptions(options) {
		options.loader = { ...options.loader, ".wgsl": "text" };
	},
	banner: { js: '"use client";' },
});
