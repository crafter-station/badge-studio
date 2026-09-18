import { expect, test } from "bun:test";
import { type PageTool, registerPageTools } from "./webmcp";

test("native tool registrations share the abort signal and await every browser result", async () => {
	const abort = new AbortController();
	const recorded: string[] = [];
	const tools = ["inspect", "edit"].map((name) => ({ name }) as PageTool);
	await registerPageTools(
		{
			async registerTool(tool, options) {
				expect(options.signal).toBe(abort.signal);
				recorded.push(tool.name);
				options.signal.addEventListener("abort", () => recorded.push(`removed:${tool.name}`));
			},
		},
		tools,
		abort.signal,
	);
	expect(recorded).toEqual(["inspect", "edit"]);
	abort.abort();
	expect(recorded).toEqual(["inspect", "edit", "removed:inspect", "removed:edit"]);
});

test("a rejected native registration cannot report that WebMCP is ready", async () => {
	await expect(
		registerPageTools(
			{
				async registerTool(tool) {
					if (tool.name === "edit") throw new Error("Permission denied");
				},
			},
			["inspect", "edit"].map((name) => ({ name }) as PageTool),
			new AbortController().signal,
		),
	).rejects.toThrow();
});
