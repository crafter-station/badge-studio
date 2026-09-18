import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
	const root = join(process.cwd(), "public", "prism");
	const image = await readFile(join(root, "demo", "alex-cutout.webp")).catch(() =>
		readFile(join(root, "portrait-placeholder.webp")),
	);
	return new Response(new Uint8Array(image), {
		headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" },
	});
}
