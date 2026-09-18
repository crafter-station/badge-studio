import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { InputError } from "./errors";
import shell from "./studio-shell.txt";

const maxBytes = 12_000_000;

export function editorOrigin(site = "https://badge-studio.crafter.run") {
	let url: URL;
	try {
		url = new URL(site);
	} catch {
		throw new InputError("Supply a valid studio origin.");
	}
	if (
		(url.origin !== "https://badge-studio.crafter.run" &&
			!(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	)
		throw new InputError("Use the public studio origin or a local http://127.0.0.1:<port> origin.");
	return url.origin;
}

export function sessionAddress(value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new InputError("Use the complete local session URL returned by badgio studio start.");
	}
	if (
		url.protocol !== "http:" ||
		url.hostname !== "127.0.0.1" ||
		!url.port ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		!/^#[a-f0-9]{64}$/.test(url.hash)
	)
		throw new InputError("Use the complete local session URL returned by badgio studio start.");
	return { origin: url.origin, token: url.hash.slice(1) };
}

export function browserCommand(url: string, platform = process.platform): [string, string[]] {
	if (platform === "darwin") return ["open", [url]];
	if (platform === "win32") return ["rundll32", ["url.dll,FileProtocolHandler", url]];
	return ["xdg-open", [url]];
}

export async function openBrowser(url: string) {
	const [command, args] = browserCommand(url);
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { stdio: "ignore", shell: false });
		child.once("error", reject);
		child.once("exit", (code) =>
			code === 0 ? resolve() : reject(new Error(`Default browser opener exited with ${code}.`)),
		);
	});
}

