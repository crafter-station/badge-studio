export type PageTool = {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
	execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<string>;
};

export type PageModelContext = {
	registerTool: (tool: PageTool, options: { signal: AbortSignal }) => Promise<void>;
};

export async function registerPageTools(
	context: PageModelContext,
	tools: PageTool[],
	signal: AbortSignal,
) {
	const results = await Promise.allSettled(
		tools.map((tool) => context.registerTool(tool, { signal })),
	);
	if (results.some((result) => result.status === "rejected"))
		throw new Error("The browser could not register the editor tools.");
}
