import { z } from "zod";
import { InputError } from "./errors";
import { editorOrigin, openBrowser } from "./studio";

export class CloudError extends InputError {
	constructor(
		public code: string,
		message: string,
		public status = 0,
	) {
		super(message);
	}
}

const credentialsSchema = z.object({
	accessToken: z.string().min(1),
	refreshToken: z.string().optional(),
	expiresAt: z.number(),
	clientId: z.string(),
});
type Credentials = z.infer<typeof credentialsSchema>;
export type CredentialStore = {
	get(): Promise<string | undefined>;
	set(value: string, expected?: string): Promise<void>;
	delete(expected?: string): Promise<void>;
};

export function coordinatedCredentials(
	store: CredentialStore,
	site: string,
	directory = join(homedir(), ".config", "badgio", "credential-locks"),
): CredentialStore {
	async function mutate(work: () => Promise<void>) {
		await mkdir(directory, { recursive: true, mode: 0o700 });
		const path = join(directory, createHash("sha256").update(editorOrigin(site)).digest("hex"));
		const release = await lock(path, {
			realpath: false,
			stale: 30_000,
			update: 5000,
			retries: { retries: 60, minTimeout: 250, maxTimeout: 250 },
		});
		try {
			await work();
		} finally {
			await release();
		}
	}
	return {
		get: () => store.get(),
		set: (value, expected) =>
			mutate(async () => {
				if (expected !== undefined && (await store.get()) !== expected)
					throw new CloudError(
						"ACCOUNT_CHANGED",
						"The login changed during refresh. Retry with the current account.",
					);
				await store.set(value);
			}),
		delete: (expected) =>
			mutate(async () => {
				if (expected !== undefined && (await store.get()) !== expected)
					throw new CloudError(
						"ACCOUNT_CHANGED",
						"The previous login was revoked. A newer login was preserved; run logout again to disconnect it.",
					);
				await store.delete();
			}),
	};
}

export async function credentialStore(site: string): Promise<CredentialStore> {
	try {
		const { AsyncEntry } = await import("@napi-rs/keyring");
		const entry = new AsyncEntry("badgio", editorOrigin(site));
		return coordinatedCredentials(
			{
				get: () => entry.getPassword(AbortSignal.timeout(15_000)),
				set: (value) => entry.setPassword(value, AbortSignal.timeout(15_000)),
				delete: async () => {
					await entry.deleteCredential(AbortSignal.timeout(15_000));
				},
			},
			site,
		);
	} catch {
		throw new CloudError(
			"KEYCHAIN_UNAVAILABLE",
			"The OS credential store is unavailable. Use BADGIO_TOKEN in a headless environment.",
		);
	}
}

export async function responseJson(response: Response) {
	const value = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message =
			typeof value.error === "string"
				? value.error
				: "The publication service is unavailable. Retry the same bundle.";
		throw new CloudError(
			message.match(/^([A-Z_]+):/)?.[1] ?? "REQUEST_FAILED",
			message,
			response.status,
		);
	}
	return value;
}

export async function cloudRequest(
	site: string,
	path: string,
	token?: string,
	body?: unknown,
	operation?: string,
) {
	return responseJson(
		await fetch(`${editorOrigin(site)}/api/community/cli${path}`, {
			method: body === undefined ? "GET" : "POST",
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...(body instanceof Uint8Array
					? { "Content-Type": "application/octet-stream" }
					: body !== undefined
						? { "Content-Type": "application/json" }
						: {}),
				...(operation ? { "X-Badge-Operation": operation } : {}),
			},
			body:
				body instanceof Uint8Array
					? new Blob([new Uint8Array(body).buffer])
					: body === undefined
						? undefined
						: JSON.stringify(body),
			redirect: "error",
			signal: AbortSignal.timeout(65_000),
		}),
	);
}

