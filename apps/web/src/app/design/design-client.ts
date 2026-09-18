import {
	type BadgeDesign,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";
import { showcaseAssets } from "../../lib/design-showcase";
import {
	browserAssetUrl,
	browserDesignRequest,
	browserStorageEnabled,
} from "./browser-design-store";

export type SavedDesign = {
	id: string;
	version: number;
	design: BadgeDesign;
	createdAt: string;
};

export type DesignLibrary = {
	designs: SavedDesign[];
	generationAvailable: boolean;
	artworkAvailable: boolean;
	demo: boolean;
};

export type DesignReference = { id: string; url: string; name: string };

export function designAssetUrl(id: string) {
	if (showcaseAssets.has(id)) return `/prism/showcase/${encodeURIComponent(id)}.png`;
	if (browserStorageEnabled) return browserAssetUrl(id);
	return `/api/designs/assets/${encodeURIComponent(id)}`;
}

export async function designRequest<T>(path = "", init?: RequestInit): Promise<T> {
	if (browserStorageEnabled) return browserDesignRequest<T>(path, init);
	const timeout = AbortSignal.timeout(["/artwork", "/generate"].includes(path) ? 180_000 : 120_000);
	const response = await fetch(`/api/designs${path}`, {
		...init,
		cache: "no-store",
		signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
	});
	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error("La conexión se interrumpió. Tu diseño sigue aquí; vuelve a intentarlo.");
	}
	if (!response.ok) {
		const message = (data as { error?: unknown })?.error;
		throw new Error(typeof message === "string" ? message : "No pudimos completar esta solicitud.");
	}
	return data as T;
}

export function parseDesigns(value: unknown, count: number): BadgeDesign[] {
	if (!Array.isArray(value) || value.length !== count) {
		throw new Error("La exploración no devolvió todas las propuestas. Inténtalo otra vez.");
	}
	return value.map((design) => {
		const result = badgeDesignSchema.safeParse(design);
		if (!result.success) {
			throw new Error("Una propuesta necesita corregirse antes de poder mostrarla.");
		}
		return result.data;
	});
}

export function downloadFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function requestJson(value: unknown, signal: AbortSignal): RequestInit {
	return {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(value),
		signal,
	};
}
