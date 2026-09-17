import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type BadgeDesign,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";

export class DesignError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}
export type DesignScope = { ownerId: string; eventId: string };
export type SavedDesign = { id: string; version: number; design: BadgeDesign; createdAt: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(value: string) {
	if (!uuid.test(value)) throw new DesignError(400, "El identificador no es válido.");
	return value;
}
export class DesignStore {
	constructor(
		private root: string,
		private sharedAsset?: (id: string) => Promise<Buffer | undefined>,
	) {}
	private folder(scope: DesignScope) {
		return join(
			this.root,
			createHash("sha256")
				.update(JSON.stringify([scope.ownerId, scope.eventId]))
				.digest("hex"),
		);
	}
	private async entries(scope: DesignScope) {
		const folder = this.folder(scope);
		await mkdir(folder, { recursive: true, mode: 0o700 });
		return (await readdir(folder)).filter((name) =>
			/^[0-9a-f-]{36}\.\d+\.design\.json$/i.test(name),
		);
	}
	private async read(scope: DesignScope, file: string): Promise<SavedDesign> {
		return JSON.parse(await readFile(join(this.folder(scope), file), "utf8"));
	}
	async list(scope: DesignScope) {
		const latest = new Map<string, string>();
		for (const file of await this.entries(scope)) {
			const [key, version] = file.split(".");
			const previous = latest.get(key);
			if (!previous || Number(previous.split(".")[1]) < Number(version)) latest.set(key, file);
		}
		const designs = await Promise.all([...latest.values()].map((file) => this.read(scope, file)));
		return designs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}
	async get(scope: DesignScope, designId: string) {
		const key = id(designId);
		const files = (await this.entries(scope))
			.filter((file) => file.startsWith(`${key}.`))
			.sort((a, b) => Number(b.split(".")[1]) - Number(a.split(".")[1]));
		if (!files[0]) throw new DesignError(404, "No encontramos ese diseño.");
		return this.read(scope, files[0]);
	}
	async save(scope: DesignScope, design: BadgeDesign, designId?: string, expectedVersion?: number) {
		const parsed = badgeDesignSchema.parse(design);
		if (parsed.artwork) await this.asset(scope, parsed.artwork.assetId);
		const folder = this.folder(scope);
		await mkdir(folder, { recursive: true, mode: 0o700 });
		const key = designId ? id(designId) : randomUUID();
		const latest = designId ? await this.get(scope, key) : undefined;
		if (designId && expectedVersion !== latest?.version)
			throw new DesignError(
				409,
				"Existe una versión más reciente. Vuelve a abrirla antes de guardar.",
			);
		const entry: SavedDesign = {
			id: key,
			version: (latest?.version ?? 0) + 1,
			design: parsed,
			createdAt: new Date().toISOString(),
		};
		const temp = join(folder, `${randomUUID()}.tmp`);
		try {
			await writeFile(temp, JSON.stringify(entry), { flag: "wx", mode: 0o600 });
			await link(temp, join(folder, `${key}.${entry.version}.design.json`));
			return entry;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "EEXIST")
				throw new DesignError(
					409,
					"Otro guardado creó una versión nueva. Vuelve a abrirla antes de guardar.",
				);
			throw error;
		} finally {
			await rm(temp, { force: true });
		}
	}
	async putAsset(scope: DesignScope, bytes: Uint8Array) {
		if (bytes.length > 6_000_000) throw new DesignError(413, "La imagen es demasiado grande.");
		const folder = this.folder(scope);
		await mkdir(folder, { recursive: true, mode: 0o700 });
		const key = randomUUID();
		await writeFile(join(folder, `${key}.png`), bytes, { flag: "wx", mode: 0o600 });
		return key;
	}
	async asset(scope: DesignScope, key: string) {
		const shared = await this.sharedAsset?.(id(key));
		if (shared) return shared;
		try {
			return await readFile(join(this.folder(scope), `${id(key)}.png`));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT")
				throw new DesignError(404, "No encontramos ese recurso.");
			throw error;
		}
	}
}
