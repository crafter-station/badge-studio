import QRCode from "qrcode";
import type { PrismAppearance, PrismBadgeData } from "./types";

const ink = "#f6f3ee";
const blue = "#6f9bff";
const muted = "#b8bcc5";
const mono = '"Andes Mono", monospace';
const display = '"Andes Display", "Arial Narrow", sans-serif';
const brand = '"Andes Brand", Arial, sans-serif';

function plate() {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1536;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No se pudo preparar la credencial.");
	return { canvas, ctx };
}

function text(
	ctx: CanvasRenderingContext2D,
	value: string,
	x: number,
	y: number,
	size: number,
	family = mono,
	color = ink,
	width = 850,
) {
	ctx.fillStyle = color;
	ctx.font = `${family === mono ? 400 : 700} ${size}px ${family}`;
	const measured = ctx.measureText(value).width;
	if (measured > width)
		ctx.font = `${family === mono ? 400 : 700} ${(size * width) / measured}px ${family}`;
	ctx.fillText(value, x, y);
}

function line(ctx: CanvasRenderingContext2D, y: number) {
	ctx.strokeStyle = "#f6f3ee38";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(84, y);
	ctx.lineTo(940, y);
	ctx.stroke();
}

function cross(ctx: CanvasRenderingContext2D, x: number, y: number) {
	ctx.strokeStyle = blue;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x - 11, y);
	ctx.lineTo(x + 11, y);
	ctx.moveTo(x, y - 11);
	ctx.lineTo(x, y + 11);
	ctx.stroke();
}

export function terrain(ctx: CanvasRenderingContext2D, seed: number, top: number, height: number) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, top, 1024, height);
	ctx.clip();
	const phase = (seed % 997) / 997;
	for (let band = 0; band < 38; band++) {
		const depth = band / 37;
		ctx.beginPath();
		for (let x = -20; x <= 1044; x += 4) {
			const u = x / 1024;
			const peak =
				Math.exp(-((u - 0.22) ** 2) * 35) * 0.53 + Math.exp(-((u - 0.72) ** 2) * 45) * 0.76;
			const detail =
				Math.sin(u * 43 + depth * 8 + phase * 4) * 0.027 + Math.sin(u * 91 - depth * 3) * 0.01;
			const y = top + height * (0.24 + depth * 0.84 - (peak + detail) * (0.46 - depth * 0.15));
			if (x === -20) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.strokeStyle = band % 7 === 0 ? "#91b0ed99" : "#c6cfdf4d";
		ctx.lineWidth = band % 7 === 0 ? 1.65 : 1;
		ctx.stroke();
	}
	ctx.restore();
}

export function contourSeal(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number) {
	ctx.save();
	ctx.translate(x, y);
	for (let ring = 0; ring < 15; ring++) {
		ctx.beginPath();
		for (let step = 0; step <= 160; step++) {
			const angle = (step / 160) * Math.PI * 2;
			const radius =
				12 +
				ring * 6.4 +
				Math.sin(angle * 3 + ring * 0.13 + (seed % 9)) * (4 + ring * 0.8) +
				Math.sin(angle * 5 + ring * 0.1) * 3;
			const px = Math.cos(angle) * radius;
			const py = Math.sin(angle) * radius * 0.8;
			if (step) ctx.lineTo(px, py);
			else ctx.moveTo(px, py);
		}
		ctx.strokeStyle = ring % 4 === 0 ? "#91b0ed" : "#91b0ed55";
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}
	ctx.restore();
}

export function createAndesPortrait(
	image: ImageBitmap,
	data: PrismBadgeData,
	appearance: PrismAppearance,
) {
	const { canvas, ctx } = plate();
	ctx.fillStyle = "#080b10";
	ctx.fillRect(0, 0, 1024, 1536);
	const size = Math.min(image.width, image.height) / appearance.crop.zoom;
	const sx = (image.width - size) * appearance.crop.x;
	const sy = (image.height - size) * appearance.crop.y;
	ctx.filter = "grayscale(1) contrast(1.14) brightness(0.94)";
	ctx.drawImage(image, sx, sy, size, size, 20, 228, 984, 984);
	ctx.filter = "none";
	const fade = ctx.createLinearGradient(0, 220, 0, 1220);
	fade.addColorStop(0, "#080b10");
	fade.addColorStop(0.13, "#080b1000");
	fade.addColorStop(0.65, "#080b1000");
	fade.addColorStop(0.86, "#080b10a0");
	fade.addColorStop(1, "#080b10");
	ctx.fillStyle = fade;
	ctx.fillRect(0, 220, 1024, 1000);
	const vignette = ctx.createLinearGradient(0, 0, 1024, 0);
	vignette.addColorStop(0, "#080b10ed");
	vignette.addColorStop(0.2, "#080b1000");
	vignette.addColorStop(0.8, "#080b1000");
	vignette.addColorStop(1, "#080b10ed");
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 220, 1024, 1000);
	ctx.globalAlpha = 0.75;
	terrain(ctx, data.signature?.seed ?? 1, 990, 230);
	ctx.globalAlpha = 1;
	const wash = ctx.createLinearGradient(0, 980, 0, 1220);
	wash.addColorStop(0, "#080b1000");
	wash.addColorStop(1, "#080b10");
	ctx.fillStyle = wash;
	ctx.fillRect(0, 980, 1024, 240);
	return canvas;
}