export async function oauthConfiguration(site: string) {
	const config = z
		.object({
			clientId: z.string().min(1),
			issuer: z.string().url(),
			scopes: z.literal("profile offline_access"),
		})
		.parse(await cloudRequest(site, ""));
	const issuer = new URL(config.issuer);
	if (
		issuer.protocol !== "https:" ||
		issuer.username ||
		issuer.password ||
		issuer.pathname !== "/" ||
		issuer.search ||
		issuer.hash ||
		(issuer.hostname !== "clerk.badge-studio.crafter.run" &&
			!(
				editorOrigin(site).startsWith("http://") && issuer.hostname.endsWith(".clerk.accounts.dev")
			))
	)
		throw new CloudError(
			"INVALID_AUTHORITY",
			"The login authority is not a Badge Studio Clerk instance.",
		);
	const discovery = await responseJson(
		await fetch(`${issuer.origin}/.well-known/openid-configuration`, {
			redirect: "error",
			signal: AbortSignal.timeout(15_000),
		}),
	);
	const endpoints = z
		.object({
			device_authorization_endpoint: z.string().url(),
			token_endpoint: z.string().url(),
			revocation_endpoint: z.string().url(),
		})
		.parse(discovery);
	for (const endpoint of Object.values(endpoints))
		if (new URL(endpoint).origin !== issuer.origin)
			throw new CloudError("INVALID_AUTHORITY", "An authentication endpoint changed origin.");
	return { ...config, ...endpoints };
}
type OAuthConfiguration = Awaited<ReturnType<typeof oauthConfiguration>>;

async function oauthRequest(url: string, values: Record<string, string>) {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(values),
		redirect: "error",
		signal: AbortSignal.timeout(15_000),
	});
	const data = await response.json().catch(() => ({}));
	return { ok: response.ok, data };
}

function tokenCredentials(data: unknown, clientId: string, previous?: Credentials): Credentials {
	const value = z
		.object({
			access_token: z.string().min(1),
			token_type: z.string().refine((type) => type.toLowerCase() === "bearer"),
			expires_in: z.number().positive(),
			refresh_token: z.string().optional(),
		})
		.parse(data);
	return {
		accessToken: value.access_token,
		refreshToken: value.refresh_token ?? previous?.refreshToken,
		expiresAt: Date.now() + value.expires_in * 1000,
		clientId,
	};
}

