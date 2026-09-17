import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { showcaseAssets } from "./design-showcase";

export async function readShowcaseAsset(id: string) {
	return showcaseAssets.has(id)
		? readFile(join(process.cwd(), "public", "prism", "showcase", `${id}.png`))
		: undefined;
}
