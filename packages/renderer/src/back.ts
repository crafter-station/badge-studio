import QRCode from "qrcode";
import { createAndesBack } from "./andes";
import { createDesignBack } from "./design";
import { createEditionBack } from "./edition";
import { paintReverseSurface } from "./reverse-style";
import { materialSignature } from "./signature";
import type { PrismAppearance, PrismBadgeData, PrismSignature } from "./types";

export function safePublicUrl(value?: string) {
	if (!value) return null;
	try {
		const url = new URL(value);
		return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
			? url.href
			: null;
	} catch {
		return null;
	}
}

function lines(context: CanvasRenderingContext2D, value: string, width: number) {
	const result: string[] = [];
	let line = "";
	for (const word of value.trim().split(/\s+/)) {
		if (line && context.measureText(`${line} ${word}`).width > width) {
			result.push(line);
			line = "";
		}
		for (const character of `${line ? " " : ""}${word}`) {
			if (line && context.measureText(line + character).width > width) {
				result.push(line.trimEnd());
				line = "";
			}
			line += character;
		}
	}
	if (line) result.push(line);
	return result;
}

function paragraph(
	context: CanvasRenderingContext2D,
	value: string,
	x: number,
	y: number,
	width: number,
	size: number,
	maxLines = 2,
	family = "Arial",
	weight = 400,
) {
	context.font = `${weight} ${size}px ${family}`;
	const wrapped = lines(context, value, width);
	const visible = wrapped.slice(0, maxLines);
	if (wrapped.length > maxLines) {
		let last = visible[maxLines - 1];
		while (last && context.measureText(`${last}…`).width > width) last = last.slice(0, -1);
		visible[maxLines - 1] = `${last.trimEnd()}…`;
	}
	visible.forEach((line, index) => context.fillText(line, x, y + index * size * 1.22));
	return y + visible.length * size * 1.22;
}

function rule(context: CanvasRenderingContext2D, color: string, y: number) {
	context.save();
	context.strokeStyle = color;
	context.globalAlpha = 0.32;
	context.lineWidth = 1.5;
	context.beginPath();
	context.moveTo(92, y);
	context.lineTo(932, y);
	context.stroke();
	context.restore();
}

export function signatureSeal(
	context: CanvasRenderingContext2D,
	identity: PrismSignature | undefined,
	x: number,
	y: number,
	radius: number,
) {
	const { values } = materialSignature(identity);
	context.save();
	context.translate(x, y);
	context.rotate(values[0] * Math.PI);
	context.lineWidth = 1.2;
	for (let band = 0; band < 7; band++) {
		context.beginPath();
		for (let step = 0; step <= 240; step++) {
			const angle = (step / 240) * Math.PI * 2;
			const r =
				radius *
				(0.64 +
					band * 0.043 +
					Math.sin(angle * (5 + Math.floor(values[1] * 5)) + band * 0.38) * 0.12);
			const px = Math.cos(angle) * r;
			const py = Math.sin(angle) * r;
			if (!step) context.moveTo(px, py);
			else context.lineTo(px, py);
		}
		context.closePath();
		context.stroke();
	}
	context.restore();
}

