import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(
	readFileSync(new URL("../packages/cli/package.json", import.meta.url), "utf8"),
);
const requested = process.argv[2] ?? `badgio@${manifest.version}`;
const localTarball = existsSync(requested);
const spec = localTarball ? resolve(requested) : requested;
const folder = mkdtempSync(join(tmpdir(), "badgio-npm-"));
const bin = join(folder, "bin");
let preview;
const find = (name) => {
	const path = process.env.PATH?.split(delimiter)
		.map((directory) => join(directory, name))
		.find((candidate) => existsSync(candidate));
	assert.ok(path, `${name} must be installed`);
	return realpathSync(path);
};

try {
	mkdirSync(bin);
	symlinkSync(process.execPath, join(bin, "node"));
	for (const name of ["npm", "npx"]) symlinkSync(find(name), join(bin, name));
	writeFileSync(join(folder, "package.json"), '{"name":"badgio-consumer","private":true}');
	writeFileSync(join(folder, ".npmrc"), "registry=https://registry.npmjs.org/\n");
	const env = {
		...Object.fromEntries(
			Object.entries(process.env).filter(([name]) => !name.toLowerCase().startsWith("npm_")),
		),
		PATH: [bin, "/usr/bin", "/bin"].join(delimiter),
		npm_config_registry: "https://registry.npmjs.org/",
		npm_config_userconfig: join(folder, ".npmrc"),
		npm_config_cache: join(folder, "cache"),
		npm_config_ignore_scripts: "true",
	};
	assert.equal(spawnSync("bun", ["--version"], { env }).error?.code, "ENOENT");
	const run = (command, args, status = 0) => {
		const result = spawnSync(command, args, {
			cwd: folder,
			env,
			encoding: "utf8",
			timeout: 60_000,
			maxBuffer: 4 * 1024 * 1024,
		});
		assert.ifError(result.error);
		assert.equal(result.status, status, result.stderr || result.stdout);
		return result.stdout;
	};
	const cold = JSON.parse(
		run(
			"npx",
			localTarball
				? ["--yes", "--package", spec, "--", "badgio", "--version"]
				: ["--yes", spec, "--version"],
		),
	);
	assert.equal(cold.version, manifest.version);
	run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", spec]);
	const version = JSON.parse(run("npx", ["--yes=false", "--", "badgio", "--version"]));
	assert.equal(version.version, manifest.version);
	const alias = JSON.parse(run("npx", ["--yes=false", "--", "badge-studio", "--version"]));
	assert.equal(alias.version, version.version);
	const cli = join(folder, "node_modules/badgio/dist/cli.js");
	assert.match(readFileSync(cli, "utf8"), /^#!\/usr\/bin\/env node/);
	const command = (args, status = 0) => JSON.parse(run("node", [cli, ...args], status));
	const { styles } = command(["styles", "list"]).data;
	assert.equal(styles.length, 18);
	for (const { id } of styles) {
		const file = join(folder, `${id}.json`);
		assert.equal(command(["design", "create", "--style", id, "--out", file]).data.written, true);
		assert.equal(command(["design", "validate", "--file", file]).data.valid, true);
		const before = readFileSync(file, "utf8");
		assert.equal(
			command(["design", "create", "--style", id, "--out", file], 2).error.code,
			"INVALID_INPUT",
		);
		assert.equal(readFileSync(file, "utf8"), before);
	}
	assert.equal(command(["schema"]).data.documentVersion, 1);
	const portrait =
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQkdP4D8IMMAYAKwAFZW0eDpwAAAAASUVORK5CYII=";
	const bundlePath = join(folder, "consumer.badge.json");
	writeFileSync(
		bundlePath,
		JSON.stringify({
			format: "badge-studio-bundle",
			version: 1,
			snapshot: {
				format: 1,
				design: JSON.parse(readFileSync(join(folder, "noche-abierta.json"), "utf8")),
				participant: {
					name: "Consumer Test",
					role: "Maker",
					organization: "",
					number: 1,
					eventName: "Test",
					publicUrl: "https://example.com",
					signature: { seed: 1, version: 1 },
					metadata: {},
				},
				images: {
					portrait: createHash("sha256").update(Buffer.from(portrait, "base64")).digest("hex"),
					artwork: null,
				},
			},
			images: { portrait: { mimeType: "image/png", base64: portrait }, artwork: null },
		}),
	);
	assert.equal(command(["publish", "--file", bundlePath, "--dry-run"]).data.valid, true);
	assert.equal(command(["publish", "--file", bundlePath], 2).error.code, "CONSENT_REQUIRED");
	assert.equal(
		JSON.parse(
			run("node", [
				"--input-type=module",
				"-e",
				"const m = await import('@napi-rs/keyring'); console.log(JSON.stringify({native: typeof m.AsyncEntry === 'function'}))",
			]),
		).native,
		true,
	);
	const guides = command(["skills", "list"]).data.skills;
	assert.equal(guides.length, 3);
	for (const { name } of guides) {
		const markdown = run("node", [cli, "skills", "get", name]);
		assert.equal(markdown.trim(), command(["skills", "get", name, "--json"]).data.content.trim());
		assert.ok(markdown.startsWith("# "));
	}
	assert.equal(command(["doctor"]).data.ready, false);
	preview = spawn("node", [cli, "studio", "start", "--no-open", "--json"], {
		cwd: folder,
		env,
		stdio: ["ignore", "pipe", "pipe"],
	});
	const receipt = await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error("Preview did not start.")), 5000);
		preview.once("error", reject);
		preview.stdout.once("data", (chunk) => {
			clearTimeout(timer);
			try {
				resolve(JSON.parse(chunk.toString()));
			} catch (error) {
				reject(error);
			}
		});
	});
	const address = new URL(receipt.data.url);
	const headers = { Authorization: `Bearer ${address.hash.slice(1)}` };
	const tools = await fetch(`${address.origin}/tools`, {
		headers,
		signal: AbortSignal.timeout(5000),
	});
	assert.equal((await tools.json()).data.connected, false);
	const shell = await fetch(address.origin, { signal: AbortSignal.timeout(5000) });
	assert.ok((await shell.text()).includes("<iframe"));
	const stopped = new Promise((resolve) => preview.once("exit", resolve));
	await fetch(`${address.origin}/stop`, {
		method: "POST",
		headers,
		signal: AbortSignal.timeout(5000),
	});
	await stopped;
	console.log(
		JSON.stringify(
			{
				package: `badgio@${version.version}`,
				source: spec,
				node: process.version,
				npm: run("npm", ["--version"]).trim(),
				bunAvailable: false,
				coldNpx: true,
				npmInstall: true,
				alias: true,
				roundTrips: styles.length,
				overwriteRejections: styles.length,
				bundledGuides: guides.length,
				localPreview: true,
				doctorWithoutDependencies: true,
				bundlePreflight: true,
				publicationConsentRequired: true,
				nativeCredentialStore: true,
				verifier: fileURLToPath(import.meta.url),
			},
			null,
			2,
		),
	);
} finally {
	preview?.kill();
	rmSync(folder, { recursive: true, force: true });
}
