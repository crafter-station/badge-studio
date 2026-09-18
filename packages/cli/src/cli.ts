#!/usr/bin/env node
import { constants } from "node:fs";
import { access, lstat, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	badgeDesignObjectSchema,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";
import { designCatalog, findDesign } from "@crafter-station/badge-studio-design/catalog";
import type { ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { banner, column, machineOutput, style } from "./presentation";

const version = "0.1.0";
const commands = [
	"styles list",
	"design create --style <id> [--out <new-file>] [--dry-run]",
	"design validate --file <file>",
	"schema",
];
const nextSteps = ["badgio styles list", "badgio schema"];

class InputError extends Error {}

function emit(data: unknown, next: string[], human: string, json: boolean) {
	process.stdout.write(
		json ? `${JSON.stringify({ ok: true, version, data, nextSteps: next })}\n` : `${human}\n`,
	);
}

async function newPath(file: string) {
	const path = resolve(file);
	try {
		await lstat(path);
		throw new InputError(`File already exists: ${path}. Choose a new --out path.`);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	await access(dirname(path), constants.W_OK);
	return path;
}

async function run() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		strict: true,
		options: {
			json: { type: "boolean" },
			help: { type: "boolean", short: "h" },
			version: { type: "boolean" },
			style: { type: "string" },
			out: { type: "string" },
			file: { type: "string" },
			"dry-run": { type: "boolean" },
		},
	});
	const json = machineOutput(Boolean(values.json));
	if (values.version) {
		emit({ version }, nextSteps, version, json);
		return;
	}
	if (values.help || !positionals.length) {
		if (!json) banner();
		emit(
			{
				commands,
				flags: ["--json", "--help", "--version"],
				exitCodes: { success: 0, invalidInput: 2, systemFailure: 1 },
			},
			nextSteps,
			`${style("Commands", "1", !json)}\n${commands.map((command) => `  badgio ${command}`).join("\n")}\n\nJSON is automatic when piped. --out creates new files only.\nFrom a checkout: bun run studio <command>`,
			json,
		);
		return;
	}
	const command = positionals.join(" ");
	const allowed: Record<string, string[]> = {
		"styles list": [],
		schema: [],
		"design create": ["style", "out", "dry-run"],
		"design validate": ["file"],
	};
	if (!(command in allowed)) throw new InputError(`Unknown command: ${command}`);
	for (const flag of Object.keys(values))
		if (!["json", "help", "version", ...allowed[command]].includes(flag))
			throw new InputError(`--${flag} is not supported by ${command}`);
	if (command === "styles list") {
		const styles = designCatalog.map((design) => ({
			id: design.source,
			name: design.name,
			description: design.description,
			surface: design.material.surface,
			faces: 2,
		}));
		emit(
			{ styles },
			["badgio design create --style opalo-lunar --out badge.json"],
			`${style(`${styles.length} starting points`, "1", !json)}\n\n${styles
				.map((entry) => `${column(entry.id ?? "", 25)}${entry.name}`)
				.join("\n")}`,
			json,
		);
		return;
	}
	if (command === "schema") {
		emit(
			{
				documentVersion: 1,
				canvas: { width: 1024, height: 1536, unit: "px" },
				document: zodToJsonSchema(badgeDesignObjectSchema as ZodTypeAny, "BadgeDesign"),
				semantics: [
					"Layer IDs are unique per face. Rotated bounds must remain inside the canvas.",
					"Text, portrait and QR layers reserve the upper 90px for the clip.",
					"Each face contains a name-bound text layer. Front has 1–4 portrait layers.",
					"Back contains a role-bound text layer and a QR. Maximum 24 effects per face.",
					"QR is square, unrotated, fully opaque, at least 128px front or 280px back, contrast >=4.5.",
					"Visible QR cannot be overlapped by a later visible layer.",
					"Portrait/image layers cannot use the ink channel. SVG path numbers are bounded to 16384.",
					"Run design validate for full semantic validation. Artwork IDs require matching local assets.",
				],
			},
			["badgio design validate --file badge.json"],
			"Use --json to inspect the complete versioned design schema.",
			json,
		);
		return;
	}
	if (command === "design create") {
		if (!values.style) throw new InputError("Supply --style. Run badgio styles list for IDs.");
		const preset = findDesign(values.style);
		if (!preset) throw new InputError(`Unknown style: ${values.style}`);
		const design = badgeDesignSchema.parse(structuredClone(preset));
		const path = values.out ? await newPath(values.out) : null;
		const dryRun = Boolean(values["dry-run"]);
		if (path && !dryRun) {
			const handle = await open(path, "wx", 0o600);
			try {
				await handle.writeFile(`${JSON.stringify(design, null, 2)}\n`);
				await handle.sync();
			} finally {
				await handle.close();
			}
		}
		emit(
			{ design, path, written: Boolean(path && !dryRun), dryRun },
			path
				? [
						`badgio design validate --file ${JSON.stringify(path)}`,
						"Import the JSON in the Badge Studio editor.",
					]
				: ["Run again with --out badge.json to create an importable document."],
			`${style(dryRun ? "Preview ready" : "Design ready", "1", !json)} · ${design.name}\n${path ?? "No file written. Add --out badge.json to save."}\n${dryRun ? "Dry run. No files changed." : "2 faces · editable layers"}`,
			json,
		);
		return;
	}
	if (!values.file) throw new InputError("Supply --file to validate a document.");
	const path = resolve(values.file);
	const handle = await open(path, "r");
	let input: unknown;
	try {
		const info = await handle.stat();
		if (!info.isFile() || info.size > 2 * 1024 * 1024)
			throw new InputError("Expected a JSON file smaller than 2 MB.");
		input = JSON.parse(await readFile(handle, "utf8"));
	} finally {
		await handle.close();
	}
	const result = badgeDesignSchema.safeParse(input);
	if (!result.success)
		throw new InputError(
			result.error.issues
				.map((issue) => `${issue.path.join(".") || "design"}: ${issue.message}`)
				.join("\n"),
		);
	emit(
		{ valid: true, path, name: result.data.name, documentVersion: result.data.version },
		["Import the JSON in the Badge Studio editor."],
		`${style("Valid design", "32", !json)} · ${result.data.name}\nSchema and layout constraints passed.`,
		json,
	);
}

run().catch((error: Error & { code?: string }) => {
	const userError =
		error instanceof InputError ||
		error instanceof SyntaxError ||
		[
			"ERR_PARSE_ARGS_UNKNOWN_OPTION",
			"ERR_PARSE_ARGS_INVALID_OPTION_VALUE",
			"ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL",
			"ENOENT",
			"EEXIST",
			"EISDIR",
		].includes(error.code ?? "");
	const exitCode = userError ? 2 : 1;
	const payload = {
		ok: false,
		version,
		error: { code: userError ? "INVALID_INPUT" : "SYSTEM_FAILURE", message: error.message },
		nextSteps,
	};
	if (machineOutput(process.argv.includes("--json")))
		process.stdout.write(`${JSON.stringify(payload)}\n`);
	process.stderr.write(`badge-studio: ${error.message}\n`);
	process.exitCode = exitCode;
});