export function createBack(
	data: PrismBadgeData,
	appearance: PrismAppearance,
	portrait?: ImageBitmap,
	artwork?: ImageBitmap,
) {
	if (data.document) return createDesignBack(data, appearance, portrait, artwork);
	if (data.edition) return createEditionBack(data);
	if (data.design === "andes") return createAndesBack(data);
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1536;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No se pudo preparar el reverso.");
	const palette = paintReverseSurface(ctx, appearance, data.signature);
	const { ink, muted, accent } = palette;
	const signature = materialSignature(data.signature);
	const details = data.metadata;
	const stamps = (data.stamps ?? []).slice(0, 6);
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.letterSpacing = "0px";
	ctx.fillStyle = ink;
	paragraph(ctx, "Living Prism", 92, 128, 600, 26, 1, "Arial", 600);
	ctx.fillStyle = muted;
	ctx.textAlign = "right";
	ctx.font = "25px monospace";
	ctx.fillText(`№ ${String(data.number).padStart(3, "0")}`, 932, 128);
	ctx.textAlign = "left";
	rule(ctx, accent, 184);

	let nameSize = stamps.length > 3 ? 88 : 110;
	ctx.font = `500 ${nameSize}px ${palette.headline}`;
	while (lines(ctx, data.name, 840).length > 2 && nameSize > 50) {
		nameSize -= 2;
		ctx.font = `500 ${nameSize}px ${palette.headline}`;
	}
	ctx.fillStyle = ink;
	let identityBottom = paragraph(ctx, data.name, 88, 220, 844, nameSize, 2, palette.headline, 500);
	ctx.fillStyle = accent;
	const affiliation = [details?.roleLabel, data.organization].filter(Boolean).join(" · ");
	if (affiliation)
		identityBottom = paragraph(ctx, affiliation, 92, identityBottom + 18, 840, 33, 2);
	if (details?.bio) {
		ctx.fillStyle = muted;
		identityBottom = paragraph(ctx, details.bio, 92, identityBottom + 20, 840, 27, 2);
	}

	const hasEvent = Boolean(details?.eventName || details?.eventDate || details?.location);
	const collectionHeight = stamps.length > 3 ? 338 : stamps.length > 1 ? 246 : 250;
	const collectionTop = 1378 - collectionHeight;
	const eventHeight = hasEvent ? 100 : 0;
	const connectTop = identityBottom + 28 + eventHeight;
	const connectBottom = collectionTop - 28;
	if (hasEvent) {
		rule(ctx, accent, identityBottom + 17);
		ctx.fillStyle = ink;
		paragraph(
			ctx,
			details?.eventName || "Encuentro",
			92,
			identityBottom + 33,
			840,
			31,
			1,
			palette.headline,
			500,
		);
		ctx.fillStyle = muted;
		paragraph(
			ctx,
			[details?.eventDate, details?.location].filter(Boolean).join(" · "),
			92,
			identityBottom + 75,
			840,
			25,
			1,
		);
	}

	const publicUrl = safePublicUrl(data.publicUrl);
	const available = connectBottom - connectTop;
	const qrLimit = Math.min(520, Math.max(208, available - 54));
	const connectionHeight = qrLimit + 54;
	const connectionY = connectTop + Math.max(0, (available - connectionHeight) / 2);
	ctx.fillStyle = muted;
	paragraph(
		ctx,
		publicUrl ? "ESCANEA Y CONECTA" : "TU PERFIL DIGITAL",
		92,
		connectionY,
		840,
		23,
		1,
		"monospace",
	);
	const qrY = connectionY + 48;
	let qrSize = qrLimit;
	if (publicUrl) {
		const matrix = QRCode.create(publicUrl, { errorCorrectionLevel: "M" }).modules;
		const cell = Math.max(1, Math.floor(qrLimit / (matrix.size + 8)));
		qrSize = cell * (matrix.size + 8);
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(92, qrY, qrSize, qrSize);
		ctx.fillStyle = "#101014";
		for (let row = 0; row < matrix.size; row++)
			for (let col = 0; col < matrix.size; col++)
				if (matrix.get(row, col))
					ctx.fillRect(92 + (col + 4) * cell, qrY + (row + 4) * cell, cell, cell);
	} else {
		ctx.strokeStyle = accent;
		signatureSeal(ctx, data.signature, 92 + qrSize / 2, qrY + qrSize / 2, qrSize * 0.42);
	}
	const copyX = 92 + qrSize + 36;
	const copyWidth = 932 - copyX;
	const titleSize = qrSize > 460 ? 44 : qrSize > 330 ? 48 : 34;
	ctx.fillStyle = ink;
	const titleBottom = paragraph(
		ctx,
		publicUrl ? "Sigamos en contacto." : "Tu próximo encuentro.",
		copyX,
		qrY + 6,
		copyWidth,
		titleSize,
		qrSize > 330 ? 3 : 2,
		palette.headline,
		500,
	);
	ctx.fillStyle = muted;
	let copyBottom = paragraph(
		ctx,
		publicUrl ? "Mi perfil, a un escaneo." : "Guarda tu badge para activar el QR.",
		copyX,
		titleBottom + 14,
		copyWidth,
		26,
		2,
	);
	if (details?.website) {
		const website = safePublicUrl(details.website);
		if (website) {
			const displayUrl = new URL(website).hostname.replace(/^www\./, "");
			ctx.fillStyle = accent;
			copyBottom = paragraph(
				ctx,
				displayUrl,
				copyX,
				copyBottom + 22,
				copyWidth,
				25,
				qrSize > 330 ? 2 : 1,
				"monospace",
			);
		}
	}
	if (qrY + qrSize - copyBottom > 190) {
		ctx.strokeStyle = accent;
		signatureSeal(ctx, data.signature, copyX + copyWidth / 2, qrY + qrSize - 114, 70);
		ctx.fillStyle = muted;
		ctx.textAlign = "center";
		ctx.font = "22px monospace";
		ctx.fillText(signature.code, copyX + copyWidth / 2, qrY + qrSize - 24);
		ctx.textAlign = "left";
	}

	rule(ctx, accent, collectionTop);
	ctx.fillStyle = muted;
	paragraph(
		ctx,
		stamps.length ? "MI COLECCIÓN" : "FIRMA PERSONAL",
		92,
		collectionTop + 22,
		630,
		23,
		1,
		"monospace",
	);
	ctx.textAlign = "right";
	ctx.font = "23px monospace";
	ctx.fillText(
		stamps.length ? `${String(stamps.length).padStart(2, "0")} / 06` : "ÚNICA",
		932,
		collectionTop + 22,
	);
	ctx.textAlign = "left";
	const gridTop = collectionTop + 69;
	if (stamps.length) {
		const columns = stamps.length === 1 ? 1 : stamps.length === 2 || stamps.length === 4 ? 2 : 3;
		const rows = Math.ceil(stamps.length / columns);
		const gap = 16;
		const width = (840 - gap * (columns - 1)) / columns;
		const height = (1378 - gridTop - gap * (rows - 1)) / rows;
		stamps.forEach((stamp, index) => {
			const x = 92 + (index % columns) * (width + gap);
			const y = gridTop + Math.floor(index / columns) * (height + gap);
			ctx.save();
			ctx.globalAlpha = 0.07;
			ctx.fillStyle = accent;
			ctx.fillRect(x, y, width, height);
			ctx.globalAlpha = 0.3;
			ctx.strokeStyle = accent;
			ctx.strokeRect(x, y, width, height);
			ctx.restore();
			const featured = columns === 1;
			const compact = rows > 1;
			const inset = featured ? 126 : 18;
			ctx.fillStyle = accent;
			ctx.font = `${featured ? 64 : 25}px Arial`;
			ctx.fillText(
				{ edition: "◇", milestone: "✳", memory: "◎" }[stamp.kind],
				featured ? x + 22 : x + width - 43,
				y + (featured ? 31 : 15),
			);
			ctx.fillStyle = ink;
			paragraph(
				ctx,
				stamp.label,
				x + inset,
				y + (featured ? 22 : 15),
				width - inset - (featured ? 20 : 42),
				featured ? 37 : compact ? 24 : 27,
				2,
				palette.headline,
				500,
			);
			ctx.fillStyle = muted;
			paragraph(
				ctx,
				stamp.date || { edition: "Edición", milestone: "Logro", memory: "Recuerdo" }[stamp.kind],
				x + inset,
				y + height - 36,
				width - inset - 20,
				22,
				1,
			);
		});
	} else {
		ctx.strokeStyle = accent;
		signatureSeal(ctx, data.signature, 154, gridTop + 63, 54);
		ctx.fillStyle = ink;
		paragraph(
			ctx,
			"Una pieza que solo puede ser tuya.",
			252,
			gridTop + 14,
			680,
			32,
			2,
			palette.headline,
			500,
		);
		ctx.fillStyle = muted;
		paragraph(ctx, signature.code, 252, gridTop + 97, 680, 24, 1, "monospace");
	}

	rule(ctx, accent, 1412);
	ctx.fillStyle = muted;
	paragraph(ctx, signature.code, 92, 1434, 500, 22, 1, "monospace");
	ctx.textAlign = "right";
	ctx.font = "22px monospace";
	ctx.fillText("LIVING PRISM / PERSONAL ID", 932, 1434);
	return canvas;
}
