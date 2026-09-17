import {
	type BadgeDesign,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";

export function attachArtwork(input: BadgeDesign, assetId: string) {
	const design = structuredClone(input);
	design.artwork = { assetId };
	for (const side of ["front", "back"] as const) {
		const layers = design[side].layers;
		if (layers.some((layer) => layer.kind === "image")) continue;
		let key = "generated-art";
		for (let suffix = 1; layers.some((layer) => layer.id === key); suffix++)
			key = `generated-art-${suffix}`;
		const index = layers.findIndex(
			(layer) =>
				layer.kind !== "effect" &&
				!(
					["graphic", "gradient", "shape"].includes(layer.kind) &&
					layer.x === 0 &&
					layer.y < 90 &&
					layer.w >= 1000 &&
					layer.h >= 1400
				),
		);
		layers.splice(index < 0 ? layers.length : index, 0, {
			id: key,
			kind: "image",
			asset: "art",
			x: 0,
			y: 90,
			w: 1024,
			h: 1400,
			opacity: 0.7,
			radius: 0,
		});
	}
	return badgeDesignSchema.parse(design);
}