export function createAndesFoil(data: PrismBadgeData) {
	const { canvas, ctx } = plate();
	text(ctx, "HACK THE", 84, 166, 33, brand);
	text(ctx, "ANDES", 79, 255, 102, brand, ink, 630);
	ctx.textAlign = "right";
	text(ctx, "LIMA, PE", 937, 167, 22, mono, muted, 200);
	text(ctx, "17–18 OCT", 937, 204, 22, mono, muted, 200);
	text(ctx, "2026", 937, 250, 36, display, blue, 200);
	ctx.textAlign = "left";
	line(ctx, 291);
	cross(ctx, 84, 338);
	cross(ctx, 940, 338);
	ctx.save();
	ctx.translate(84, 922);
	ctx.rotate(-Math.PI / 2);
	text(ctx, "TERRAIN / IDENTITY / 001", 0, 0, 18, mono, "#ccd5e4", 540);
	ctx.restore();
	text(ctx, data.name.toLocaleUpperCase(), 77, 1273, 140, display, ink, 850);
	ctx.fillStyle = blue;
	ctx.fillRect(84, 1310, 212, 52);
	text(
		ctx,
		(data.metadata?.roleLabel || "Builder").toLocaleUpperCase(),
		102,
		1346,
		26,
		mono,
		"#080b10",
		176,
	);
	text(ctx, data.organization ?? "", 326, 1348, 36, display, muted, 450);
	line(ctx, 1400);
	text(ctx, "CREAR DESDE LOS ANDES.", 84, 1455, 21, mono, muted, 670);
	ctx.textAlign = "right";
	text(ctx, `№ ${String(data.number).padStart(3, "0")}`, 940, 1456, 25, mono, ink, 190);
	return canvas;
}

export function createAndesBack(data: PrismBadgeData) {
	const { canvas, ctx } = plate();
	ctx.fillStyle = "#080b10";
	ctx.fillRect(0, 0, 1024, 1536);
	terrain(ctx, data.signature?.seed ?? 1, 1075, 465);
	const fade = ctx.createLinearGradient(0, 1000, 0, 1536);
	fade.addColorStop(0, "#080b10");
	fade.addColorStop(0.36, "#080b1000");
	fade.addColorStop(1, "#080b10aa");
	ctx.fillStyle = fade;
	ctx.fillRect(0, 1000, 1024, 536);
	text(ctx, "HACK THE ANDES", 84, 165, 34, brand);
	ctx.textAlign = "right";
	text(ctx, "FIELD NOTES / 26", 940, 165, 19, mono, muted, 320);
	ctx.textAlign = "left";
	line(ctx, 201);
	text(ctx, "01 / IDENTIDAD", 84, 256, 21, mono, blue);
	text(ctx, data.name.toLocaleUpperCase(), 79, 361, 105, display, ink);
	text(
		ctx,
		[data.metadata?.roleLabel || "Builder", data.organization].filter(Boolean).join(" / "),
		84,
		411,
		30,
		mono,
		muted,
	);
	line(ctx, 457);
	text(ctx, "02 / ENCUENTRO", 84, 510, 21, mono, blue);
	text(ctx, data.metadata?.eventDate || "17–18 OCT 2026", 84, 578, 48, display);
	text(ctx, data.metadata?.location || "Lima, Perú", 84, 626, 29, mono, muted);
	text(ctx, "30", 781, 604, 108, display);
	text(ctx, "HORAS", 791, 638, 19, mono, muted);
	line(ctx, 676);
	text(ctx, "03 / EXPLORA EL EVENTO", 84, 729, 21, mono, blue);
	const url = "https://theandeshackathon.com/";
	const matrix = QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
	const cell = 10;
	const qrSize = (matrix.size + 8) * cell;
	ctx.fillStyle = ink;
	ctx.fillRect(84, 770, qrSize, qrSize);
	ctx.fillStyle = "#080b10";
	for (let row = 0; row < matrix.size; row++)
		for (let col = 0; col < matrix.size; col++)
			if (matrix.get(row, col))
				ctx.fillRect(84 + (col + 4) * cell, 770 + (row + 4) * cell, cell, cell);
	const x = 84 + qrSize + 52;
	text(ctx, "EL SIGUIENTE", x, 819, 39, display, ink, 425);
	text(ctx, "PASO SE CREA.", x, 865, 39, display, ink, 425);
	text(ctx, "Escanea para conocer", x, 920, 22, mono, muted, 425);
	text(ctx, "el encuentro.", x, 953, 22, mono, muted, 425);
	contourSeal(ctx, data.signature?.seed ?? 1, x + 115, 1097);
	text(ctx, "THEANDESHACKATHON.COM", 84, 1200, 22, mono, muted);
	line(ctx, 1244);
	text(ctx, "TU HUELLA ES ÚNICA.", 84, 1315, 49, display);
	text(
		ctx,
		`RELIEVE ${((data.signature?.seed ?? 1) >>> 0).toString(16).toUpperCase()}`,
		84,
		1356,
		21,
		mono,
		muted,
	);
	line(ctx, 1400);
	text(ctx, "CONCEPTO / NO VÁLIDO PARA ACCESO", 84, 1455, 19, mono, muted, 720);
	ctx.textAlign = "right";
	text(ctx, `№ ${String(data.number).padStart(3, "0")}`, 940, 1456, 25, mono, ink, 190);
	return canvas;
}
