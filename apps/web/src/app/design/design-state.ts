import {
	type BadgeDesign,
	type BadgeLayer,
	type DesignLocks,
	type DesignSide,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";

export type DesignEditorState = {
	design: BadgeDesign;
	locks: DesignLocks;
	past: BadgeDesign[];
};

export function replaceDesign(
	state: DesignEditorState,
	next: BadgeDesign,
	sameDirection = true,
): DesignEditorState {
	const design = badgeDesignSchema.parse(next);
	const prune = (side: DesignSide) =>
		sameDirection
			? state.locks[side].filter((id) => design[side].layers.some((layer) => layer.id === id))
			: [];
	return {
		design,
		locks: {
			front: prune("front"),
			back: prune("back"),
			material: sameDirection && state.locks.material,
		},
		past: [...state.past.slice(-11), state.design],
	};
}

export function updateDesignLayer(
	state: DesignEditorState,
	side: DesignSide,
	id: string,
	patch: Partial<BadgeLayer>,
): DesignEditorState {
	if (state.locks[side].includes(id) && Object.keys(patch).some((key) => key !== "visible"))
		return state;
	if (!state.design[side].layers.some((layer) => layer.id === id)) return state;
	const update = (layers: BadgeLayer[]) =>
		layers.map((layer) => (layer.id === id ? { ...layer, ...patch, id, kind: layer.kind } : layer));
	const result = badgeDesignSchema.safeParse({
		...state.design,
		[side]: { ...state.design[side], layers: update(state.design[side].layers) },
	});
	return result.success ? replaceDesign(state, result.data) : state;
}

export function undoDesign(state: DesignEditorState): DesignEditorState {
	const previous = state.past.at(-1);
	if (!previous) return state;
	return {
		...replaceDesign(state, previous),
		design: previous,
		past: state.past.slice(0, -1),
	};
}
