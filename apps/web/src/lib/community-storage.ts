import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { CommunityError } from "./community-store";

export const COMMUNITY_OBJECT_LIMIT = 3_000_000;

export function communityObjectKey(id: string) {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
		throw new CommunityError("Identificador de imagen inválido.");
	return `community/${id}.webp`;
}

export class CommunityStorage {
	constructor(
		private client: S3Client,
		private bucket: string,
		private timeoutMs = 25_000,
	) {}

	async put(key: string, bytes: Uint8Array) {
		if (!bytes.length || bytes.length > COMMUNITY_OBJECT_LIMIT)
			throw new CommunityError("Reduce la imagen a menos de 3 MB.");
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: bytes,
				ContentType: "image/webp",
				ContentLength: bytes.length,
				CacheControl: "private, no-store",
			}),
			{ abortSignal: AbortSignal.timeout(this.timeoutMs) },
		);
	}

	async get(key: string) {
		const signal = AbortSignal.timeout(this.timeoutMs);
		const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
			abortSignal: signal,
		});
		const body = result.Body;
		if (!body) throw new CommunityError("La imagen no está disponible.", 503);
		const reader = body.transformToWebStream().getReader();
		const abort = () => void reader.cancel(signal.reason).catch(() => {});
		signal.addEventListener("abort", abort, { once: true });
		const chunks: Uint8Array[] = [];
		let length = 0;
		try {
			if ((result.ContentLength ?? 0) > COMMUNITY_OBJECT_LIMIT)
				throw new CommunityError("La imagen almacenada supera el límite.", 503);
			while (true) {
				signal.throwIfAborted();
				const { done, value } = await reader.read();
				signal.throwIfAborted();
				if (done) break;
				length += value.length;
				if (length > COMMUNITY_OBJECT_LIMIT)
					throw new CommunityError("La imagen almacenada supera el límite.", 503);
				chunks.push(value);
			}
		} finally {
			signal.removeEventListener("abort", abort);
			await reader.cancel().catch(() => {});
			reader.releaseLock();
		}
		const bytes = new Uint8Array(length);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.length;
		}
		return bytes;
	}

	async delete(key: string, signal?: AbortSignal) {
		await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
			abortSignal: signal
				? AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)])
				: AbortSignal.timeout(this.timeoutMs),
		});
	}
}

export function createCommunityStorage(env: Record<string, string | undefined> = process.env) {
	const accountId = env.R2_ACCOUNT_ID;
	const accessKeyId = env.R2_ACCESS_KEY_ID;
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
	const bucket = env.R2_BUCKET;
	if (
		!accountId ||
		!/^[a-f0-9]{32}$/.test(accountId) ||
		!accessKeyId ||
		!secretAccessKey ||
		!bucket
	)
		throw new CommunityError("El almacenamiento de imágenes todavía no está configurado.", 503);
	return new CommunityStorage(
		new S3Client({
			region: "auto",
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: { accessKeyId, secretAccessKey },
			requestChecksumCalculation: "WHEN_REQUIRED",
			maxAttempts: 2,
		}),
		bucket,
	);
}

let sharedStorage: CommunityStorage | undefined;

export function communityStorage() {
	sharedStorage ??= createCommunityStorage();
	return sharedStorage;
}
