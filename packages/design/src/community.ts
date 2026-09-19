import { z } from "zod";
import { badgeDesignSchema, isRoleBoundLayer } from "./badge-design";
import { badgeQrLayout } from "./qr";

export const COMMUNITY_IMAGE_LIMIT = 3_000_000;
export const COMMUNITY_JSON_LIMIT = 256_000;
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const secretSchema = z.string().regex(/^\d{13}\.[a-f0-9]{64}$/);
export const publicationKeySchema = secretSchema;
export const COMMUNITY_PREPARATION_TTL = 60 * 60 * 1000;

export function createPublicationSecret(now = Date.now()) {
	const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return `${now + COMMUNITY_PREPARATION_TTL}.${random}`;
}

export function publicationKey(secret: string, digest: string) {
	return `${secretSchema.parse(secret).split(".")[0]}.${digestSchema.parse(digest)}`;
}

export function publicationExpiry(key: string) {
	return Number(publicationKeySchema.parse(key).split(".")[0]);
}
export const communityParticipantSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		role: z.string().max(100),
		organization: z.string().max(100),
		number: z.number().int().min(1).max(999999),
		eventName: z.string().min(1).max(80),
		publicUrl: z
			.string()
			.url()
			.max(512)
			.refine((value) => ["https:", "http:"].includes(new URL(value).protocol)),
		signature: z.object({ seed: z.number().int().min(0).max(4294967295), version: z.literal(1) }),
		metadata: z
			.object({
				roleLabel: z.string().max(100).default(""),
				eventName: z.string().max(80).default(""),
				eventDate: z.string().max(100).default(""),
				location: z.string().max(100).default(""),
				website: z.string().max(200).default(""),
				bio: z.string().max(600).default(""),
			})
			.strict(),
	})
	.strict();

export const communitySnapshotSchema = z
	.object({
		format: z.literal(1),
		design: badgeDesignSchema,
		participant: communityParticipantSchema,
		images: z.object({ portrait: digestSchema, artwork: digestSchema.nullable() }).strict(),
	})
	.strict()
	.superRefine(({ design, images, participant }, context) => {
		const visible = (layer: { visible?: boolean; opacity?: number }) =>
			layer.visible !== false && (layer.opacity ?? 1) > 0;
		for (const side of ["front", "back"] as const) {
			if (
				!design[side].layers.some(
					(layer) => visible(layer) && layer.kind === "text" && layer.binding === "name",
				)
			)
				context.addIssue({ code: "custom", message: `El nombre debe verse en ${side}.` });
		}
		if (!design.front.layers.some((layer) => visible(layer) && layer.kind === "portrait"))
			context.addIssue({ code: "custom", message: "El retrato debe ser visible." });
		if (!design.back.layers.some((layer) => visible(layer) && isRoleBoundLayer(layer)))
			context.addIssue({ code: "custom", message: "El rol debe ser visible." });
		if (!design.back.layers.some((layer) => visible(layer) && layer.kind === "qr"))
			context.addIssue({ code: "custom", message: "El QR debe ser visible." });
		for (const layer of [...design.front.layers, ...design.back.layers]) {
			if (!visible(layer) || layer.kind !== "qr") continue;
			try {
				badgeQrLayout(participant.publicUrl, layer.w, layer.maxCellSize);
			} catch (reason) {
				context.addIssue({ code: "custom", message: (reason as Error).message });
			}
		}
		if (
			Boolean(design.artwork) !== Boolean(images.artwork) ||
			([...design.front.layers, ...design.back.layers].some(
				(layer) => visible(layer) && layer.kind === "image",
			) &&
				!images.artwork)
		)
			context.addIssue({ code: "custom", message: "Falta la ilustración de este diseño." });
	});

const intentBase = {
	operationId: z.string().uuid(),
	snapshotHash: digestSchema,
	title: z.string().min(1).max(60),
	participantName: z.string().min(1).max(80),
};
export const communityIntentSchema = z.discriminatedUnion("action", [
	z.object({ ...intentBase, action: z.literal("create") }).strict(),
	z
		.object({
			...intentBase,
			action: z.literal("update"),
			publicationId: z.string().uuid(),
			expectedVersion: z.number().int().positive(),
		})
		.strict(),
	z
		.object({
			...intentBase,
			action: z.literal("withdraw"),
			publicationId: z.string().uuid(),
			expectedVersion: z.number().int().positive(),
		})
		.strict(),
]);

export type CommunitySnapshot = z.infer<typeof communitySnapshotSchema>;
export type CommunityIntent = z.infer<typeof communityIntentSchema>;
export type CommunityReceipt = {
	id: string;
	version: number;
	state: "published" | "withdrawn";
	url: string;
};
export type CommunityPublication = CommunityReceipt & {
	snapshot: CommunitySnapshot;
	authorName: string;
	createdAt: string;
	updatedAt: string;
	images: { portrait: string; artwork: string | null };
};
export type CommunityStatus = {
	state:
		| "needs_authorization"
		| "preparing"
		| "review"
		| "authorized"
		| "expired"
		| "cancelled"
		| "published"
		| "withdrawn";
	authorName?: string;
	receipt?: CommunityReceipt;
};
export type CommunityReview = {
	intent: CommunityIntent;
	authorName: string;
	publication: CommunityPublication | null;
	ready: boolean;
	receipt: CommunityReceipt | null;
};

export function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_, item) =>
		item && typeof item === "object" && !Array.isArray(item)
			? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: item,
	);
}

export async function communityDigest(value: string | Blob) {
	const bytes =
		typeof value === "string" ? new TextEncoder().encode(value) : await value.arrayBuffer();
	return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

const bundleImageSchema = z
	.object({
		mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
		base64: z
			.string()
			.min(4)
			.max(4_000_000)
			.regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
	})
	.strict();

export const badgeBundleSchema = z
	.object({
		format: z.literal("badge-studio-bundle"),
		version: z.literal(1),
		snapshot: communitySnapshotSchema,
		images: z
			.object({
				portrait: bundleImageSchema,
				artwork: bundleImageSchema.nullable(),
			})
			.strict(),
	})
	.strict();

export type BadgeBundle = z.infer<typeof badgeBundleSchema>;

export function bundleImageBytes(image: BadgeBundle["images"]["portrait"]) {
	return Uint8Array.from(atob(image.base64), (character) => character.charCodeAt(0));
}

export async function validateBadgeBundle(input: unknown) {
	const bundle = badgeBundleSchema.parse(input);
	const serialized = canonicalJson(bundle.snapshot);
	if (new TextEncoder().encode(serialized).length > COMMUNITY_JSON_LIMIT)
		throw new Error("The badge exceeds the 256 KB publication limit.");
	for (const slot of ["portrait", "artwork"] as const) {
		const image = bundle.images[slot];
		if (!image && !bundle.snapshot.images[slot]) continue;
		if (!image) throw new Error(`Missing ${slot} image.`);
		const bytes = bundleImageBytes(image);
		if (!bytes.length || bytes.length > COMMUNITY_IMAGE_LIMIT)
			throw new Error(`The ${slot} exceeds the 3 MB publication limit.`);
		const digest = await communityDigest(new Blob([bytes]));
		if (digest !== bundle.snapshot.images[slot])
			throw new Error(`The ${slot} does not match the saved badge.`);
	}
	return { bundle, snapshotHash: await communityDigest(serialized) };
}
