import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";

const kinds = ["ribbons", "contours", "orbits", "grain", "chromatic-flow"];

export function designMaterialData(design?: BadgeDesign) {
	const bytes = new Uint8Array(64 * 48 * 4);
	const counts = [0, 0];
	if (design) {
		for (const [sideIndex, side] of (["front", "back"] as const).entries()) {
			const layers = design[side].layers.filter(
				(layer) => layer.kind === "effect" && layer.visible !== false,
			);
			counts[sideIndex] = layers.length;
			layers.forEach((layer, index) => {
				const offset = (sideIndex * 24 + index) * 256;
				const settings = [
					layer.x / 1024,
					layer.y / 1536,
					layer.w / 1024,
					layer.h / 1536,
					(kinds.indexOf(layer.effect) + 1) / 8,
					layer.scale / 6,
					layer.opacity,
					1,
				];
				settings.forEach((value, position) => {
					bytes[offset + position] = Math.round(value * 255);
				});
				layer.colors.forEach((color, colorIndex) => {
					const start = offset + 8 + colorIndex * 4;
					bytes[start] = Number.parseInt(color.slice(1, 3), 16);
					bytes[start + 1] = Number.parseInt(color.slice(3, 5), 16);
					bytes[start + 2] = Number.parseInt(color.slice(5, 7), 16);
					bytes[start + 3] = 255;
				});
			});
		}
	}
	return { bytes, mode: [design?.material.recipe ? 2 : design ? 1 : 0, ...counts, 0] };
}
