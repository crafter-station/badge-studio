import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
	assert.equal(styles.length, 17);
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
				verifier: fileURLToPath(import.meta.url),
			},
			null,
			2,
		),
	);
} finally {
	rmSync(folder, { recursive: true, force: true });
}
