import type { PrismField } from "@crafter-station/badge-studio-design/prism-style";

export function fieldUniforms(field?: PrismField) {
	const layers = Array.from({ length: 4 }, (_, index) => {
		const layer = field?.layers[index];
		return layer
			? [
					[
						["noise", "cells", "ribbons", "rings"].indexOf(layer.basis),
						layer.scale,
						layer.stretch,
						(layer.angle * Math.PI) / 180,
					],
					[layer.warp, layer.drift, layer.weight, layer.blend === "multiply" ? 1 : 0],
				]
			: [
					[0, 1, 1, 0],
					[0, 0, 0, 0],
				];
	});
	return {
		layer0: layers[0][0],
		flow0: layers[0][1],
		layer1: layers[1][0],
		flow1: layers[1][1],
		layer2: layers[2][0],
		flow2: layers[2][1],
		layer3: layers[3][0],
		flow3: layers[3][1],
	};
}

export function fieldCoating(field?: PrismField) {
	return field ? [field.relief, field.refraction, field.film, field.coverage] : [0, 0, 0, 0];
}
