import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const input = process.argv[2];
if (!input)
	throw new Error(
		"Usage: bun apps/web/scripts/prepare-portrait-studies.ts <generated-png-directory>",
	);
const output = resolve(import.meta.dir, "../public/prism/portraits");
await mkdir(output, { recursive: true });

async function removeBorderBackground(file: string, threshold: number) {
	const { data, info } = await sharp(file)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const background = [data[0], data[1], data[2]];
	const seen = new Uint8Array(info.width * info.height);
	const queue = new Int32Array(seen.length);
	let start = 0;
	let end = 0;
	function visit(pixel: number) {
		if (seen[pixel]) return;
		seen[pixel] = 1;
		const i = pixel * 4;
		const distance = Math.sqrt(
			background.reduce((sum, value, c) => sum + (data[i + c] - value) ** 2, 0),
		);
		if (distance > threshold) return;
		data[i + 3] = 0;
		queue[end++] = pixel;
	}
	for (let x = 0; x < info.width; x++) {
		visit(x);
		visit((info.height - 1) * info.width + x);
	}
	for (let y = 0; y < info.height; y++) {
		visit(y * info.width);
		visit(y * info.width + info.width - 1);
	}
	while (start < end) {
		const pixel = queue[start++];
		const x = pixel % info.width;
		if (x > 0) visit(pixel - 1);
		if (x < info.width - 1) visit(pixel + 1);
		if (pixel >= info.width) visit(pixel - info.width);
		if (pixel < seen.length - info.width) visit(pixel + info.width);
	}
	return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

for (const id of ["peru-ai-v2", "next-craft", "vibecode-v2", "hackzero-winter-v2"]) {
	const file = join(input, `${id}.png`);
	let image = sharp(file);
	if (id === "vibecode-v2") image = await removeBorderBackground(file, 24);
	if (id === "hackzero-winter-v2") image = await removeBorderBackground(file, 12);
	const destination = join(output, `${id}.webp`);
	await image.webp({ lossless: true, effort: 6 }).toFile(destination);
	console.log(`${id}: ${Bun.file(destination).size} bytes`);
}
