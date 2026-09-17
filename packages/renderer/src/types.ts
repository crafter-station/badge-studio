import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismRecipe } from "@crafter-station/badge-studio-design/prism-style";
export type BadgeMetadata = {
	roleLabel: string;
	eventName: string;
	eventDate: string;
	location: string;
	website: string;
	bio: string;
};
export type PrismStamp = {
	id: string;
	label: string;
	date: string;
	kind: "edition" | "milestone" | "memory";
};
export type PrismSignature = { seed: number; version: 1 };
export type PrismEdition = {
	layout:
		| "signal"
		| "postage"
		| "editorial"
		| "window"
		| "terminal"
		| "winter"
		| "heart"
		| "archive"
		| "ribbon";
	title: string[];
	subtitle: string;
	base: string;
	ink: string;
	accent: string;
	motif: "bars" | "orbit" | "grid" | "petals" | "waves" | "snow" | "hearts";
	portrait: "mono" | "warm" | "rose" | "blue";
	typeface: "sans" | "display" | "serif" | "mono";
};
export type PrismBadgeData = {
	document?: BadgeDesign;
	artworkUrl?: string;
	design?: "andes";
	edition?: PrismEdition;
	name: string;
	role: string;
	organization?: string;
	number: number;
	eventName: string;
	accentColor?: string;
	portraitUrl: string;
	signature?: PrismSignature;
	publicUrl?: string;
	metadata?: BadgeMetadata;
	stamps?: PrismStamp[];
};

export type PrismAppearance = {
	recipe?: PrismRecipe;
	surface?: "prism" | "satin" | "chrome";
	filter?: "original" | "thermal" | "mono" | "cyanotype" | "vintage";
	finish: "crystal" | "opal" | "obsidian";
	motion: "living" | "fluid" | "paused";
	crop: { x: number; y: number; zoom: number };
	face: { x: number; y: number; radius: number };
};

export type PrismSide = "front" | "back";
export type PrismBadgeHandle = { exportPng(side?: PrismSide): Promise<Blob> };
export type PrismStatus = "loading" | "ready" | "fallback";

export const defaultPrismAppearance: PrismAppearance = {
	surface: "prism",
	filter: "original",
	finish: "crystal",
	motion: "living",
	crop: { x: 0.5, y: 0.5, zoom: 1 },
	face: { x: 0.5, y: 0.45, radius: 0.25 },
};

function bounded(value: number, min: number, max: number, fallback: number) {
	return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export function normalizeAppearance(value: PrismAppearance): PrismAppearance {
	return {
		...(value.recipe ? { recipe: value.recipe } : {}),
		surface: ["prism", "satin", "chrome"].includes(value.surface ?? "") ? value.surface : "prism",
		filter: ["original", "thermal", "mono", "cyanotype", "vintage"].includes(value.filter ?? "")
			? value.filter
			: "original",
		finish: ["crystal", "opal", "obsidian"].includes(value.finish) ? value.finish : "crystal",
		motion: ["living", "fluid", "paused"].includes(value.motion) ? value.motion : "living",
		crop: {
			x: bounded(value.crop.x, 0, 1, 0.5),
			y: bounded(value.crop.y, 0, 1, 0.5),
			zoom: bounded(value.crop.zoom, 1, 2.5, 1),
		},
		face: {
			x: bounded(value.face.x, 0, 1, 0.5),
			y: bounded(value.face.y, 0, 1, 0.45),
			radius: bounded(value.face.radius, 0.1, 0.5, 0.25),
		},
	};
}

export function cropRectangle(width: number, height: number, crop: PrismAppearance["crop"]) {
	const aspect = 2 / 3;
	const cropWidth = Math.min(width, height * aspect) / crop.zoom;
	const cropHeight = cropWidth / aspect;
	return {
		x: (width - cropWidth) * crop.x,
		y: (height - cropHeight) * crop.y,
		width: cropWidth,
		height: cropHeight,
	};
}
