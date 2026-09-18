#!/usr/bin/env node
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { extname } from "node:path";

function readResult(path) {
	let value = JSON.parse(readFileSync(path, "utf8"));
	if ("success" in value) {
		if (!value.success) throw new Error("The browser command failed.");
		value = value.data.output;
	}
	if (typeof value === "string") value = JSON.parse(value);
	if (!value?.ok) throw new Error(value?.error?.message || "The tool returned an invalid result.");
	return value.data;
}

try {
	const [command, input, output, target = "portrait"] = process.argv.slice(2);
	if (command === "--help" || !command) {
		process.stdout.write(
			"image-transfer import <image-file> <state-response.json> [portrait|artwork]\nimage-transfer extract <image-response.json> <new-image-file>\n",
		);
	} else if (command === "import" && input && output) {
		const types = {
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".webp": "image/webp",
		};
		const mime = types[extname(input).toLowerCase()];
		if (!mime || !["portrait", "artwork"].includes(target))
			throw new Error("Use a PNG/JPEG/WebP file and portrait or artwork target.");
		const info = statSync(input);
		if (!info.isFile() || info.size > 4_000_000)
			throw new Error("Image must be a regular file smaller than 4 MB.");
		const state = readResult(output);
		if (typeof state.revision !== "string")
			throw new Error("Inspect the editor first to obtain its revision.");
		process.stdout.write(
			`${JSON.stringify({
				action: "import",
				target,
				expectedRevision: state.revision,
				dataUrl: `data:${mime};base64,${readFileSync(input).toString("base64")}`,
			})}\n`,
		);
	} else if (command === "extract" && input && output) {
		const image = readResult(input);
		const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
			image.dataUrl ?? "",
		);
		if (!match || image.dataUrl.length > 5_600_000)
			throw new Error("The tool did not return a supported image.");
		const bytes = Buffer.from(match[1], "base64");
		if (bytes.length > 4_000_000) throw new Error("Image is larger than 4 MB.");
		writeFileSync(output, bytes, { flag: "wx", mode: 0o600 });
		process.stdout.write(`${JSON.stringify({ ok: true, path: output, bytes: bytes.length })}\n`);
	} else throw new Error("Run image-transfer.mjs --help for usage.");
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : "Image transfer failed."}\n`);
	process.exitCode = 2;
}
