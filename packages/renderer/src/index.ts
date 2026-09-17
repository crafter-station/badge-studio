"use client";

export { PrismBadge } from "./prism-badge";
export { cropRectangle, defaultPrismAppearance, normalizeAppearance } from "./types";
export { materialSignature } from "./signature";
export type {
	PrismAppearance,
	PrismBadgeData,
	PrismBadgeHandle,
	PrismStatus,
	PrismSide,
	PrismSignature,
	BadgeMetadata,
	PrismStamp,
	PrismEdition,
} from "./types";
export { drawStylePreview } from "./style-preview";
export { drawBadgeThumbnail } from "./style-preview";
export { drawBadgeFace } from "./style-preview";

export async function validateShader(
	recipe: import("@crafter-station/badge-studio-design/prism-style").PrismRecipe,
	signal?: AbortSignal,
) {
	return (await import("./shader-lab")).validateShader(recipe, signal);
}

export { designAppearance } from "./design";
