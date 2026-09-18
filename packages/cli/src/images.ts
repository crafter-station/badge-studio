import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { InputError } from "./errors";

export async function readToolResult(path: string) {
	const info = await stat(path);
	if (!info.isFile() || info.size > 12_000_000)
		throw new InputError("Expected a result file below 12 MB.");
	let value = JSON.parse(await readFile(path, "utf8"));
	if ("success" in value) {
		if (!value.success) throw new InputError("The browser command failed.");
		value = value.data.output;
	}
	if (typeof value === "string") value = JSON.parse(value);
	if (!value?.ok)
		throw new InputError(value?.error?.message || "The tool returned an invalid result.");
	return value.data;
}

export async function imageParams(file: string, state: string, target = "portrait") {
	const types: Record<string, string> = {
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".webp": "image/webp",
	};
	const mime = types[extname(file).toLowerCase()];
	if (!mime || !["portrait", "artwork"].includes(target))
		throw new InputError("Use a PNG/JPEG/WebP file and portrait or artwork target.");
	const info = await stat(file);
	if (!info.isFile() || info.size > 4_000_000)
		throw new InputError("Image must be smaller than 4 MB.");
	const current = await readToolResult(state);
	if (typeof current.revision !== "string")
		throw new InputError("Inspect the editor to obtain its revision.");
	const bytes = await readFile(file);
	if (bytes.length > 4_000_000) throw new InputError("Image must be smaller than 4 MB.");
	return {
		action: "import",
		target,
		expectedRevision: current.revision,
		dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
	};
}

export async function extractImage(file: string, out: string) {
	const image = await readToolResult(file);
	const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
		image.dataUrl ?? "",
	);
	if (!match || image.dataUrl.length > 5_600_000)
		throw new InputError("The tool did not return a supported image.");
	const bytes = Buffer.from(match[1], "base64");
	if (bytes.length > 4_000_000) throw new InputError("Image is larger than 4 MB.");
	const path = resolve(out);
	await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
	return { path, bytes: bytes.length };
}
