import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("CLI GET routes authenticated requests to identity even when an empty query flag is stripped", () => {
	const result = spawnSync(
		process.execPath,
		[
			"--eval",
			`
			import { mock } from "bun:test";
			import assert from "node:assert/strict";
			mock.module("@/lib/community-cli", () => ({
				cliConfiguration: () => ({ clientId: "public-client" }),
				cliActor: async (request) => {
					assert.equal(request.headers.get("authorization"), "Bearer test-token");
					return { ownerId: "user_test", authorName: "Test" };
				},
				cliPublicationStatus: async () => ({ state: "published" }),
				cliPublish: async () => null,
			}));
			mock.module("@/lib/community-server", () => ({
				communityResponse: async (_request, work) => Response.json(await work()),
			}));
			const { GET } = await import("./src/app/api/community/cli/route.ts");
			const request = (query, authenticated = false) => new Request(
				"https://badge-studio.crafter.run/api/community/cli" + query,
				{ headers: authenticated ? { Authorization: "Bearer test-token" } : {} },
			);
			assert.deepEqual(await (await GET(request(""))).json(), { clientId: "public-client" });
			for (const query of ["", "?account", "?account=1"])
				assert.deepEqual(await (await GET(request(query, true))).json(), { id: "user_test", name: "Test" });
			assert.deepEqual(await (await GET(request("?operationId=test", true))).json(), { state: "published" });
			`,
		],
		{ cwd: new URL("../../", import.meta.url), encoding: "utf8", timeout: 10_000 },
	);
	expect(result.status, result.stderr).toBe(0);
});
