export function normalizeGeneratedDesign(value: unknown): unknown {
	if (!value || typeof value !== "object") return value;
	const design = structuredClone(value) as Record<string, unknown>;
	const hex = (value: unknown) => {
		if (typeof value !== "string") return value;
		const cleaned = value.trim().replace(/;$/, "");
		return /^#[a-f0-9]{3}$/i.test(cleaned)
			? `#${cleaned
					.slice(1)
					.split("")
					.map((letter) => letter + letter)
					.join("")}`
			: cleaned;
	};
	const bound = (value: unknown, min: number, max: number) =>
		typeof value === "number" && Number.isFinite(value)
			? Math.max(min, Math.min(max, value))
			: value;
	if (design.material && typeof design.material === "object") {
		const material = design.material as Record<string, unknown>;
		material.roughness = bound(material.roughness, 0, 1);
		material.iridescence = bound(material.iridescence, 0, 0.65);
		material.speed = bound(material.speed, 0, 1);
	}
	for (const side of ["front", "back"]) {
		const face = design[side];
		if (!face || typeof face !== "object") continue;
		const record = face as Record<string, unknown>;
		record.background = hex(record.background);
		if (!Array.isArray(record.layers)) continue;
		for (const layer of record.layers) {
			if (!layer || typeof layer !== "object") continue;
			layer.w = bound(layer.w, 1, 1024);
			layer.h = bound(layer.h, 1, 1536);
			if (layer.kind === "qr" && typeof layer.w === "number" && typeof layer.h === "number") {
				layer.w = layer.h = Math.max(
					side === "front" ? 128 : 280,
					Math.min(1024, Math.max(layer.w, layer.h)),
				);
			}
			if (typeof layer.w === "number") layer.x = bound(layer.x, 0, 1024 - layer.w);
			if (typeof layer.h === "number")
				layer.y = bound(
					layer.y,
					["text", "portrait", "qr"].includes(layer.kind) ? 90 : 0,
					1536 - layer.h,
				);
			for (const key of ["color", "accent", "tint", "foreground", "background"])
				if (key in layer) layer[key] = hex(layer[key]);
			if (Array.isArray(layer.colors)) layer.colors = layer.colors.map(hex);
			for (const key of ["stops", "highlights"])
				if (Array.isArray(layer[key]))
					for (const entry of layer[key])
						if (entry && typeof entry === "object") entry.color = hex(entry.color);
			if ("opacity" in layer) layer.opacity = bound(layer.opacity, 0, 1);
			if ("scale" in layer) layer.scale = bound(layer.scale, 0.5, 6);
			if ("radius" in layer)
				layer.radius = bound(layer.radius, 0, layer.kind === "portrait" ? 400 : 160);
			if ("stroke" in layer) layer.stroke = bound(layer.stroke, 0, 20);
			if (layer.kind === "text") {
				layer.size = bound(layer.size, 12, 220);
				if ([400, 500, 600, 700, 800, 900].includes(layer.weight))
					layer.weight = String(layer.weight);
			}
			if (
				[layer.x, layer.y, layer.w, layer.h, layer.rotation ?? 0].every(
					(value) => typeof value === "number" && Number.isFinite(value),
				)
			) {
				const reserve = ["text", "portrait", "qr"].includes(layer.kind) ? 90 : 0;
				let bounds = designLayerBounds(layer);
				const scale = Math.min(1, 1024 / bounds.w, (1536 - reserve) / bounds.h);
				if (scale < 1) {
					layer.x += (layer.w * (1 - scale)) / 2;
					layer.y += (layer.h * (1 - scale)) / 2;
					layer.w *= scale;
					layer.h *= scale;
				}
				bounds = designLayerBounds(layer);
				if (bounds.x < 0) layer.x -= bounds.x;
				else if (bounds.x + bounds.w > 1024) layer.x -= bounds.x + bounds.w - 1024;
				if (bounds.y < reserve) layer.y += reserve - bounds.y;
				else if (bounds.y + bounds.h > 1536) layer.y -= bounds.y + bounds.h - 1536;
			}
		}
	}
	return design;
}
import { designLayerBounds } from "@crafter-station/badge-studio-design/badge-design";
