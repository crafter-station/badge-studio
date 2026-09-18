import type { PageTool } from "./webmcp";

export function previewConnection(hash: string) {
	const params = new URLSearchParams(hash.replace(/^#/, ""));
	const token = params.get("badgio");
	const origin = params.get("parent");
	if (!token || !/^[a-f0-9]{64}$/.test(token) || !origin) return null;
	try {
		const url = new URL(origin);
		if (
			url.protocol !== "http:" ||
			url.hostname !== "127.0.0.1" ||
			!url.port ||
			url.origin !== origin
		)
			return null;
		return { token, origin };
	} catch {
		return null;
	}
}

export function registerPreviewTools(tools: PageTool[], signal: AbortSignal) {
	const connection = previewConnection(window.location.hash);
	if (!connection || window.parent === window) return false;
	const { token, origin } = connection;
	const calls = new Map<string, AbortController>();
	const post = (message: Record<string, unknown>) =>
		window.parent.postMessage({ channel: "badgio", token, ...message }, origin);
	const announce = () =>
		post({ type: "ready", tools: tools.map(({ execute, ...metadata }) => metadata) });
	const cancelAll = () => {
		for (const controller of calls.values()) controller.abort();
	};
	window.addEventListener(
		"message",
		async (event) => {
			const message = event.data;
			if (
				event.source !== window.parent ||
				event.origin !== origin ||
				message?.channel !== "badgio" ||
				message.token !== token
			)
				return;
			if (message.type === "discover") announce();
			if (message.type === "cancel-all") cancelAll();
			if (message.type === "cancel") calls.get(message.id)?.abort();
			if (message.type !== "call") return;
			if (typeof message.id !== "string" || message.id.length > 100 || calls.has(message.id))
				return;
			const tool = tools.find((tool) => tool.name === message.name);
			if (!tool || calls.size >= 8) {
				post({
					type: "result",
					id: message.id,
					output: {
						ok: false,
						error: { code: "UNAVAILABLE", message: "Tool unavailable or busy." },
					},
				});
				return;
			}
			const controller = new AbortController();
			calls.set(message.id, controller);
			try {
				const output = await tool.execute(message.params, {
					signal: AbortSignal.any([signal, controller.signal]),
				});
				post({ type: "result", id: message.id, output: JSON.parse(output) });
			} catch {
				post({
					type: "result",
					id: message.id,
					output: {
						ok: false,
						error: { code: "FAILED", message: "Inspect before retrying this call." },
					},
				});
			} finally {
				calls.delete(message.id);
			}
		},
		{ signal },
	);
	signal.addEventListener("abort", cancelAll, { once: true });
	announce();
	return true;
}
