import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type CredentialStore,
	connectAccount,
	coordinatedCredentials,
	deviceLogin,
	logout,
} from "./cloud";

const originalFetch = globalThis.fetch;
const originalToken = process.env.BADGIO_TOKEN;
afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalToken === undefined) Reflect.deleteProperty(process.env, "BADGIO_TOKEN");
	else process.env.BADGIO_TOKEN = originalToken;
});
const config = {
	clientId: "test-client",
	issuer: "https://clerk.badge-studio.crafter.run",
	scopes: "profile offline_access" as const,
	device_authorization_endpoint:
		"https://clerk.badge-studio.crafter.run/oauth/device_authorization",
	token_endpoint: "https://clerk.badge-studio.crafter.run/oauth/token",
	revocation_endpoint: "https://clerk.badge-studio.crafter.run/oauth/token/revoke",
};

test("device login polls pending and slow_down, stores tokens privately and exposes only the verification link", async () => {
	let saved: string | undefined;
	const store: CredentialStore = {
		get: async () => saved,
		set: async (value) => {
			saved = value;
		},
		delete: async () => {
			saved = undefined;
		},
	};
	const progress: unknown[] = [];
	const sleeps: number[] = [];
	let polls = 0;
	globalThis.fetch = (async (
		url: Parameters<typeof fetch>[0],
		options?: Parameters<typeof fetch>[1],
	) => {
		if (String(url).includes("device_authorization"))
			return Response.json({
				device_code: "secret-device-code",
				user_code: "ABCD-EFGH",
				verification_uri: "https://accounts.badge-studio.crafter.run/oauth/device",
				expires_in: 600,
				interval: 1,
			});
		expect(String(options?.body)).toContain("device_code=secret-device-code");
		polls++;
		if (polls < 3)
			return Response.json(
				{ error: polls === 1 ? "authorization_pending" : "slow_down" },
				{ status: 400 },
			);
		return Response.json({
			access_token: "private-access",
			refresh_token: "private-refresh",
			token_type: "Bearer",
			expires_in: 3600,
		});
	}) as unknown as typeof fetch;
	const token = await deviceLogin(config, store, {
		noOpen: true,
		progress: (value) => progress.push(value),
		sleep: async (ms) => {
			sleeps.push(ms);
		},
	});
	expect(token).toBe("private-access");
	expect(JSON.parse(saved ?? "{}")).toMatchObject({
		refreshToken: "private-refresh",
		clientId: config.clientId,
	});
	expect(sleeps).toEqual([1000, 1000, 6000]);
	expect(JSON.stringify(progress)).not.toMatch(/private-access|private-refresh|secret-device-code/);
});

test("device login rejects a foreign verification page before opening it or polling", async () => {
	globalThis.fetch = (async () =>
		Response.json({
			device_code: "secret",
			user_code: "ABCD",
			verification_uri: "https://attacker.example/login",
			expires_in: 600,
		})) as unknown as typeof fetch;
	const store: CredentialStore = {
		get: async () => undefined,
		set: async () => {
			throw new Error("must not save");
		},
		delete: async () => {},
	};
	await expect(deviceLogin(config, store, { noOpen: true })).rejects.toMatchObject({
		code: "INVALID_AUTHORITY",
	});
});

test("denied authorization ends without saving a credential or publishing", async () => {
	let calls = 0;
	globalThis.fetch = (async () => {
		calls++;
		return calls === 1
			? Response.json({
					device_code: "secret",
					user_code: "ABCD",
					verification_uri: "https://accounts.badge-studio.crafter.run/oauth/device",
					expires_in: 600,
				})
			: Response.json({ error: "access_denied" }, { status: 400 });
	}) as unknown as typeof fetch;
	const store: CredentialStore = {
		get: async () => undefined,
		set: async () => {
			throw new Error("must not save");
		},
		delete: async () => {},
	};
	await expect(
		deviceLogin(config, store, { noOpen: true, sleep: async () => {} }),
	).rejects.toMatchObject({ code: "LOGIN_REQUIRED" });
	expect(calls).toBe(2);
});

