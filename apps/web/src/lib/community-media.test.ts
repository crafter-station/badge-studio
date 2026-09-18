import { expect, test } from "bun:test";
import sharp from "sharp";
import { normalizeCommunityImage } from "./community-media";

test("public image normalization preserves alpha and strips source metadata", async () => {
	const source = await sharp({
		create: {
			width: 16,
			height: 24,
			channels: 4,
			background: { r: 255, g: 20, b: 40, alpha: 0.4 },
		},
	})
		.withExif({ IFD0: { Artist: "Private original author" } })
		.png()
		.toBuffer();
	const result = await normalizeCommunityImage(source);
	const metadata = await sharp(result).metadata();
	expect(metadata.format).toBe("webp");
	expect(metadata.width).toBe(16);
	expect(metadata.height).toBe(24);
	expect(metadata.hasAlpha).toBe(true);
	expect(metadata.exif).toBeUndefined();
	expect(metadata.xmp).toBeUndefined();
});

test("public images reject SVG and malformed bytes instead of passing them to storage", async () => {
	await expect(
		normalizeCommunityImage(
			new TextEncoder().encode(
				'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',
			),
		),
	).rejects.toThrow("PNG, JPEG o WebP");
	await expect(normalizeCommunityImage(new Uint8Array([1, 2, 3]))).rejects.toThrow("no es válida");
});
