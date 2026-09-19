import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { appendFile, link, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
	type CommunityIntent,
	type CommunityReceipt,
	bundleImageBytes,
	createPublicationSecret,
	validateBadgeBundle,
} from "@crafter-station/badge-studio-design/community";
import sharp from "sharp";
import { z } from "zod";
import { CloudError, cloudRequest, connectAccount } from "./cloud";
import { InputError } from "./errors";
import { editorOrigin, studioRequest } from "./studio";

export async function readBundle(file: string) {
	const handle = await open(resolve(file), constants.O_RDONLY | constants.O_NOFOLLOW);
	try {
		const info = await handle.stat();
		if (!info.isFile() || info.size > 8_300_000)
			throw new InputError("Expected a complete .badge.json bundle below 8.3 MB.");
		const result = await validateBadgeBundle(JSON.parse(await handle.readFile("utf8")));
		for (const image of Object.values(result.bundle.images)) {
			if (!image) continue;
			const bytes = bundleImageBytes(image);
			const decoder = sharp(bytes, {
				limitInputPixels: 24_000_000,
				failOn: "warning",
			});
			const metadata = await decoder.metadata();
			if (
				!["png", "jpeg", "webp"].includes(metadata.format ?? "") ||
				image.mimeType !== `image/${metadata.format}` ||
				(metadata.pages ?? 1) > 1
			)
				throw new InputError("Use a static PNG, JPEG or WebP image with its actual MIME type.");
			if (metadata.format === "png") {
				const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
				for (let offset = 8; offset + 12 <= bytes.length; ) {
					const length = view.getUint32(offset);
					if (offset + length + 12 > bytes.length) break;
					if (String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)) === "acTL")
						throw new InputError("Use a static PNG; animated PNGs are not supported.");
					offset += length + 12;
				}
			}
			await decoder.resize(1, 1).raw().toBuffer();
		}
		return result;
	} catch (error) {
		throw new InputError(error instanceof Error ? error.message : "Invalid badge bundle.");
	} finally {
		await handle.close();
	}
}

export async function saveBundle(url: string, out: string) {
	const state = await studioRequest(url, "/call", {
		name: "badge_inspect",
		params: { section: "state" },
	});
	if (!state.ok)
		throw new CloudError(
			state.error?.code ?? "PREVIEW_UNAVAILABLE",
			state.error?.message ?? "Inspect the preview before saving.",
		);
	const result = await studioRequest(url, "/call", {
		name: "badge_bundle",
		params: { expectedRevision: state.data.revision },
	});
	if (!result.ok)
		throw new CloudError(
			result.error?.code ?? "SAVE_FAILED",
			result.error?.message ??
				"The editor could not export a bundle. Refresh it after saving the current draft.",
		);
	const { bundle, snapshotHash } = await validateBadgeBundle(result.data);
	const path = resolve(out);
	const file = await open(path, "wx", 0o600);
	try {
		await file.writeFile(`${JSON.stringify(bundle)}\n`);
		await file.sync();
	} finally {
		await file.close();
	}
	return {
		path,
		snapshotHash,
		name: bundle.snapshot.design.name,
		complete: true,
		published: false,
	};
}

const receiptSchema = z.object({
	id: z.string().uuid(),
	version: z.number().int().positive(),
	state: z.enum(["published", "withdrawn"]),
	url: z.string(),
});

function publicReceipt(input: unknown, site: string) {
	const receipt = receiptSchema.parse(input);
	if (
		receipt.url !== `/community/${receipt.id}` &&
		receipt.url !== `${site}/community/${receipt.id}`
	)
		throw new CloudError(
			"INVALID_RECEIPT",
			"The returned publication URL does not match its receipt.",
		);
	return { ...receipt, url: `${site}/community/${receipt.id}` };
}

type Operation = {
	ownerId: string;
	site: string;
	intent: CommunityIntent;
	secret: string;
	receipt?: CommunityReceipt;
};
type PublishOptions = {
	file: string;
	site?: string;
	yes?: boolean;
	dryRun?: boolean;
	status?: boolean;
	noOpen?: boolean;
	progress?: (data: unknown) => void;
};

function stateDirectory() {
	return resolve(process.env.BADGIO_STATE_DIR ?? join(homedir(), ".config", "badgio"));
}

async function writeOperation(path: string, value: Operation) {
	const temporary = `${path}.${randomUUID()}.tmp`;
	const handle = await open(temporary, "wx", 0o600);
	try {
		await handle.writeFile(JSON.stringify(value));
		await handle.sync();
		await handle.close();
		await rename(temporary, path);
	} finally {
		await handle.close().catch(() => {});
		await rm(temporary, { force: true });
	}
}

