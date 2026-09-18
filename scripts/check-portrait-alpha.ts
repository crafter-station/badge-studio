import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const build = await Bun.build({
	entrypoints: [
		resolve(root, "packages/renderer/src/design-photo.ts"),
		resolve(root, "apps/web/src/app/badge/prepare-photo.ts"),
	],
	target: "browser",
});
if (!build.success) throw new Error(build.logs.join("\n"));
const files = new Map(build.outputs.map((file) => [file.path.split("/").pop(), file]));
const page = `<!doctype html><html><body><script type="module">
import { paintDesignPhoto } from "/design-photo.js";
import { preparePhoto } from "/prepare-photo.js";
const check = (value, message) => { if (!value) throw new Error(message); };
const canvas = (width, height) => Object.assign(document.createElement("canvas"), {width, height});
const blob = (canvas, type = "image/png") => new Promise(resolve => canvas.toBlob(resolve, type));
const results = [];
try {
	const source = canvas(48, 48);
	const input = source.getContext("2d");
	const pixels = input.createImageData(48, 48);
	for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
		const at = (y * 48 + x) * 4;
		pixels.data.set([140, 110, 80, x < 16 ? 0 : x < 32 ? 128 : 255], at);
	}
	input.putImageData(pixels, 0, 0);
	const bitmap = await createImageBitmap(source);
	for (const filter of ["original", "mono", "rose", "blue", "warm", "thermal", "silver", "cyanotype", "vintage"]) {
		for (const tintMode of ["multiply", "screen", "overlay", "color"]) {
			for (const tintOpacity of [0, 0.2, 1]) {
				const output = canvas(48, 48);
				const context = output.getContext("2d");
				paintDesignPhoto(context, {kind:"portrait", id:"test", x:0, y:0, w:48, h:48, radius:0, filter, tint:"#b7809e", tintMode, tintOpacity, contrast:1}, bitmap);
				const actual = context.getImageData(0, 0, 48, 48).data;
				for (let at = 3; at < actual.length; at += 4)
					check(actual[at] === pixels.data[at], filter + "/" + tintMode + "/" + tintOpacity + " changed alpha at " + at);
				results.push(filter + "/" + tintMode + "/" + tintOpacity);
			}
		}
	}
	const faded = canvas(48,48);
	paintDesignPhoto(faded.getContext("2d"), {kind:"portrait",id:"fade",x:0,y:0,w:48,h:48,radius:0,filter:"rose",fade:{x:0.2,top:0.2,bottom:0.2}}, bitmap);
	const fadedPixels = faded.getContext("2d").getImageData(0,0,48,48).data;
	for(let at=3;at<fadedPixels.length;at+=4) check(fadedPixels[at] <= pixels.data[at], "Fade filled transparent pixels");
	bitmap.close();
	const large = canvas(2600, 2600);
	const largeContext = large.getContext("2d");
	largeContext.fillStyle = "#bd8362";
	largeContext.fillRect(650,650,1300,1300);
	for(const type of ["image/png", "image/webp"]) {
		const file = new File([await blob(large,type)], "portrait", {type});
		const prepared = await preparePhoto(file);
		check(prepared.type === "image/webp", "Transparent input became opaque JPEG");
		const resized = await createImageBitmap(prepared);
		check(resized.width === 2048 && resized.height === 2048, "Resize bound not applied");
		const sample = canvas(2048,2048);
		const context = sample.getContext("2d");
		context.drawImage(resized,0,0);
		check(context.getImageData(0,0,1,1).data[3] === 0, "Resizing painted a background");
		check(context.getImageData(1024,1024,1,1).data[3] === 255, "Resizing lost the subject");
		resized.close();
		results.push(type + " resize preserves alpha");
	}
	window.result = {pass:true, cases:results.length, results};
} catch(error) { window.result = {pass:false, error:String(error)}; }
</script></body></html>`;
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 0,
	fetch(request) {
		const path = new URL(request.url).pathname.slice(1);
		return path
			? new Response(files.get(path) ?? "Not found", {
					status: files.has(path) ? 200 : 404,
					headers: { "Content-Type": "text/javascript" },
				})
			: new Response(page, { headers: { "Content-Type": "text/html" } });
	},
});
const session = `badge-portrait-alpha-${process.pid}`;
function browser(...args: string[]) {
	const result = JSON.parse(
		execFileSync("agent-browser", ["--session", session, "--json", ...args], {
			encoding: "utf8",
			timeout: 40_000,
		}),
	);
	if (!result.success) throw new Error(JSON.stringify(result));
	return result.data;
}
try {
	await new Promise<void>((resolve, reject) => {
		const child = Bun.spawn(
			["agent-browser", "--session", session, "open", `http://127.0.0.1:${server.port}`],
			{ stdout: "ignore", stderr: "inherit" },
		);
		child.exited.then((code) => (code === 0 ? resolve() : reject(new Error(`Browser: ${code}`))));
	});
	await new Promise<void>((resolve, reject) => {
		const child = Bun.spawn(
			["agent-browser", "--session", session, "wait", "--fn", "Boolean(window.result)"],
			{ stdout: "ignore", stderr: "inherit" },
		);
		child.exited.then((code) => (code === 0 ? resolve() : reject(new Error(`Tests: ${code}`))));
	});
	const result = browser("eval", "window.result").result;
	console.log(JSON.stringify(result, null, 2));
	if (!result.pass) process.exitCode = 1;
} finally {
	browser("close");
	server.stop(true);
}
