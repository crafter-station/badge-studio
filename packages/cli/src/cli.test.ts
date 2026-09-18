import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { badgeDesignSchema } from "@crafter-station/badge-studio-design/badge-design";
import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import { version } from "../package.json";
import { column, style } from "./presentation";

const folder = mkdtempSync(join(tmpdir(), "badge-studio-cli-"));
const binary = new URL("../dist/cli.js", import.meta.url).pathname;
const run = (args: string[]) =>
	spawnSync("node", [binary, ...args], {
		encoding: "utf8",
		env: {
			...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "NO_COLOR")),
			FORCE_COLOR: "1",
		},
	});
afterAll(() => rmSync(folder, { recursive: true, force: true }));

test("bare invocation, help, version and catalog are machine readable without ANSI or a banner", () => {
	for (const args of [[], ["--help"], ["--version"], ["styles", "list"]]) {
		const result = run(args);
		expect(result.status).toBe(0);
		expect(result.stderr).toBe("");
		expect(result.stdout).not.toContain("\u001b");
		expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, version });
	}
	expect(JSON.parse(run(["styles", "list"]).stdout).data.styles).toHaveLength(17);
});

test("all styles roundtrip through exclusive file creation and full semantic validation", () => {
	for (const design of designCatalog) {
		const file = join(folder, `${design.source}.json`);
		const created = run(["design", "create", "--style", design.source ?? "", "--out", file]);
		expect(created.status).toBe(0);
		expect(JSON.parse(created.stdout).data).toMatchObject({
			path: file,
			written: true,
			dryRun: false,
		});
		expect(badgeDesignSchema.parse(JSON.parse(readFileSync(file, "utf8")))).toEqual(design);
		expect(run(["design", "validate", "--file", file]).status).toBe(0);
		expect(run(["design", "create", "--style", design.source ?? "", "--out", file]).status).toBe(2);
		expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(design);
	}
});

test("dry run validates destinations and refuses existing files and dangling symlinks", () => {
	const file = join(folder, "dry.json");
	const result = run(["design", "create", "--style", "gtm", "--out", file, "--dry-run"]);
	expect(JSON.parse(result.stdout).data).toMatchObject({ written: false, dryRun: true });
	expect(() => readFileSync(file)).toThrow();
	writeFileSync(file, "keep me");
	expect(run(["design", "create", "--style", "gtm", "--out", file, "--dry-run"]).status).toBe(2);
	expect(readFileSync(file, "utf8")).toBe("keep me");
	const link = join(folder, "link.json");
	symlinkSync(join(folder, "absent.json"), link);
	expect(run(["design", "create", "--style", "gtm", "--out", link]).status).toBe(2);
});

test("schema exposes actual layers and invalid layout is rejected, not just parsed", () => {
	const schema = JSON.parse(run(["schema"]).stdout);
	expect(schema.data.documentVersion).toBe(1);
	expect(
		schema.data.document.definitions.BadgeDesign.properties.front.properties.layers.items.anyOf,
	).toHaveLength(8);
	const invalid = structuredClone(designCatalog[0]);
	const name = invalid.front.layers.find(
		(layer) => layer.kind === "text" && layer.binding === "name",
	);
	if (!name) throw new Error("Missing name fixture");
	name.x = 1000;
	name.w = 500;
	const file = join(folder, "overflow.json");
	writeFileSync(file, JSON.stringify(invalid));
	const result = run(["design", "validate", "--file", file]);
	expect(result.status).toBe(2);
	expect(JSON.parse(result.stdout).error.code).toBe("INVALID_INPUT");
	expect(result.stderr).toContain("fuera del badge");
});

test("wrong commands, flags and malformed JSON fail without prompting", () => {
	const file = join(folder, "broken.json");
	writeFileSync(file, "{");
	for (const args of [
		["design", "create"],
		["design", "create", "--style", "wrong"],
		["styles", "list", "--out", "x"],
		["styles", "delete"],
		["--force"],
		["design", "validate", "--file", file],
	]) {
		const result = run(args);
		expect(result.status).toBe(2);
		expect(JSON.parse(result.stdout)).toMatchObject({
			ok: false,
			error: { code: "INVALID_INPUT" },
		});
		expect(result.stderr.length).toBeGreaterThan(0);
	}
});

test("presentation honors NO_COLOR and aligns styled columns by visible width", () => {
	const before = process.env.NO_COLOR;
	try {
		process.env.NO_COLOR = "";
		expect(style("Badge Studio", "1", true)).toBe("Badge Studio");
		expect(column("\u001b[1mGTM\u001b[0m", 6)).toBe("\u001b[1mGTM\u001b[0m   ");
	} finally {
		if (before === undefined) Reflect.deleteProperty(process.env, "NO_COLOR");
		else process.env.NO_COLOR = before;
	}
});
