#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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
import { version } from "../package.json";
import { CloudError, connectAccount, logout } from "./cloud";
import { InputError } from "./errors";
import { extractImage, imageParams } from "./images";
import { banner, column, machineOutput, style } from "./presentation";
import { publishBadge, saveBundle } from "./publish";
import { getSkill, skills } from "./skills";
import { openBrowser, startStudio, studioRequest } from "./studio";

const commands = [
	"skills list",
	"skills get core [--full]",
	"doctor",
	"studio start [--no-open]",
	"studio tools --url <session-url>",
	"studio call <tool> --url <session-url> --params <json|@file>",
	"studio stop --url <session-url>",
	"studio save --url <session-url> --out <badge.badge.json>",
	"publish --file <badge.badge.json> --yes [--no-open]",
	"publish --file <badge.badge.json> --dry-run",
	"publish status --file <badge.badge.json>",
	"login [--no-open]",
	"logout",
	"image params --file <image> --state <state.json> [--target portrait|artwork]",
	"image extract --file <image-response.json> --out <new-file>",
	"styles list",
	"design create --style <id> [--out <new-file>] [--dry-run]",
	"design validate --file <file>",
	"schema",
];
const nextSteps = ["badgio skills get core", "badgio doctor"];

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
			full: { type: "boolean" },
			"no-open": { type: "boolean" },
			site: { type: "string" },
			port: { type: "string" },
			url: { type: "string" },
			params: { type: "string" },
			state: { type: "string" },
			target: { type: "string" },
			yes: { type: "boolean" },
		},
	});
	const json = machineOutput(Boolean(values.json));
	if (values.version) {
		emit({ version }, nextSteps, version, json);
		return;
	}
	if (values.help || !positionals.length) {
		if (!json) banner(version);
		emit(
			{
				commands,
				flags: ["--json", "--help", "--version"],
				exitCodes: { success: 0, invalidInput: 2, systemFailure: 1 },
			},
			nextSteps,
			`${style("Commands", "1", !json)}\n${commands.map((command) => `  npx badgio ${command}`).join("\n")}\n\nJSON is automatic when piped. --out creates new files only.\nInstall globally: npm install --global badgio
From a built checkout: npm run studio -- <command>`,
			json,
		);
		return;
	}
	const command = ["skills get", "studio call"].includes(positionals.slice(0, 2).join(" "))
		? positionals.slice(0, 2).join(" ")
		: positionals.join(" ");
	const allowed: Record<string, string[]> = {
		"skills list": [],
		"skills get": ["full"],
		doctor: [],
		"studio start": ["no-open", "site", "port"],
		"studio tools": ["url"],
		"studio call": ["url", "params"],
		"studio stop": ["url"],
		"studio save": ["url", "out"],
		publish: ["file", "yes", "dry-run", "site", "no-open"],
		"publish status": ["file", "site"],
		login: ["site", "no-open"],
		logout: ["site"],
		"image params": ["file", "state", "target"],
		"image extract": ["file", "out"],
		"styles list": [],
		schema: [],
		"design create": ["style", "out", "dry-run"],
		"design validate": ["file"],
	};
	if (!(command in allowed)) throw new InputError(`Unknown command: ${command}`);
	for (const flag of Object.keys(values))
		if (!["json", "help", "version", ...allowed[command]].includes(flag))
			throw new InputError(`--${flag} is not supported by ${command}`);
	const progress = (data: unknown) => process.stderr.write(`${JSON.stringify(data)}\n`);
	if (command === "login" || command === "logout") {
		const site = values.site ?? "https://badge-studio.crafter.run";
		const result =
			command === "logout"
				? await logout(site)
				: (await connectAccount(site, { login: true, noOpen: values["no-open"], progress }))
						.account;
		emit(
			result,
			["badgio publish --file badge.badge.json --yes"],
			"name" in result ? `Connected as ${result.name}.` : "Signed out.",
			json,
		);
		return;
	}
	if (command === "studio save") {
		if (!values.url || !values.out)
			throw new InputError("Supply --url and a new --out bundle path.");
		await newPath(values.out);
		const result = await saveBundle(values.url, values.out);
		emit(
			result,
			[
				`badgio publish --file ${JSON.stringify(result.path)} --dry-run`,
				"Ask whether to change anything or publish. Use --yes only after publication is approved.",
			],
			`Saved complete badge: ${result.path}`,
			json,
		);
		return;
	}
	if (command === "publish" || command === "publish status") {
		if (!values.file)
			throw new InputError(
				"Supply --file with a complete .badge.json bundle saved by badgio studio save.",
			);
		const result = await publishBadge({
			file: values.file,
			site: values.site,
			yes: values.yes,
			dryRun: values["dry-run"],
			status: command === "publish status",
			noOpen: values["no-open"],
			progress,
		});
		emit(
			result,
			["Keep the saved bundle for revisions and publication status."],
			JSON.stringify(result, null, 2),
			json,
		);
		return;
	}
	if (command === "skills list") {
		const entries = Object.entries(skills).map(([name, { description }]) => ({
			name,
			description,
		}));
		emit(
			{ skills: entries },
			nextSteps,
			entries.map((entry) => `${entry.name} · ${entry.description}`).join("\n"),
			json,
		);
		return;
	}
	if (command === "skills get") {
		if (positionals.length !== 3)
			throw new InputError("Supply one skill name. Run badgio skills list.");
		let content: string;
		try {
			content = getSkill(positionals[2], values.full);
		} catch (error) {
			throw new InputError((error as Error).message);
		}
		if (values.json) emit({ name: positionals[2], content }, nextSteps, content, true);
		else process.stdout.write(`${content.trim()}\n`);
		return;
	}
	if (command === "doctor") {
		const check = (command: string) => {
			const result = spawnSync(command, ["--version"], {
				encoding: "utf8",
				timeout: 5000,
				stdio: ["ignore", "pipe", "pipe"],
			});
			return {
				installed: !result.error && result.status === 0,
				version: result.status === 0 ? result.stdout.trim().slice(0, 200) : null,
			};
		};
		const browser = check("agent-browser");
		const images = check("ai");
		const dependencies = {
			"agent-browser": {
				...browser,
				purpose: "Browser inspection and visual verification",
				install: "npm install --global agent-browser && agent-browser install",
			},
			"ai-cli": {
				...images,
				optional: true,
				purpose: "Requested image generation only",
				install: "npm install --global ai-cli",
			},
		};
		emit(
			{
				node: process.versions.node,
				ready: browser.installed,
				dependencies,
				installationRequiresConsent: true,
			},
			nextSteps,
			`agent-browser: ${browser.installed ? "installed" : "missing; ask before installing"}\nai-cli: ${images.installed ? "installed" : "optional; only needed for image generation"}\nRun badgio skills get core for setup.`,
			json,
		);
		return;
	}
	if (command === "studio start") {
		const port = values.port === undefined ? 0 : Number(values.port);
		if (!Number.isInteger(port) || port < 0 || port > 65535)
			throw new InputError("Use a port from 0 to 65535.");
		const studio = await startStudio({ site: values.site, port });
		const stop = () => studio.close();
		process.once("SIGINT", stop);
		process.once("SIGTERM", stop);
		studio.server.once("close", () => {
			process.off("SIGINT", stop);
			process.off("SIGTERM", stop);
		});
		emit(
			{ url: studio.url, site: studio.site, pid: process.pid },
			[
				"Open this URL in your built-in browser, or your default browser. Keep this process running.",
			],
			`Your live canvas: ${studio.url}\nKeep this process running while you design.`,
			json,
		);
		if (!values["no-open"]) {
			try {
				await openBrowser(studio.url);
			} catch {
				process.stderr.write(
					"Could not open the default browser. Open the session URL above manually.\n",
				);
			}
		}
		return;
	}
	if (command.startsWith("studio ")) {
		if (!values.url) throw new InputError("Supply --url with the complete session URL.");
		let params: unknown = {};
		if (command === "studio call") {
			if (positionals.length !== 3) throw new InputError("Supply one discovered tool name.");
			if (values.params?.startsWith("@")) {
				const path = values.params.slice(1);
				const info = await lstat(path);
				if (!info.isFile() || info.size > 12_000_000)
					throw new InputError("Expected a params file below 12 MB.");
				params = JSON.parse(await readFile(path, "utf8"));
			} else if (values.params) params = JSON.parse(values.params);
		}
		const result = await studioRequest(
			values.url,
			command === "studio tools" ? "/tools" : command === "studio stop" ? "/stop" : "/call",
			command === "studio tools"
				? undefined
				: command === "studio stop"
					? {}
					: { name: positionals[2], params },
		);
		if (!result.ok) {
			process.stdout.write(`${JSON.stringify({ ...result, version, nextSteps })}\n`);
			process.stderr.write(`badgio: ${result.error?.message ?? "Studio operation failed."}\n`);
			process.exitCode = 2;
		} else emit(result.data, nextSteps, JSON.stringify(result.data, null, 2), json);
		return;
	}
	if (command === "image params") {
		if (!values.file || !values.state) throw new InputError("Supply --file and --state.");
		process.stdout.write(
			`${JSON.stringify(await imageParams(values.file, values.state, values.target))}\n`,
		);
		return;
	}
	if (command === "image extract") {
		if (!values.file || !values.out) throw new InputError("Supply --file and a new --out path.");
		const result = await extractImage(values.file, values.out);
		emit(result, nextSteps, `Image saved: ${result.path}`, json);
		return;
	}
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
			["npx badgio design create --style opalo-lunar --out badge.json"],
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
			["npx badgio design validate --file badge.json"],
			"Use --json to inspect the complete versioned design schema.",
			json,
		);
		return;
	}
	if (command === "design create") {
		if (!values.style) throw new InputError("Supply --style. Run npx badgio styles list for IDs.");
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
						`npx badgio design validate --file ${JSON.stringify(path)}`,
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
		error: {
			code:
				error instanceof CloudError ? error.code : userError ? "INVALID_INPUT" : "SYSTEM_FAILURE",
			message: error.message,
		},
		nextSteps,
	};
	if (machineOutput(process.argv.includes("--json")))
		process.stdout.write(`${JSON.stringify(payload)}\n`);
	process.stderr.write(`badgio: ${error.message}\n`);
	process.exitCode = exitCode;
});
