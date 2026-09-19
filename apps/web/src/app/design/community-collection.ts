import type { CommunityPublication } from "../../lib/community-contract";
import { communityRequest } from "./community-client";
import { designRequest } from "./design-client";

export type CommunityPage = {
	items: CommunityPublication[];
	nextCursor: string | null;
};

export async function loadCommunityCollection(
	signal: AbortSignal,
	onPage: (items: CommunityPublication[]) => void,
) {
	let cursor: string | null = null;
	const cursors = new Set<string>();
	const items = new Map<string, CommunityPublication>();
	do {
		const query = new URLSearchParams({ limit: "24" });
		if (cursor) query.set("cursor", cursor);
		const page = await communityRequest<CommunityPage>(`?${query}`, undefined, undefined, signal);
		signal.throwIfAborted();
		for (const item of page.items) items.set(item.id, item);
		onPage([...items.values()]);
		cursor = page.nextCursor;
		if (cursor && cursors.has(cursor))
			throw new Error("Could not load the rest of Community. Try again.");
		if (cursor) cursors.add(cursor);
	} while (cursor);
}

export async function copyCommunityDesign(publication: CommunityPublication, signal: AbortSignal) {
	const design = structuredClone(publication.snapshot.design);
	if (publication.images.artwork) {
		const response = await fetch(publication.images.artwork, {
			signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
		});
		if (!response.ok) throw new Error("Could not copy the artwork.");
		const form = new FormData();
		form.set("reference", await response.blob(), "community.webp");
		const saved = await designRequest<{ id: string }>("/reference", {
			method: "POST",
			body: form,
			signal,
		});
		design.artwork = { assetId: saved.id };
	}
	signal.throwIfAborted();
	return design;
}
