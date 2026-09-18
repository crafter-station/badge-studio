import { expect, test } from "bun:test";
import { S3Client } from "@aws-sdk/client-s3";
import { CommunityStorage, communityObjectKey, createCommunityStorage } from "./community-storage";

function fixture(handler: (request: Request) => Response | Promise<Response>, timeoutMs = 1000) {
	const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: handler });
	const client = new S3Client({
		endpoint: server.url.href,
		region: "auto",
		forcePathStyle: true,
		credentials: { accessKeyId: "test-only", secretAccessKey: "test-only" },
		requestChecksumCalculation: "WHEN_REQUIRED",
		maxAttempts: 1,
	});
	return {
		storage: new CommunityStorage(client, "badge-studio-test", timeoutMs),
		close: () => {
			client.destroy();
			server.stop(true);
		},
	};
}

test("R2 credentials require an explicit bucket and account endpoint", () => {
	const env = {
		R2_ACCOUNT_ID: "a".repeat(32),
		R2_ACCESS_KEY_ID: "test-only",
		R2_SECRET_ACCESS_KEY: "test-only",
	};
	expect(() => createCommunityStorage(env)).toThrow("no está configurado");
	expect(() =>
		createCommunityStorage({ ...env, R2_BUCKET: "badge-studio", R2_ACCOUNT_ID: "other/host" }),
	).toThrow("no está configurado");
	expect(() => communityObjectKey("../other-project")).toThrow("inválido");
});

test("ambiguous PUT retries replace one private object; repeated deletion succeeds", async () => {
	const objects = new Map<string, Uint8Array>();
	const uploads: { path: string; headers: Headers; bytes: Uint8Array }[] = [];
	let failAfterWrite = true;
	const f = fixture(async (request) => {
		const path = new URL(request.url).pathname;
		if (request.method === "PUT") {
			const bytes = new Uint8Array(await request.arrayBuffer());
			uploads.push({ path, headers: request.headers, bytes });
			objects.set(path, bytes);
			if (failAfterWrite) {
				failAfterWrite = false;
				return new Response("<Error><Code>InternalError</Code></Error>", { status: 500 });
			}
			return new Response(null, { status: 200 });
		}
		if (request.method === "DELETE") {
			objects.delete(path);
			return new Response(null, { status: 204 });
		}
		const bytes = objects.get(path);
		return bytes
			? new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp" } })
			: new Response("<Error><Code>NoSuchKey</Code></Error>", { status: 404 });
	});
	try {
		const key = communityObjectKey("12345678-1234-4234-8234-123456789012");
		const bytes = new Uint8Array([82, 73, 70, 70, 10, 25, 0, 255]);
		await expect(f.storage.put(key, bytes)).rejects.toThrow();
		expect(objects.size).toBe(1);
		await f.storage.put(key, bytes);
		expect(objects.size).toBe(1);
		expect(uploads).toHaveLength(2);
		expect(uploads.map((upload) => upload.path)).toEqual([
			"/badge-studio-test/community/12345678-1234-4234-8234-123456789012.webp",
			"/badge-studio-test/community/12345678-1234-4234-8234-123456789012.webp",
		]);
		expect(
			uploads.every((upload) => upload.headers.get("cache-control") === "private, no-store"),
		).toBe(true);
		expect(uploads.every((upload) => upload.headers.get("content-type") === "image/webp")).toBe(
			true,
		);
		expect(uploads.every((upload) => !upload.headers.has("x-amz-acl"))).toBe(true);
		expect(await f.storage.get(key)).toEqual(bytes);
		await f.storage.delete(key);
		await f.storage.delete(key);
		expect(objects.size).toBe(0);
		await expect(f.storage.get(key)).rejects.toThrow();
	} finally {
		f.close();
	}
});

test("oversized upstream bytes are rejected even without Content-Length", async () => {
	const f = fixture(
		() =>
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(new Uint8Array(1_600_000));
						controller.enqueue(new Uint8Array(1_600_000));
						controller.close();
					},
				}),
			),
	);
	try {
		await expect(f.storage.get("oversized.webp")).rejects.toThrow("supera el límite");
		await expect(f.storage.put("oversized.webp", new Uint8Array(3_000_001))).rejects.toThrow(
			"3 MB",
		);
	} finally {
		f.close();
	}
});

test("a stalled object body is cancelled within the operation deadline", async () => {
	const f = fixture(
		() =>
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(new Uint8Array([1]));
					},
				}),
			),
		80,
	);
	try {
		const started = performance.now();
		await expect(f.storage.get("stalled.webp")).rejects.toThrow();
		expect(performance.now() - started).toBeLessThan(1000);
	} finally {
		f.close();
	}
});

test("a failed deletion is not reported as successful", async () => {
	const f = fixture(
		() => new Response("<Error><Code>AccessDenied</Code></Error>", { status: 403 }),
	);
	try {
		await expect(f.storage.delete("private.webp")).rejects.toThrow();
	} finally {
		f.close();
	}
});
