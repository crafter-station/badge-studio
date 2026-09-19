export type DesignLocation = {
	kind: "style" | "remix" | "design";
	id: string;
};

export function readDesignLocation(query: Pick<URLSearchParams, "get">): DesignLocation | null {
	for (const kind of ["design", "remix", "style"] as const) {
		const id = query.get(kind);
		if (id) return { kind, id };
	}
	return null;
}

export function designLocationKey(location: DesignLocation | null) {
	return location ? `${location.kind}:${location.id}` : "";
}

export function designHref(location: DesignLocation | null, current = "/design") {
	const url = new URL(current, "https://badge-studio.crafter.run");
	for (const key of ["style", "remix", "design"]) url.searchParams.delete(key);
	if (location) url.searchParams.set(location.kind, location.id);
	return `/design${url.search}${url.hash}`;
}
