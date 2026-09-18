import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { designCatalog } from "../packages/design/src/catalog";

const root = resolve(import.meta.dir, "..");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3004";
const session = process.env.BADGE_PREVIEW_SESSION ?? "badge-preview-assets";
const studies = new Set([
	"herbario-azul",
	"frecuencia-acida",
	"terracota-postal",
	"opalo-lunar",
	"radio-risografica",
]);

function browser(...args: string[]) {
	const response = JSON.parse(
		execFileSync("agent-browser", ["--session", session, "--json", ...args], {
			encoding: "utf8",
			maxBuffer: 20 * 1024 * 1024,
		}),
	);
	if (!response.success) throw new Error(JSON.stringify(response));
	return response.data;
}

function evaluate(code: string) {
	return browser("eval", "-b", Buffer.from(code).toString("base64")).result;
}

browser("--webgpu", "open", `${baseUrl}/gallery`);
try {
	browser("set", "viewport", "1440", "1000");
	browser("wait", ".gallery-item .live-badge");
	evaluate(`(() => {
		const style = document.createElement("style");
		style.id = "badge-asset-capture";
		style.textContent = ".gallery-item { display:none!important } .gallery-item[data-capture] { display:block!important } .gallery-item[data-capture] .gallery-preview { position:fixed!important; left:0!important; top:0!important; width:720px!important; height:960px!important; padding:0!important; border:0!important; z-index:1000!important }";
		document.head.append(style);
	})()`);
	for (const design of designCatalog) {
		const source = design.source;
		if (!source) throw new Error(`Missing source for ${design.name}`);
		evaluate(`(() => {
			document.querySelector("[data-capture]")?.removeAttribute("data-capture");
			document.querySelector('[data-badge-source="${source}"]').closest(".gallery-item").setAttribute("data-capture", "");
		})()`);
		browser(
			"wait",
			"--fn",
			"document.querySelector('[data-capture] canvas[data-ready=\"true\"]')?.width === 1080",
		);
		for (const side of ["front", "back"]) {
			if (side === "back") browser("click", "[data-capture] .gallery-preview");
			browser("wait", `[data-capture] canvas[data-side="${side}"][data-ready="true"]`);
			const value = evaluate(
				'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(document.querySelector("[data-capture] canvas").toDataURL("image/webp", .93)))))',
			);
			const bytes = Buffer.from(value.split(",")[1], "base64");
			const paths = studies.has(source)
				? [`showcase/previews/${source}-${side}.webp`]
				: side === "front"
					? [`collection/materials/${source}.webp`, `collection/previews/${source}-front.webp`]
					: [`collection/previews/${source}-back.webp`];
			for (const path of paths) {
				const target = resolve(root, "apps/web/public/prism", path);
				mkdirSync(resolve(target, ".."), { recursive: true });
				writeFileSync(target, bytes);
			}
			console.log(`${source} ${side}: ${bytes.length} bytes`);
		}
	}
} finally {
	browser("close");
}
