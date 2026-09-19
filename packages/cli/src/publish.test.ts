import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findDesign } from "@crafter-station/badge-studio-design/catalog";
import {
	type BadgeBundle,
	canonicalJson,
	communityDigest,
	communityParticipantSchema,
	validateBadgeBundle,
} from "@crafter-station/badge-studio-design/community";
import { publishBadge, readBundle } from "./publish";

const folder = await mkdtemp(join(tmpdir(), "badgio-publish-"));
const before = { token: process.env.BADGIO_TOKEN, state: process.env.BADGIO_STATE_DIR };
let file = "";
let calls: { path: string; body: unknown }[] = [];
let receipt: { id: string; state: string; version: number; url: string } | undefined;
let operationId = "";
let dropCommit = false;
let ownerId = "user_test";
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 0,
	async fetch(request) {
		const url = new URL(request.url);
		const body =
			request.method === "POST" && request.headers.get("content-type") === "application/json"
				? await request.json()
				: null;
		calls.push({ path: url.pathname + url.search, body });
		expect(request.headers.get("authorization")).toBe("Bearer isolated-test-token");
		if (url.searchParams.has("account")) return Response.json({ id: ownerId, name: "Test" });
		if (url.searchParams.has("operationId"))
			return Response.json({ state: receipt ? "published" : "preparing", receipt });
		if (body?.action === "prepare") {
			if (operationId) expect(body.intent.operationId).toBe(operationId);
			operationId = body.intent.operationId;
			return Response.json(receipt ? { receipt } : { operationId, uploaded: [] });
		}
		if (url.pathname.endsWith("/media/portrait")) {
			expect(request.headers.get("x-badge-operation")).toMatch(/^\d{13}\.[a-f0-9]{64}$/);
			expect((await request.arrayBuffer()).byteLength).toBeGreaterThan(0);
			return Response.json({ ready: true });
		}
		if (body?.action === "commit") {
			expect(body.operationId).toBe(operationId);
			expect(body.consent).toBe(true);
			const id = crypto.randomUUID();
			receipt = { id, version: 1, state: "published", url: `/community/${id}` };
			if (dropCommit) return Response.json({ error: "Lost reply" }, { status: 503 });
			return Response.json(receipt);
		}
		return Response.json({ error: "unexpected" }, { status: 400 });
	},
});

async function fixtureBundle(): Promise<BadgeBundle> {
	const design = findDesign("noche-abierta");
	if (!design) throw new Error("Missing fixture");
	const base64 =
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQkdP4D8IMMAYAKwAFZW0eDpwAAAAASUVORK5CYII=";
	return {
		format: "badge-studio-bundle",
		version: 1,
		snapshot: {
			format: 1,
			design,
			participant: communityParticipantSchema.parse({
				name: "Test Person",
				role: "Maker",
				organization: "QA",
				number: 1,
				eventName: "Test",
				publicUrl: "https://example.com",
				signature: { seed: 1, version: 1 },
				metadata: {},
			}),
			images: {
				portrait: await communityDigest(new Blob([Buffer.from(base64, "base64")])),
				artwork: null,
			},
		},
		images: { portrait: { mimeType: "image/png", base64 }, artwork: null },
	};
}

beforeEach(async () => {
	process.env.BADGIO_TOKEN = "isolated-test-token";
	process.env.BADGIO_STATE_DIR = join(folder, crypto.randomUUID());
	file = join(folder, `${crypto.randomUUID()}.badge.json`);
	await writeFile(file, JSON.stringify(await fixtureBundle()));
	calls = [];
	receipt = undefined;
	operationId = "";
	dropCommit = false;
	ownerId = "user_test";
});
afterEach(() => {
	calls = [];
});
afterAll(async () => {
	server.stop(true);
	for (const [key, value] of [
		["BADGIO_TOKEN", before.token],
		["BADGIO_STATE_DIR", before.state],
	] as const)
		if (value === undefined) Reflect.deleteProperty(process.env, key);
		else process.env[key as string] = value;
	await rm(folder, { recursive: true, force: true });
});
const site = server.url.origin;

