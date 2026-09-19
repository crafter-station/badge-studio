import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts"],
	format: ["esm"],
	platform: "node",
	target: "node22",
	clean: true,
	noExternal: ["@crafter-station/badge-studio-design"],
	external: ["@napi-rs/keyring"],
	loader: { ".md": "text", ".txt": "text" },
});
