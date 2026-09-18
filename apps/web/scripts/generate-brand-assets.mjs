import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public", "brand-assets");
await mkdir(output, { recursive: true });
const fontRoot = join(dirname(require.resolve("geist/font/sans")), "fonts", "geist-sans");
const fonts = await Promise.all(
	[
		["Geist-Regular.ttf", 400],
		["Geist-Medium.ttf", 500],
		["Geist-SemiBold.ttf", 600],
	].map(async ([name, weight]) => ({
		name: "Geist",
		data: await readFile(join(fontRoot, name)),
		weight,
		style: "normal",
	})),
);

const mark = (color) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><path d="m32 80 96-56 96 56-96 56Z" fill="${color}" fill-opacity=".18"/><path d="m32 80 96-56 96 56-96 56Z M32 128l96 56 96-56 M32 176l96 56 96-56" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="108" fill="#141414"/><g fill="none" transform="translate(106 106) scale(1.171875)">${mark("#ffffff").replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`;
const uri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
await writeFile(join(output, "symbol.svg"), mark("#141414"));
await writeFile(join(output, "symbol-light.svg"), mark("#ffffff"));
await writeFile(join(output, "favicon.svg"), icon);

const sizes = [16, 32, 64, 180, 192, 512];
const pngs = new Map();
for (const size of sizes) {
	const image = await sharp(Buffer.from(icon)).resize(size, size).png().toBuffer();
	pngs.set(size, image);
	await writeFile(join(output, size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`), image);
}
const icoSizes = [16, 32, 64];
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
	const image = pngs.get(size);
	const entry = 6 + index * 16;
	header[entry] = size;
	header[entry + 1] = size;
	header.writeUInt16LE(1, entry + 4);
	header.writeUInt16LE(32, entry + 6);
	header.writeUInt32LE(image.length, entry + 8);
	header.writeUInt32LE(offset, entry + 12);
	offset += image.length;
}
await writeFile(
	join(root, "public", "favicon.ico"),
	Buffer.concat([header, ...icoSizes.map((size) => pngs.get(size))]),
);

const cards = new Map();
for (const source of ["gtm", "vibecode", "hackzero-winter"]) {
	const { data: pixels, info } = await sharp(
		join(root, "public", "prism", "collection", "materials", `${source}.webp`),
	)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	for (let index = 3; index < pixels.length; index += 4)
		pixels[index] = Math.max(0, Math.min(255, (pixels[index] - 128) * 2));
	const image = await sharp(pixels, { raw: info }).trim().resize({ height: 900 }).png().toBuffer();
	const dimensions = await sharp(image).metadata();
	cards.set(source, { src: `data:image/png;base64,${image.toString("base64")}`, ...dimensions });
}

function card(source, x, y, height, rotation) {
	const { src, width: imageWidth, height: imageHeight } = cards.get(source);
	return h("img", {
		src,
		width: Math.round((imageWidth / imageHeight) * height),
		height,
		style: {
			position: "absolute",
			left: x,
			top: y,
			transform: `rotate(${rotation}deg)`,
		},
	});
}

function composition(square, dark) {
	const color = dark ? "#fafafa" : "#141414";
	const muted = dark ? "#b0b0b0" : "#6b6b6b";
	return h(
		"div",
		{
			style: {
				width: "100%",
				height: "100%",
				display: "flex",
				position: "relative",
				background: dark ? "#141414" : "#f9f8f6",
				color,
				fontFamily: "Geist",
			},
		},
		h(
			"div",
			{
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12,
					position: "absolute",
					left: 64,
					top: 52,
					fontSize: 26,
					fontWeight: 600,
					letterSpacing: -1,
				},
			},
			h("img", { src: uri(mark(color)), width: 34, height: 34 }),
			"Badge Studio.",
		),
		h(
			"div",
			{
				style: {
					display: "flex",
					flexDirection: "column",
					position: "absolute",
					left: 64,
					top: square ? 150 : 182,
					fontSize: square ? 86 : 76,
					fontWeight: 500,
					letterSpacing: -4.5,
					lineHeight: 1.05,
				},
			},
			h("span", null, "Badges with"),
			h("span", null, "personality."),
		),
		h(
			"div",
			{
				style: {
					display: "flex",
					position: "absolute",
					left: 66,
					top: square ? 360 : 376,
					fontSize: 21,
					color: muted,
					letterSpacing: -0.3,
				},
			},
			"Your photo. Every style. Make it yours.",
		),
		...(square
			? [
					card("hackzero-winter", 210, 497, 415, -17),
					card("gtm", 616, 491, 418, 15),
					card("vibecode", 384, 440, 475, -4),
				]
			: [
					card("hackzero-winter", 622, 190, 330, -17),
					card("gtm", 894, 185, 337, 15),
					card("vibecode", 750, 132, 387, -4),
				]),
		h(
			"div",
			{
				style: {
					position: "absolute",
					left: 64,
					right: 64,
					bottom: 42,
					display: "flex",
					justifyContent: "space-between",
					borderTop: `1px solid ${dark ? "#343434" : "#deddda"}`,
					paddingTop: 18,
					color: muted,
					fontSize: 14,
				},
			},
			h("span", null, "badge-studio.crafter.run"),
			h("span", null, "An open-source playground by Crafter Station"),
		),
	);
}

for (const [name, square, dark] of [
	["og-image", false, false],
	["og-image-dark", false, true],
	["social-square", true, false],
]) {
	const response = new ImageResponse(composition(square, dark), {
		width: square ? 1080 : 1200,
		height: square ? 1080 : 630,
		fonts,
	});
	const image = Buffer.from(await response.arrayBuffer());
	await sharp(image)
		.png({ compressionLevel: 9 })
		.toFile(join(output, `${name}.png`));
	await sharp(image)
		.webp({ quality: 92 })
		.toFile(join(output, `${name}.webp`));
}
console.log(`Brand assets generated in ${output}`);
