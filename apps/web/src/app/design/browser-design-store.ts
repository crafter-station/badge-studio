import { badgeDesignSchema } from "@crafter-station/badge-studio-design/badge-design";
import { z } from "zod";
import { showcaseAssets } from "../../lib/design-showcase";
import type { SavedDesign } from "./design-client";

export const browserStorageEnabled = process.env.NEXT_PUBLIC_BADGE_STORAGE !== "server";
const assetUrls = new Map<string, string>();
const saveSchema = z.object({
	design: badgeDesignSchema,
	designId: z.string().uuid().optional(),
	expectedVersion: z.number().int().positive().optional(),
});

function read<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export class BrowserDesignStore {
	constructor(
		private factory: IDBFactory,
		private name = "badge-studio-v1",
	) {}

	private async transaction<T>(
		stores: string[],
		mode: IDBTransactionMode,
		work: (transaction: IDBTransaction) => Promise<T>,
		signal?: AbortSignal | null,
	): Promise<T> {
		signal?.throwIfAborted();
		const opening = this.factory.open(this.name, 1);
		opening.onupgradeneeded = () => {
			opening.result.createObjectStore("designs", { keyPath: "id" });
			opening.result.createObjectStore("assets");
		};
		const db = await read(opening);
		try {
			signal?.throwIfAborted();
			return await new Promise<T>((resolve, reject) => {
				const transaction = db.transaction(stores, mode);
				let result: T;
				let failure: unknown;
				let finished = false;
				const abort = () => {
					failure = signal?.reason;
					transaction.abort();
				};
				signal?.addEventListener("abort", abort, { once: true });
				const cleanup = () => {
					finished = true;
					signal?.removeEventListener("abort", abort);
				};
				transaction.oncomplete = () => {
					cleanup();
					resolve(result);
				};
				transaction.onabort = () => {
					cleanup();
					reject(failure ?? transaction.error ?? new Error("No se pudo guardar el diseño."));
				};
				work(transaction).then(
					(value) => {
						result = value;
					},
					(error) => {
						if (finished) return;
						failure = error;
						try {
							transaction.abort();
						} catch {
							cleanup();
							reject(error);
						}
					},
				);
			});
		} finally {
			db.close();
		}
	}

	async list(signal?: AbortSignal | null): Promise<SavedDesign[]> {
		const designs = await this.transaction(
			["designs"],
			"readonly",
			async (transaction) => read<SavedDesign[]>(transaction.objectStore("designs").getAll()),
			signal,
		);
		return designs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	async get(id: string, signal?: AbortSignal | null): Promise<SavedDesign> {
		return this.transaction(
			["designs"],
			"readonly",
			async (transaction) => {
				const design = await read<SavedDesign | undefined>(
					transaction.objectStore("designs").get(id),
				);
				if (!design) throw new Error("No encontramos ese diseño en este navegador.");
				return design;
			},
			signal,
		);
	}

	async save(input: unknown, signal?: AbortSignal | null): Promise<SavedDesign> {
		const value = saveSchema.parse(input);
		return this.transaction(
			["designs", "assets"],
			"readwrite",
			async (transaction) => {
				const designs = transaction.objectStore("designs");
				const latest = value.designId
					? await read<SavedDesign | undefined>(designs.get(value.designId))
					: undefined;
				if (value.designId && !latest)
					throw new Error("No encontramos ese diseño en este navegador.");
				if (latest && latest.version !== value.expectedVersion)
					throw new Error("Existe una versión más reciente. Vuelve a abrirla antes de guardar.");
				const assetId = value.design.artwork?.assetId;
				if (assetId && !showcaseAssets.has(assetId)) {
					const asset = await read(transaction.objectStore("assets").get(assetId));
					if (!asset) throw new Error("Falta la ilustración. Vuelve a subirla antes de guardar.");
				}
				const entry: SavedDesign = {
					id: latest?.id ?? crypto.randomUUID(),
					version: (latest?.version ?? 0) + 1,
					design: value.design,
					createdAt: new Date().toISOString(),
				};
				await read(designs.put(entry));
				return entry;
			},
			signal,
		);
	}

	async putAsset(image: Blob, signal?: AbortSignal | null) {
		if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
			throw new Error("Elige una imagen PNG, JPG o WebP.");
		if (!image.size || image.size > 6_000_000)
			throw new Error("La ilustración debe pesar menos de 6 MB.");
		const id = crypto.randomUUID();
		await this.transaction(
			["assets"],
			"readwrite",
			async (transaction) => {
				await read(transaction.objectStore("assets").add(image, id));
			},
			signal,
		);
		return id;
	}

	async asset(id: string, signal?: AbortSignal | null): Promise<Blob> {
		return this.transaction(
			["assets"],
			"readonly",
			async (transaction) => {
				const image = await read<Blob | undefined>(transaction.objectStore("assets").get(id));
				if (!image) throw new Error("No encontramos esa ilustración en este navegador.");
				return image;
			},
			signal,
		);
	}
}

export function browserAssetUrl(id: string) {
	return assetUrls.get(id) ?? "";
}

export async function browserDesignRequest<T>(path: string, init?: RequestInit): Promise<T> {
	if (typeof indexedDB === "undefined")
		throw new Error("Habilita el almacenamiento del navegador para guardar tus diseños.");
	const store = new BrowserDesignStore(indexedDB);
	const signal = init?.signal;
	const cacheAsset = async (id?: string) => {
		if (id && !showcaseAssets.has(id) && !assetUrls.has(id))
			assetUrls.set(id, URL.createObjectURL(await store.asset(id, signal)));
	};
	try {
		if (!init?.method || init.method === "GET") {
			if (!path) {
				const designs = await store.list(signal);
				await Promise.all(designs.map((entry) => cacheAsset(entry.design.artwork?.assetId)));
				return {
					designs,
					generationAvailable: false,
					artworkAvailable: false,
					demo: true,
				} as T;
			}
			const entry = await store.get(path.slice(1), signal);
			await cacheAsset(entry.design.artwork?.assetId);
			return entry as T;
		}
		if (init.method === "POST" && !path)
			return (await store.save(JSON.parse(String(init.body)), signal)) as T;
		if (init.method === "POST" && path === "/reference") {
			const image = init.body instanceof FormData ? init.body.get("reference") : undefined;
			if (!(image instanceof Blob)) throw new Error("Elige una imagen PNG, JPG o WebP.");
			const id = await store.putAsset(image, signal);
			await cacheAsset(id);
			return { id } as T;
		}
		throw new Error("La generación con IA estará disponible en una próxima versión.");
	} catch (error) {
		if (error instanceof Error && error.name === "QuotaExceededError")
			throw new Error("Este navegador se quedó sin espacio. Exporta tu diseño como JSON.");
		throw error;
	}
}