export async function publishBadge(options: PublishOptions) {
	const { bundle, snapshotHash } = await readBundle(options.file);
	const site = editorOrigin(options.site);
	const disclosure = {
		name: bundle.snapshot.design.name,
		participantName: bundle.snapshot.participant.name,
		shares: [
			"portrait",
			...(bundle.images.artwork ? ["artwork"] : []),
			"participant",
			"both faces",
			"editable design",
		],
		snapshotHash,
	};
	if (options.dryRun) return { dryRun: true, valid: true, published: false, ...disclosure };
	if (!options.status && !options.yes)
		throw new CloudError(
			"CONSENT_REQUIRED",
			"Ask whether to publish this badge. After approval, repeat with --yes. Use --dry-run to inspect what becomes public.",
		);
	if (!options.status && process.env.BADGIO_DISABLE_PUBLISH === "1")
		throw new CloudError("PUBLISH_DISABLED", "Publication is disabled by BADGIO_DISABLE_PUBLISH.");
	const { token, account } = await connectAccount(site, {
		login: !options.status,
		noOpen: options.noOpen,
		progress: options.progress,
	});
	const key = createHash("sha256").update(`${site}\0${snapshotHash}`).digest("hex");
	const directory = join(stateDirectory(), "publications");
	await mkdir(directory, { recursive: true, mode: 0o700 });
	const path = join(directory, `${key}.json`);
	let operation: Operation | undefined;
	try {
		operation = JSON.parse(await readFile(path, "utf8"));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	if (
		operation &&
		(operation.site !== site ||
			operation.ownerId !== account.id ||
			operation.intent.snapshotHash !== snapshotHash)
	)
		throw new CloudError(
			"OPERATION_CONFLICT",
			"The saved publication belongs to a different account or badge. Reconnect the original account to recover it; no new publication was created.",
		);
	if (options.status) {
		if (!operation) return { state: "local", published: false, ...disclosure };
		const status = await cloudRequest(site, `?operationId=${operation.intent.operationId}`, token);
		return {
			...status,
			...(status.receipt ? { receipt: publicReceipt(status.receipt, site) } : {}),
		};
	}
	if (!operation) {
		operation = {
			site,
			ownerId: account.id,
			secret: createPublicationSecret(),
			intent: {
				action: "create",
				operationId: randomUUID(),
				snapshotHash,
				title: bundle.snapshot.design.name,
				participantName: bundle.snapshot.participant.name,
			},
		};
		try {
			const temporary = `${path}.${randomUUID()}.tmp`;
			try {
				await writeOperation(temporary, operation);
				await link(temporary, path);
			} finally {
				await rm(temporary, { force: true });
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			throw new CloudError(
				"BUSY",
				"Another command is publishing this badge. Retry the same command to recover its result.",
			);
		}
	}
	const audit = (state: string) =>
		appendFile(
			join(dirname(path), "audit.jsonl"),
			`${JSON.stringify({
				at: new Date().toISOString(),
				state,
				operationId: operation.intent.operationId,
				snapshotHash,
			})}\n`,
			{ mode: 0o600 },
		);
	try {
		await audit("pending");
		options.progress?.({ state: "preparing", ...disclosure });
		const prepared = await cloudRequest(site, "", token, {
			action: "prepare",
			intent: operation.intent,
			secret: operation.secret,
			snapshot: bundle.snapshot,
			consent: true,
		});
		let receipt: unknown = prepared.receipt;
		if (!receipt) {
			const ready = z
				.object({
					operationId: z.literal(operation.intent.operationId),
					uploaded: z.array(z.enum(["portrait", "artwork"])),
				})
				.parse(prepared);
			for (const slot of ["portrait", "artwork"] as const) {
				const image = bundle.images[slot];
				if (!image || ready.uploaded.includes(slot)) continue;
				await cloudRequest(
					site,
					`/media/${slot}`,
					token,
					bundleImageBytes(image),
					operation.secret,
				);
				options.progress?.({ state: "uploaded", slot });
			}
			receipt = await cloudRequest(site, "", token, {
				action: "commit",
				operationId: operation.intent.operationId,
				snapshotHash,
				consent: true,
			});
		}
		const result = publicReceipt(receipt, site);
		await writeOperation(path, { ...operation, receipt: result });
		await audit(result.state);
		return { state: result.state, receipt: result, account: account.name };
	} catch (error) {
		await audit("pending_retry").catch(() => {});
		const recovered = await cloudRequest(
			site,
			`?operationId=${operation.intent.operationId}`,
			token,
		).catch(() => null);
		if (recovered?.receipt) {
			const result = publicReceipt(recovered.receipt, site);
			await writeOperation(path, { ...operation, receipt: result });
			await audit(result.state);
			return { state: result.state, receipt: result, account: account.name };
		}
		throw error;
	}
}
