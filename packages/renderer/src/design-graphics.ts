import type { BadgeLayer } from "@crafter-station/badge-studio-design/badge-design";
import { contourSeal, terrain } from "./andes";
import { archiveGrain, desktopScenery, motif, paper, ribbonPaper } from "./edition";
import type { PrismEdition } from "./types";

export function paintDesignGraphic(
	ctx: CanvasRenderingContext2D,
	layer: Extract<BadgeLayer, { kind: "graphic" }>,
) {
	if (ctx.globalAlpha < 1) {
		const canvas = document.createElement("canvas");
		canvas.width = Math.ceil(layer.w);
		canvas.height = Math.ceil(layer.h);
		const surface = canvas.getContext("2d");
		if (surface) {
			paintDesignGraphic(surface, layer);
			ctx.drawImage(canvas, 0, 0);
		}
		return;
	}
	const { w, h, color, accent, density, seed, pattern } = layer;
	ctx.fillStyle = color;
	ctx.strokeStyle = accent;
	ctx.lineWidth = layer.stroke ?? 2;
	if (pattern === "checkerboard") {
		const size = 20 / density;
		for (let row = 0; row < h / size; row++)
			for (let col = 0; col < w / size; col++) {
				ctx.fillStyle = (row + col) % 2 ? accent : color;
				ctx.fillRect(col * size, row * size, size, size);
			}
	} else if (pattern === "path") {
		const path = new Path2D(layer.path || "");
		if (!layer.stroke || layer.fill) ctx.fill(path);
		if (layer.stroke) ctx.stroke(path);
	} else if (pattern === "window") {
		ctx.fillStyle = "#262626";
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, w - 4, h - 4);
		ctx.fillStyle = "#808080";
		ctx.fillRect(4, 4, w - 4, h - 4);
		ctx.fillStyle = color;
		ctx.fillRect(4, 4, w - 9, h - 9);
		ctx.fillStyle = accent;
		ctx.fillRect(8, 8, w - 19, 50);
		for (const offset of [108, 59]) {
			ctx.fillStyle = "#d5d5d5";
			ctx.fillRect(w - offset, 13, 43, 40);
			ctx.strokeStyle = "#111111";
			ctx.lineWidth = 4;
			ctx.beginPath();
			if (offset === 59) {
				ctx.moveTo(w - offset + 10, 22);
				ctx.lineTo(w - offset + 30, 43);
				ctx.moveTo(w - offset + 30, 22);
				ctx.lineTo(w - offset + 10, 43);
			} else {
				ctx.moveTo(w - offset + 9, 43);
				ctx.lineTo(w - offset + 31, 43);
			}
			ctx.stroke();
		}
	} else if (pattern === "cross") {
		ctx.beginPath();
		ctx.moveTo(w / 2, 0);
		ctx.lineTo(w / 2, h);
		ctx.moveTo(0, h / 2);
		ctx.lineTo(w, h / 2);
		ctx.stroke();
	} else if (pattern === "stamp") {
		for (const inset of [2, 9]) {
			ctx.beginPath();
			ctx.ellipse(
				w / 2,
				h / 2,
				Math.max(1, w / 2 - inset),
				Math.max(1, h / 2 - inset),
				0,
				0,
				Math.PI * 2,
			);
			ctx.stroke();
		}
	} else if (pattern === "scanlines") {
		for (let y = 0; y < h; y += 5 / density) ctx.fillRect(0, y, w, 1);
	} else if (pattern === "terrain") {
		ctx.scale(w / 1024, 1);
		terrain(ctx, seed, 0, h);
	} else if (pattern === "seal") {
		ctx.translate(w / 2, h / 2);
		ctx.scale(w / 230, h / 190);
		contourSeal(ctx, seed, 0, 0);
	} else {
		ctx.scale(w / 1024, h / 1536);
		if (pattern === "sky") desktopScenery(ctx, seed);
		else if (pattern === "grain") archiveGrain(ctx, seed);
		else if (pattern === "chromatic-paper")
			ribbonPaper(ctx, {
				name: "",
				role: "",
				eventName: "",
				number: 1,
				portraitUrl: "",
				signature: { seed, version: 1 },
			});
		else {
			const edition: PrismEdition = {
				layout:
					layer.variant === "plain"
						? "archive"
						: layer.variant === "technical"
							? "signal"
							: layer.variant === "editorial"
								? "editorial"
								: layer.variant === "postal"
									? "postage"
									: "terminal",
				title: [],
				subtitle: "",
				base: color,
				ink: layer.ink ?? accent,
				accent,
				motif:
					pattern === "snow" || layer.variant === "snow"
						? "snow"
						: layer.variant === "waves"
							? "waves"
							: "grid",
				portrait: "mono",
				typeface: "mono",
			};
			if (pattern === "paper") {
				paper(ctx, { ...edition, ink: layer.ink ?? accent }, seed);
			} else motif(ctx, edition, seed, layer.reverse);
		}
	}
}
