import type { BadgeLayer } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData } from "./types";

type TextLayer = Extract<BadgeLayer, { kind: "text" }>;
const fonts = {
	sans: "Arial, sans-serif",
	display: '"Andes Display", "Arial Narrow", sans-serif',
	mono: '"Andes Mono", monospace',
	serif: "Georgia, serif",
	brand: '"Andes Brand", Arial, sans-serif',
	script: '"Next Craft Script", cursive',
	pixel: '"Next Craft Pixel", monospace',
	archive: '"Next Craft Mono", monospace',
};

export function designTextValue(layer: TextLayer, data: PrismBadgeData) {
	const number = String(data.number).padStart(layer.numberDigits ?? 3, "0");
	const role = data.metadata?.roleLabel || data.role;
	const values = {
		none: layer.text,
		name: data.name,
		role,
		organization: data.organization || "",
		number: `${layer.prefix === undefined ? "№ " : ""}${number}`,
		event: data.eventName || data.document?.event || "",
		location: data.metadata?.location || "Meet. Build. Connect.",
		date: data.metadata?.eventDate || "",
		bio: data.metadata?.bio || "",
		roleOrganization: [role, data.organization].filter(Boolean).join(" / "),
		website: new URL(data.publicUrl || "https://crafters.chat/").hostname.replace(/^www\./, ""),
		roleCode: role.slice(0, 3).toLocaleUpperCase(),
		admissionRole: data.role === "attendee" ? "PARTICIPANTE" : role,
		signature: ((data.signature?.seed ?? 1) >>> 0).toString(16).toUpperCase().padStart(8, "0"),
		template: layer.text,
	};
	let value = values[layer.binding];
	if (layer.binding === "template")
		value = layer.text.replace(/\{([a-zA-Z]+)\}/g, (token, name: string) =>
			name === "number" ? number : (values[name as keyof typeof values] ?? token),
		);
	if (layer.segment === "first") value = value.trim().split(/\s+/).slice(0, -1).join(" ") || value;
	if (layer.segment === "last") value = value.trim().split(/\s+/).at(-1) || value;
	if (layer.transform === "uppercase") value = value.toLocaleUpperCase();
	if (layer.transform === "lowercase") value = value.toLocaleLowerCase();
	return `${layer.prefix || ""}${value}${layer.suffix || ""}`;
}

function lines(ctx: CanvasRenderingContext2D, value: string, width: number) {
	const result: string[] = [];
	for (const paragraph of value.split("\n")) {
		let current = "";
		for (const word of paragraph.split(/\s+/)) {
			if (current && ctx.measureText(`${current} ${word}`).width > width) {
				result.push(current);
				current = "";
			}
			for (const letter of `${current ? " " : ""}${word}`) {
				if (current && ctx.measureText(current + letter).width > width) {
					result.push(current);
					current = "";
				}
				current += letter;
			}
		}
		result.push(current);
	}
	return result;
}

export function paintDesignText(
	ctx: CanvasRenderingContext2D,
	layer: TextLayer,
	data: PrismBadgeData,
) {
	const value = designTextValue(layer, data);
	const lineHeight = layer.lineHeight ?? 1.15;
	let size =
		layer.baseline === "alphabetic" ? layer.size : Math.min(layer.size, layer.h / lineHeight);
	const font = () => {
		ctx.font = `${layer.italic ? "italic " : ""}${layer.weight} ${size}px ${fonts[layer.font]}`;
		ctx.letterSpacing = `${layer.tracking ?? 0}px`;
	};
	font();
	let wrapped: string[];
	if (layer.fit === "shrink" || layer.fit === "spread") {
		wrapped = value.split("\n");
		const measured = Math.max(...wrapped.map((line) => ctx.measureText(line).width), 1);
		if (measured > layer.w) {
			size *= layer.w / measured;
			font();
		}
	} else {
		wrapped = lines(ctx, value, layer.w);
		while (size > 10 && wrapped.length * size * lineHeight > layer.h) {
			size--;
			font();
			wrapped = lines(ctx, value, layer.w);
		}
	}
	ctx.fillStyle = layer.color;
	ctx.textBaseline = layer.baseline ?? "top";
	ctx.textAlign = layer.align;
	const x = layer.align === "left" ? 0 : layer.align === "center" ? layer.w / 2 : layer.w;
	wrapped.forEach((line, i) => {
		const y =
			i * size * lineHeight +
			(layer.baseline === "alphabetic" ? (layer.baselineOffset ?? layer.size) : 0);
		if (layer.fit === "spread") {
			ctx.textAlign = "left";
			const glyphs = [...line];
			const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
			const spacing = Math.max(
				0,
				(layer.w - widths.reduce((a, b) => a + b, 0)) / Math.max(1, glyphs.length - 1),
			);
			let offset = 0;
			glyphs.forEach((glyph, index) => {
				ctx.fillText(glyph, offset, y);
				offset += widths[index] + spacing;
			});
		} else {
			ctx.fillStyle = layer.color;
			ctx.fillText(line, x, y);
			const width = ctx.measureText(line).width;
			const origin =
				layer.align === "left" ? x : layer.align === "center" ? x - width / 2 : x - width;
			for (const highlight of layer.highlights ?? []) {
				const start = line.indexOf(highlight.text);
				if (start < 0) continue;
				ctx.save();
				ctx.fillStyle = highlight.color;
				ctx.textAlign = "left";
				ctx.fillText(highlight.text, origin + ctx.measureText(line.slice(0, start)).width, y);
				ctx.restore();
			}
		}
	});
}
