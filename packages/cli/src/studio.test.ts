import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { type IncomingMessage, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { browserCommand, editorOrigin, sessionAddress, studioRequest } from "./studio";

const sessions: ChildProcess[] = [];
const connections: AbortController[] = [];
let folder: string;
beforeAll(async () => {
	folder = await mkdtemp(join(tmpdir(), "badgio-node-server-"));
	const result = await Bun.build({
		entrypoints: [new URL("./studio.ts", import.meta.url).pathname],
		outdir: folder,
		target: "node",
		naming: "studio.mjs",
		loader: { ".txt": "text" },
	});
	if (!result.success) throw new Error(result.logs.join("\n"));
});
afterAll(() => rm(folder, { recursive: true, force: true }));
afterEach(() => {
	for (const connection of connections.splice(0)) connection.abort();
	for (const session of sessions.splice(0)) session.kill();
});

async function setup(timeout = 1000) {
	const session = spawn(
		"node",
		[
			"--input-type=module",
			"-e",
			`import { startStudio } from ${JSON.stringify(pathToFileURL(join(folder, "studio.mjs")).href)};
		const session = await startStudio({ timeout: ${timeout} });
		console.log(JSON.stringify({ url: session.url }));
		process.on("SIGTERM", () => session.close());`,
		],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	sessions.push(session);
	const url = await new Promise<string>((resolve, reject) => {
		session.once("error", reject);
		session.stdout?.once("data", (data) => resolve(JSON.parse(data.toString()).url));
		session.stderr?.once("data", (data) => reject(new Error(data.toString())));
	});
	const { origin, token } = sessionAddress(url);
	const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
	const post = (path: string, body: unknown, signal?: AbortSignal) =>
		fetch(`${origin}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal });
	return { url, origin, token, headers, post };
}

async function connect(session: Awaited<ReturnType<typeof setup>>) {
	const controller = new AbortController();
	connections.push(controller);
	const client = crypto.randomUUID();
	const response = await new Promise<IncomingMessage>((resolve, reject) => {
		const call = request(
			`${session.origin}/events?token=${session.token}&client=${client}`,
			resolve,
		);
		call.once("error", reject);
		call.end();
	});
	expect(response.statusCode).toBe(200);
	controller.signal.addEventListener("abort", () => response.destroy(), { once: true });
	type Event = { type: string; id: string; name?: string; params?: unknown };
	const events: Event[] = [];
	const readers: ((event: Event) => void)[] = [];
	let buffer = "";
	response.on("data", (chunk) => {
		buffer += chunk.toString();
		while (buffer.includes("\n\n")) {
			const end = buffer.indexOf("\n\n");
			const message = buffer.slice(0, end);
			buffer = buffer.slice(end + 2);
			if (!message.startsWith("data: ")) continue;
			const event = JSON.parse(message.slice(6));
			const reader = readers.shift();
			if (reader) reader(event);
			else events.push(event);
		}
	});
	await session.post("/ready", {
		client,
		tools: [{ name: "badge_inspect" }, { name: "badge_edit" }],
	});
	return {
		client,
		controller,
		async event(): Promise<Event> {
			const event = events.shift();
			return event ?? new Promise<Event>((resolve) => readers.push(resolve));
		},
	};
}

test("shell embeds the chosen editor, never embeds its token, and exposes no permissive CORS", async () => {
	const session = await setup();
	const response = await fetch(session.origin);
	expect(response.headers.get("content-security-policy")).toContain(
		"frame-src https://badge-studio.crafter.run",
	);
	expect(response.headers.get("access-control-allow-origin")).toBeNull();
	const html = await response.text();
	expect(html).toContain("<iframe");
	expect(html).toContain("https://badge-studio.crafter.run");
	expect(html).not.toContain(session.token);
	expect(await studioRequest(session.url, "/tools")).toMatchObject({
		ok: true,
		data: { connected: false, tools: [] },
	});
});

test("HTTP boundary rejects wrong tokens, cross-origin browsers and DNS rebinding hosts", async () => {
	const session = await setup();
	for (const headers of [
		{},
		{ Authorization: "Bearer wrong" },
		{ ...session.headers, Origin: "https://attacker.example" },
		{ ...session.headers, Origin: "null" },
		{ ...session.headers, "Sec-Fetch-Site": "cross-site" },
	] as Record<string, string>[]) {
		const response = await fetch(`${session.origin}/tools`, { headers });
		expect(response.status).toBe(403);
	}
	const status = await new Promise<number | undefined>((resolve, reject) => {
		const call = request(
			`${session.origin}/tools`,
			{ headers: { ...session.headers, Host: "rebinding.example" } },
			(response) => {
				response.resume();
				resolve(response.statusCode);
			},
		);
		call.once("error", reject);
		call.end();
	});
	expect(status).toBe(403);
	expect(
		(
			await fetch(`${session.origin}/tools`, {
				headers: { ...session.headers, Origin: session.origin },
			})
		).status,
	).toBe(200);
});

test("single preview ownership, authenticated tool delivery, result and unknown-tool rejection", async () => {
	const session = await setup();
	const peer = await connect(session);
	const other = await fetch(
		`${session.origin}/events?token=${session.token}&client=${crypto.randomUUID()}`,
	);
	expect(other.status).toBe(409);
	const pending = studioRequest(session.url, "/call", { name: "badge_inspect", params: {} });
	const event = await peer.event();
	expect(event).toMatchObject({ type: "call", name: "badge_inspect", params: {} });
	expect(
		(
			await session.post("/result", {
				client: crypto.randomUUID(),
				id: event.id,
				output: { ok: true },
			})
		).status,
	).toBe(409);
	await session.post("/result", {
		client: peer.client,
		id: event.id,
		output: { ok: true, data: { revision: "real-browser:2" } },
	});
	expect(await pending).toEqual({ ok: true, data: { revision: "real-browser:2" } });
	expect(
		await studioRequest(session.url, "/call", { name: "shell_exec", params: {} }),
	).toMatchObject({
		ok: false,
		error: { code: "INVALID_INPUT" },
	});
});

test("timeouts cancel pending calls, discard late results and recover for the next operation", async () => {
	const session = await setup(40);
	const peer = await connect(session);
	const pending = studioRequest(session.url, "/call", { name: "badge_edit", params: {} });
	const event = await peer.event();
	expect(await pending).toMatchObject({ ok: false, error: { code: "TIMEOUT" } });
	expect(await peer.event()).toEqual({ type: "cancel", id: event.id });
	await session.post("/result", { client: peer.client, id: event.id, output: { ok: true } });
	const next = studioRequest(session.url, "/call", { name: "badge_inspect", params: {} });
	const nextEvent = await peer.event();
	await session.post("/result", {
		client: peer.client,
		id: nextEvent.id,
		output: { ok: true, data: "recovered" },
	});
	expect(await next).toEqual({ ok: true, data: "recovered" });
});

test("disconnect settles active calls and allows a new preview to take ownership", async () => {
	const session = await setup();
	const peer = await connect(session);
	const pending = studioRequest(session.url, "/call", { name: "badge_edit", params: {} });
	await peer.event();
	peer.controller.abort();
	expect(await pending).toMatchObject({ ok: false, error: { code: "DISCONNECTED" } });
	expect(
		await studioRequest(session.url, "/call", { name: "badge_edit", params: {} }),
	).toMatchObject({
		ok: false,
		error: { code: "NOT_CONNECTED" },
	});
	await connect(session);
	expect(await studioRequest(session.url, "/tools")).toMatchObject({ data: { connected: true } });
});

test("caller cancellation reaches the preview and clears capacity", async () => {
	const session = await setup();
	const peer = await connect(session);
	const controller = new AbortController();
	const pending = session.post("/call", { name: "badge_edit", params: {} }, controller.signal);
	const event = await peer.event();
	controller.abort();
	await expect(pending).rejects.toThrow();
	expect(await peer.event()).toEqual({ type: "cancel", id: event.id });
});

test("bounded concurrency rejects overload and shutdown settles all active calls", async () => {
	const session = await setup();
	const peer = await connect(session);
	const calls = [];
	for (let i = 0; i < 8; i++) {
		calls.push(studioRequest(session.url, "/call", { name: "badge_inspect", params: {} }));
		await peer.event();
	}
	expect(
		await studioRequest(session.url, "/call", { name: "badge_edit", params: {} }),
	).toMatchObject({
		ok: false,
		error: { code: "BUSY" },
	});
	peer.controller.abort();
	for (const result of await Promise.all(calls))
		expect(result).toMatchObject({ ok: false, error: { code: "DISCONNECTED" } });
	expect(await studioRequest(session.url, "/stop", {})).toMatchObject({ ok: true });
});

test("origin and session URL validation reject remote targets, credentials and malformed tokens", () => {
	expect(editorOrigin("http://127.0.0.1:3004")).toBe("http://127.0.0.1:3004");
	for (const site of [
		"https://attacker.example",
		"file:///tmp/a",
		"https://badge-studio.crafter.run/evil",
		"http://user:pass@127.0.0.1:3004",
	])
		expect(() => editorOrigin(site)).toThrow();
	const token = "a".repeat(64);
	expect(sessionAddress(`http://127.0.0.1:8123/#${token}`)).toEqual({
		origin: "http://127.0.0.1:8123",
		token,
	});
	for (const url of [
		`https://example.com/#${token}`,
		`http://localhost:8123/#${token}`,
		`http://127.0.0.1:8123/evil#${token}`,
		"http://127.0.0.1:8123/#wrong",
	])
		expect(() => sessionAddress(url)).toThrow();
	const url = `http://127.0.0.1:8123/#${token}`;
	expect(browserCommand(url, "darwin")).toEqual(["open", [url]]);
	expect(browserCommand(url, "win32")).toEqual(["rundll32", ["url.dll,FileProtocolHandler", url]]);
	expect(browserCommand(url, "linux")).toEqual(["xdg-open", [url]]);
});