test("a revoked cached login reconnects once and verifies the new account", async () => {
	Reflect.deleteProperty(process.env, "BADGIO_TOKEN");
	let saved = JSON.stringify({
		accessToken: "revoked",
		clientId: config.clientId,
		expiresAt: Date.now() + 3600_000,
	});
	const store: CredentialStore = {
		get: async () => saved,
		set: async (value) => {
			saved = value;
		},
		delete: async () => {},
	};
	const verified: string[] = [];
	let logins = 0;
	globalThis.fetch = (async (
		url: Parameters<typeof fetch>[0],
		options?: Parameters<typeof fetch>[1],
	) => {
		const address = String(url);
		if (address.endsWith("/api/community/cli")) return Response.json(config);
		if (address.endsWith("/.well-known/openid-configuration")) return Response.json(config);
		if (address.includes("?account")) {
			const bearer = new Headers(options?.headers).get("authorization") ?? "";
			verified.push(bearer);
			return bearer === "Bearer revoked"
				? Response.json({ error: "LOGIN_REQUIRED: revoked" }, { status: 401 })
				: Response.json({ id: "user_reconnected", name: "Maker" });
		}
		if (address.includes("device_authorization")) {
			logins++;
			return Response.json({
				device_code: "private-code",
				user_code: "ABCD",
				verification_uri: "https://accounts.badge-studio.crafter.run/oauth/device",
				expires_in: 600,
				interval: 1,
			});
		}
		if (address.endsWith("/oauth/token"))
			return Response.json({
				access_token: "new-access",
				refresh_token: "new-refresh",
				token_type: "Bearer",
				expires_in: 3600,
			});
		throw new Error(`Unexpected request: ${address}`);
	}) as unknown as typeof fetch;
	const result = await connectAccount("https://badge-studio.crafter.run", {
		login: true,
		noOpen: true,
		store,
	});
	expect(result.account.id).toBe("user_reconnected");
	expect(verified).toEqual(["Bearer revoked", "Bearer new-access"]);
	expect(logins).toBe(1);
	expect(JSON.parse(saved).accessToken).toBe("new-access");
	await connectAccount("https://badge-studio.crafter.run", { login: true, store });
	expect(logins).toBe(1);
});

test("logout revokes both tokens and preserves a login completed during revocation", async () => {
	Reflect.deleteProperty(process.env, "BADGIO_TOKEN");
	const directory = await mkdtemp(join(tmpdir(), "badgio-credentials-"));
	let value: string | undefined = JSON.stringify({
		accessToken: "previous-access",
		refreshToken: "previous-refresh",
		clientId: config.clientId,
		expiresAt: Date.now() + 3600_000,
	});
	const site = "https://badge-studio.crafter.run";
	const underlying: CredentialStore = {
		get: async () => value,
		set: async (saved) => {
			value = saved;
		},
		delete: async () => {
			value = undefined;
		},
	};
	const store = coordinatedCredentials(underlying, site, directory);
	const concurrentLogin = coordinatedCredentials(underlying, site, directory);
	const revoked: string[] = [];
	globalThis.fetch = (async (
		url: Parameters<typeof fetch>[0],
		options?: Parameters<typeof fetch>[1],
	) => {
		if (String(url) === config.revocation_endpoint) {
			revoked.push(new URLSearchParams(String(options?.body)).get("token") ?? "");
			await concurrentLogin.set("new-login");
			return new Response(null, { status: 200 });
		}
		return Response.json(config);
	}) as unknown as typeof fetch;
	try {
		await expect(logout(site, store)).rejects.toMatchObject({ code: "ACCOUNT_CHANGED" });
		expect(value).toBe("new-login");
		expect(revoked.sort()).toEqual(["previous-access", "previous-refresh"]);
		await expect(store.set("stale-refresh", "previous-login")).rejects.toMatchObject({
			code: "ACCOUNT_CHANGED",
		});
		expect(value).toBe("new-login");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