async function readJson(request: IncomingMessage) {
	let size = 0;
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		size += chunk.length;
		if (size > maxBytes) throw new Error("Request exceeds 12 MB.");
		chunks.push(chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function startStudio(
	options: { site?: string; port?: number; timeout?: number } = {},
) {
	const site = editorOrigin(options.site);
	const token = randomBytes(32).toString("hex");
	let origin = "";
	let peer: { id: string; stream: ServerResponse; tools: unknown[] } | undefined;
	const pending = new Map<
		string,
		{ finish: (output: unknown) => void; timer: ReturnType<typeof setTimeout> }
	>();
	const failure = (code: string, message: string) => ({ ok: false, error: { code, message } });
	const send = (value: unknown) => peer?.stream.write(`data: ${JSON.stringify(value)}\n\n`);
	function settle(id: string, output: unknown) {
		const call = pending.get(id);
		if (!call) return;
		clearTimeout(call.timer);
		pending.delete(id);
		call.finish(output);
	}
	function disconnect() {
		for (const id of pending.keys())
			settle(
				id,
				failure("DISCONNECTED", "Preview disconnected. Reconnect and inspect before retrying."),
			);
		peer?.stream.end();
		peer = undefined;
	}
	const server = createServer(async (request, response) => {
		response.setHeader("Cache-Control", "no-store");
		response.setHeader("Referrer-Policy", "no-referrer");
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader("X-Frame-Options", "DENY");
		function json(status: number, value: unknown) {
			if (response.destroyed || response.writableEnded) return;
			response.writeHead(status, { "Content-Type": "application/json" });
			response.end(JSON.stringify(value));
		}
		try {
			if (
				request.headers.host !== new URL(origin).host ||
				(request.headers.origin && request.headers.origin !== origin) ||
				request.headers["sec-fetch-site"] === "cross-site"
			) {
				json(403, failure("FORBIDDEN", "Only this local preview can connect."));
				return;
			}
			const url = new URL(request.url ?? "/", origin);
			if (request.method === "GET" && url.pathname === "/") {
				response.setHeader(
					"Content-Security-Policy",
					`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src ${site}; frame-ancestors 'none'; base-uri 'none'`,
				);
				response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				response.end(shell.replace("__STUDIO_ORIGIN__", JSON.stringify(site)));
				return;
			}
			const credential =
				url.pathname === "/events"
					? url.searchParams.get("token")
					: request.headers.authorization?.replace(/^Bearer /, "");
			if (credential !== token) {
				json(403, failure("FORBIDDEN", "Invalid session token."));
				return;
			}
			if (request.method === "GET" && url.pathname === "/events") {
				if (peer) {
					json(409, failure("PREVIEW_IN_USE", "Keep the original preview tab open."));
					return;
				}
				const id = url.searchParams.get("client");
				if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid preview client.");
				response.writeHead(200, {
					"Content-Type": "text/event-stream",
					Connection: "keep-alive",
				});
				response.write(": connected\n\n");
				peer = { id, stream: response, tools: [] };
				const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 15_000);
				response.on("close", () => {
					clearInterval(heartbeat);
					if (peer?.stream === response) disconnect();
				});
				return;
			}
			if (request.method === "GET" && url.pathname === "/tools") {
				json(200, {
					ok: true,
					data: { connected: Boolean(peer?.tools.length), tools: peer?.tools ?? [] },
				});
				return;
			}
			if (request.method === "POST" && ["/ready", "/result"].includes(url.pathname)) {
				const body = await readJson(request);
				if (!peer || body.client !== peer.id) {
					json(409, failure("DISCONNECTED", "This is not the active preview."));
					return;
				}
				if (url.pathname === "/ready") {
					if (!Array.isArray(body.tools) || body.tools.length > 32)
						throw new Error("Invalid tool catalog.");
					peer.tools = body.tools;
				} else settle(body.id, body.output);
				json(200, { ok: true });
				return;
			}
			if (request.method === "POST" && url.pathname === "/call") {
				const body = await readJson(request);
				if (!peer?.tools.length) {
					json(409, failure("NOT_CONNECTED", "Open the session URL and wait for Connected."));
					return;
				}
				if (
					typeof body.name !== "string" ||
					!peer.tools.some((tool) => (tool as { name: string }).name === body.name) ||
					!body.params ||
					typeof body.params !== "object" ||
					Array.isArray(body.params)
				)
					throw new Error("Choose a discovered tool and supply an object for --params.");
				if (pending.size >= 8) {
					json(429, failure("BUSY", "Too many active calls. Wait for the current operation."));
					return;
				}
				const id = randomUUID();
				const timer = setTimeout(() => {
					send({ type: "cancel", id });
					settle(
						id,
						failure("TIMEOUT", "Call timed out. Inspect before retrying; it may have completed."),
					);
				}, options.timeout ?? 40_000);
				pending.set(id, { timer, finish: (output) => json(200, output) });
				response.on("close", () => {
					if (pending.has(id)) {
						send({ type: "cancel", id });
						settle(id, failure("CANCELLED", "Caller disconnected."));
					}
				});
				send({ type: "call", id, name: body.name, params: body.params });
				return;
			}
			if (request.method === "POST" && url.pathname === "/stop") {
				json(200, { ok: true, data: { stopped: true } });
				setImmediate(close);
				return;
			}
			json(404, failure("NOT_FOUND", "Unknown session endpoint."));
		} catch (error) {
			json(
				400,
				failure("INVALID_INPUT", error instanceof Error ? error.message : "Invalid request."),
			);
		}
	});
	server.requestTimeout = 15_000;
	server.headersTimeout = 10_000;
	function close() {
		send({ type: "closed" });
		disconnect();
		server.close();
		server.closeAllConnections();
	}
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(options.port ?? 0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") return reject(new Error("No local address."));
			origin = `http://127.0.0.1:${address.port}`;
			resolve();
		});
	});
	return { url: `${origin}/#${token}`, site, close, server };
}

export async function studioRequest(url: string, endpoint: string, body?: unknown) {
	const { origin, token } = sessionAddress(url);
	const response = await fetch(`${origin}${endpoint}`, {
		method: body === undefined ? "GET" : "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
		signal: AbortSignal.timeout(45_000),
	});
	return response.json();
}