export async function deviceLogin(
	config: OAuthConfiguration,
	store: CredentialStore,
	options: {
		noOpen?: boolean;
		progress?: (data: unknown) => void;
		sleep?: (ms: number) => Promise<void>;
		timeout?: number;
	} = {},
) {
	const start = await oauthRequest(config.device_authorization_endpoint, {
		client_id: config.clientId,
		scope: config.scopes,
	});
	if (!start.ok) throw new CloudError("LOGIN_UNAVAILABLE", "Clerk could not start device login.");
	const device = z
		.object({
			device_code: z.string().min(1),
			user_code: z.string().min(1),
			verification_uri: z.string().url(),
			verification_uri_complete: z.string().url().optional(),
			expires_in: z.number().positive(),
			interval: z.number().positive().default(5),
		})
		.parse(start.data);
	const url = device.verification_uri_complete ?? device.verification_uri;
	const verification = new URL(url);
	const issuer = new URL(config.issuer);
	const allowedHost =
		issuer.hostname === "clerk.badge-studio.crafter.run"
			? "accounts.badge-studio.crafter.run"
			: issuer.hostname.replace(".clerk.accounts.dev", ".accounts.dev");
	if (
		verification.protocol !== "https:" ||
		verification.username ||
		verification.password ||
		![issuer.hostname, allowedHost].includes(verification.hostname)
	)
		throw new CloudError("INVALID_AUTHORITY", "The device verification page changed origin.");
	options.progress?.({
		state: "authorization_required",
		url,
		code: device.user_code,
		message: "Sign in once to connect badgio. Publication continues automatically.",
	});
	if (!options.noOpen)
		await openBrowser(url).catch(() => {
			options.progress?.({ state: "open_browser", url, code: device.user_code });
		});
	const deadline = Date.now() + Math.min(device.expires_in * 1000, options.timeout ?? 180_000);
	let interval = Math.max(device.interval * 1000, 1000);
	while (Date.now() < deadline) {
		await (options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(interval);
		if (Date.now() >= deadline) break;
		const response = await oauthRequest(config.token_endpoint, {
			client_id: config.clientId,
			device_code: device.device_code,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		});
		if (response.ok) {
			const credentials = tokenCredentials(response.data, config.clientId);
			await store.set(JSON.stringify(credentials));
			return credentials.accessToken;
		}
		if (response.data.error === "authorization_pending") continue;
		if (response.data.error === "slow_down") {
			interval += 5000;
			continue;
		}
		throw new CloudError(
			"LOGIN_REQUIRED",
			"Device login was denied or expired. Run badgio login to try again.",
		);
	}
	throw new CloudError(
		"LOGIN_REQUIRED",
		"Login timed out. Your badge is still saved. Run the same command to reconnect.",
	);
}

export async function accessToken(
	site: string,
	options: {
		login?: boolean;
		noOpen?: boolean;
		progress?: (data: unknown) => void;
		store?: CredentialStore;
	} = {},
) {
	if (process.env.BADGIO_TOKEN) return process.env.BADGIO_TOKEN;
	const config = await oauthConfiguration(site);
	const store = options.store ?? (await credentialStore(site));
	const saved = await store.get();
	let credentials = saved ? credentialsSchema.parse(JSON.parse(saved)) : undefined;
	if (credentials?.clientId !== config.clientId) credentials = undefined;
	if (credentials && credentials.expiresAt > Date.now() + 60_000) return credentials.accessToken;
	if (credentials?.refreshToken) {
		const response = await oauthRequest(config.token_endpoint, {
			client_id: config.clientId,
			grant_type: "refresh_token",
			refresh_token: credentials.refreshToken,
		});
		if (response.ok) {
			credentials = tokenCredentials(response.data, config.clientId, credentials);
			await store.set(JSON.stringify(credentials), saved);
			return credentials.accessToken;
		}
		if (response.data.error !== "invalid_grant")
			throw new CloudError(
				"LOGIN_UNAVAILABLE",
				"Token refresh is temporarily unavailable. Retry the same command.",
			);
	}
	if (!options.login)
		throw new CloudError("LOGIN_REQUIRED", "Run badgio login to connect your account.");
	return deviceLogin(config, store, options);
}

export async function connectAccount(
	site: string,
	options: {
		login?: boolean;
		noOpen?: boolean;
		progress?: (data: unknown) => void;
		store?: CredentialStore;
	} = {},
) {
	let token = await accessToken(site, options);
	let account: unknown;
	try {
		account = await cloudRequest(site, "?account", token);
	} catch (error) {
		if (
			!(error instanceof CloudError) ||
			error.status !== 401 ||
			!options.login ||
			process.env.BADGIO_TOKEN
		)
			throw error;
		token = await deviceLogin(
			await oauthConfiguration(site),
			options.store ?? (await credentialStore(site)),
			options,
		);
		account = await cloudRequest(site, "?account", token);
	}
	return {
		token,
		account: z.object({ id: z.string().startsWith("user_"), name: z.string() }).parse(account),
	};
}

export async function logout(site: string, providedStore?: CredentialStore) {
	if (process.env.BADGIO_TOKEN)
		throw new CloudError(
			"ENV_TOKEN",
			"BADGIO_TOKEN is supplied by the environment. Revoke it at its source and remove it from the environment.",
		);
	const store = providedStore ?? (await credentialStore(site));
	const saved = await store.get();
	if (!saved) return { loggedOut: true };
	const credentials = credentialsSchema.parse(JSON.parse(saved));
	const config = await oauthConfiguration(site);
	const responses = await Promise.all(
		[credentials.accessToken, credentials.refreshToken]
			.filter((token) => token)
			.map((token) =>
				fetch(config.revocation_endpoint, {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({ client_id: credentials.clientId, token: token as string }),
					redirect: "error",
					signal: AbortSignal.timeout(15_000),
				}),
			),
	);
	if (responses.some((response) => !response.ok))
		throw new CloudError(
			"LOGOUT_FAILED",
			"Could not revoke the login. Credentials were retained so you can retry logout.",
		);
	await store.delete(saved);
	return { loggedOut: true };
}
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { lock } from "proper-lockfile";