test("bundle validates both layout and actual bytes and rejects substituted portrait or metadata", async () => {
	const { bundle, snapshotHash } = await readBundle(file);
	expect(snapshotHash).toBe(await communityDigest(canonicalJson(bundle.snapshot)));
	const wrongImage = structuredClone(bundle);
	wrongImage.images.portrait.base64 = Buffer.from("another image").toString("base64");
	await expect(validateBadgeBundle(wrongImage)).rejects.toThrow("does not match");
	const extra = { ...bundle, token: "never allowed" };
	await expect(validateBadgeBundle(extra)).rejects.toThrow();
	const wrongName = structuredClone(bundle);
	wrongName.snapshot.participant.name = "";
	await expect(validateBadgeBundle(wrongName)).rejects.toThrow();
});

test("dry-run rejects undecodable images even when their supplied hash matches", async () => {
	const bundle = await fixtureBundle();
	const bytes = new TextEncoder().encode("not an image");
	bundle.images.portrait.base64 = Buffer.from(bytes).toString("base64");
	bundle.snapshot.images.portrait = await communityDigest(new Blob([bytes]));
	await writeFile(file, JSON.stringify(bundle));
	await expect(publishBadge({ file, site, dryRun: true })).rejects.toThrow();
	expect(calls).toHaveLength(0);
});

test("dry-run rejects a valid two-frame APNG before its animation can be silently discarded", async () => {
	const bundle = await fixtureBundle();
	const base64 =
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAACAAAAAgAAAAAAAAAAAAEACgAA6FTcAAAAABFJREFUeJxj+M/A8B+EGWAMAEfKB/lnWW63AAAAGmZjVEwAAAABAAAAAgAAAAIAAAAAAAAAAAABAAoAAHMnNtQAAAAUZmRBVAAAAAJ4nGNgYPj/H4KhDAA/0gf51gDBTQAAAABJRU5ErkJggg==";
	bundle.images.portrait.base64 = base64;
	bundle.snapshot.images.portrait = await communityDigest(
		new Blob([Buffer.from(base64, "base64")]),
	);
	await writeFile(file, JSON.stringify(bundle));
	await expect(publishBadge({ file, site, dryRun: true })).rejects.toThrow("static PNG");
	expect(calls).toHaveLength(0);
});

test("dry-run and absent consent make no request or operation file", async () => {
	expect(await publishBadge({ file, site, dryRun: true })).toMatchObject({
		valid: true,
		published: false,
	});
	await expect(publishBadge({ file, site })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
	expect(calls).toHaveLength(0);
	await expect(readdir(process.env.BADGIO_STATE_DIR as string)).rejects.toThrow();
});

test("direct publication and retries use one operation without a preview browser", async () => {
	const first = await publishBadge({ file, site, yes: true });
	const second = await publishBadge({ file, site, yes: true });
	expect(second).toEqual(first);
	expect(
		calls.filter((call) => (call.body as { action?: string })?.action === "commit"),
	).toHaveLength(1);
	expect(calls.filter((call) => call.path.endsWith("/media/portrait"))).toHaveLength(1);
	const directory = join(process.env.BADGIO_STATE_DIR as string, "publications");
	const logs = await readFile(join(directory, "audit.jsonl"), "utf8");
	expect(logs).toContain('"state":"pending"');
	expect(logs).toContain('"state":"published"');
	expect(logs).not.toContain("isolated-test-token");
	expect(logs).not.toContain("base64");
});

test("a lost commit reply recovers its durable receipt instead of making a second publication", async () => {
	dropCommit = true;
	const result = await publishBadge({ file, site, yes: true });
	expect(result).toMatchObject({ state: "published", receipt: { id: receipt?.id } });
	const status = await publishBadge({ file, site, status: true });
	expect(status).toMatchObject({ state: "published", receipt: { id: receipt?.id } });
	expect(
		calls.filter((call) => (call.body as { action?: string })?.action === "commit"),
	).toHaveLength(1);
});

test("switching accounts cannot hide an existing operation or duplicate its publication", async () => {
	await publishBadge({ file, site, yes: true });
	ownerId = "user_other";
	await expect(publishBadge({ file, site, status: true })).rejects.toMatchObject({
		code: "OPERATION_CONFLICT",
	});
	await expect(publishBadge({ file, site, yes: true })).rejects.toMatchObject({
		code: "OPERATION_CONFLICT",
	});
	expect(
		calls.filter((call) => (call.body as { action?: string })?.action === "commit"),
	).toHaveLength(1);
});
