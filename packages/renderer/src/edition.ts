import QRCode from "qrcode";
import { materialSignature } from "./signature";
import type { PrismAppearance, PrismBadgeData, PrismEdition } from "./types";

const mono = '"Andes Mono", monospace';
const fonts = {
	sans: "Arial, sans-serif",
	display: '"Andes Display", "Arial Narrow", sans-serif',
	serif: "Georgia, serif",
	mono,
};

function plate() {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1536;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No se pudo preparar la edición.");
	return { canvas, ctx };
}

function text(
	ctx: CanvasRenderingContext2D,
	value: string,
	x: number,
	y: number,
	size: number,
	font: string,
	color: string,
	width = 840,
) {
	ctx.fillStyle = color;
	ctx.font = `${font === mono ? 400 : 700} ${size}px ${font}`;
	const measured = ctx.measureText(value).width;
	if (measured > width)
		ctx.font = `${font === mono ? 400 : 700} ${(size * width) / measured}px ${font}`;
	ctx.fillText(value, x, y);
}

function rule(ctx: CanvasRenderingContext2D, color: string, y: number, x = 82, width = 860) {
	ctx.fillStyle = color;
	ctx.fillRect(x, y, width, 1.5);
}

function random(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
	ctx.moveTo(x, y + size * 0.3);
	ctx.bezierCurveTo(x - size, y - size * 0.45, x - size * 0.6, y - size, x, y - size * 0.38);
	ctx.bezierCurveTo(x + size * 0.6, y - size, x + size, y - size * 0.45, x, y + size * 0.3);
}

export function motif(
	ctx: CanvasRenderingContext2D,
	edition: PrismEdition,
	seed: number,
	reverse = false,
) {
	const next = random(seed);
	if (edition.layout === "archive" || edition.layout === "ribbon") return;
	ctx.save();
	ctx.strokeStyle = edition.accent;
	ctx.fillStyle = edition.accent;
	ctx.lineWidth = 1.3;
	ctx.globalAlpha = 0.2;
	if (edition.layout === "editorial") {
		ctx.strokeStyle = edition.accent;
		ctx.globalAlpha = 0.18;
		for (const [x, y] of [
			[70, 153],
			[954, 153],
			[70, 1464],
			[954, 1464],
		]) {
			ctx.beginPath();
			ctx.arc(x, y, 10, 0, Math.PI * 2);
			ctx.moveTo(x - 17, y);
			ctx.lineTo(x + 17, y);
			ctx.moveTo(x, y - 17);
			ctx.lineTo(x, y + 17);
			ctx.stroke();
		}
	} else if (edition.layout === "signal") {
		ctx.strokeStyle = edition.ink;
		ctx.globalAlpha = 0.065;
		for (let i = 0; i < 80; i++) {
			const x = Math.floor(next() * 12) * 88;
			const y = Math.floor(next() * 18) * 88;
			ctx.beginPath();
			ctx.moveTo(x - 45, y);
			ctx.lineTo(x + 70, y);
			ctx.moveTo(x, y - 45);
			ctx.lineTo(x, y + 75);
			ctx.stroke();
		}
	} else if (edition.motif === "bars") {
		for (let row = 0; row < 10; row++) {
			let x = 28;
			while (x < 1000) {
				const width = 3 + Math.floor(next() * 4) * 5;
				if (next() > 0.4) ctx.fillRect(x, 64 + row * 149, width, 96);
				x += width + 15 + next() * 16;
			}
		}
	} else if (edition.motif === "grid") {
		for (let x = 30; x < 1024; x += 46) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, 1536);
			ctx.stroke();
		}
		for (let y = 20; y < 1536; y += 46) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(1024, y);
			ctx.stroke();
		}
	} else if (edition.motif === "orbit" || edition.motif === "waves") {
		ctx.globalAlpha = edition.layout === "postage" ? 0.11 : 0.32;
		for (let band = 0; band < 19; band++) {
			ctx.beginPath();
			if (edition.motif === "orbit") {
				ctx.ellipse(
					790,
					reverse ? 1270 : 690,
					70 + band * 34,
					180 + band * 42,
					-0.48,
					0,
					Math.PI * 2,
				);
			} else {
				for (let y = 0; y < 1600; y += 8) {
					const x = 30 + band * 56 + Math.sin(y * 0.006 + band * 0.13) * 150;
					if (!y) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
			}
			ctx.stroke();
		}
	} else if (edition.motif === "snow") {
		ctx.globalAlpha = 0.6;
		for (let i = 0; i < 180; i++) {
			ctx.beginPath();
			ctx.arc(next() * 1024, next() * 1536, 0.8 + next() * 2.4, 0, Math.PI * 2);
			ctx.fill();
		}
		for (const [x, y] of [
			[110, 330],
			[906, 580],
			[860, 1210],
			[166, 1430],
		]) {
			ctx.save();
			ctx.translate(x, y);
			for (let arm = 0; arm < 6; arm++) {
				ctx.rotate(Math.PI / 3);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(0, 24);
				ctx.moveTo(0, 15);
				ctx.lineTo(-7, 9);
				ctx.moveTo(0, 15);
				ctx.lineTo(7, 9);
				ctx.stroke();
			}
			ctx.restore();
		}
	} else if (edition.motif === "hearts") {
		ctx.globalAlpha = 0.14;
		for (let i = 0; i < 24; i++) {
			ctx.beginPath();
			heart(ctx, next() * 1024, next() * 1536, 20 + next() * 110);
			ctx.stroke();
		}
	} else {
		ctx.globalAlpha = 0.17;
		for (let i = 0; i < 18; i++) {
			ctx.save();
			ctx.translate(next() * 1024, next() * 1536);
			ctx.rotate(next() * Math.PI);
			for (let petal = 0; petal < 5; petal++) {
				ctx.rotate((Math.PI * 2) / 5);
				ctx.beginPath();
				ctx.ellipse(0, 35, 19, 47, 0, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
		}
	}
	ctx.restore();
}

export function paper(ctx: CanvasRenderingContext2D, edition: PrismEdition, seed: number) {
	ctx.fillStyle = edition.base;
	ctx.fillRect(0, 0, 1024, 1536);
	motif(ctx, edition, seed);
	const next = random(seed);
	ctx.fillStyle = edition.ink;
	ctx.globalAlpha = 0.04;
	for (let i = 0; i < 3000; i++)
		ctx.fillRect(next() * 1024, next() * 1536, 0.5 + next() * 1.5, 0.5 + next());
	ctx.globalAlpha = 1;
}

function photo(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	appearance: PrismAppearance,
	edition: PrismEdition,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	const sourceAspect = image.width / image.height;
	const aspect = width / height;
	const sw = (sourceAspect > aspect ? image.height * aspect : image.width) / appearance.crop.zoom;
	const sh = sw / aspect;
	ctx.save();
	ctx.filter = {
		mono: "grayscale(1) contrast(1.16)",
		warm: "grayscale(1) sepia(0.5) contrast(1.07)",
		rose: "grayscale(1) contrast(1.2)",
		blue: "grayscale(1) contrast(1.16)",
	}[edition.portrait];
	ctx.drawImage(
		image,
		(image.width - sw) * appearance.crop.x,
		(image.height - sh) * appearance.crop.y,
		sw,
		sh,
		x,
		y,
		width,
		height,
	);
	ctx.filter = "none";
	if (edition.portrait === "rose" || edition.portrait === "blue") {
		ctx.globalCompositeOperation = "color";
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = edition.portrait === "rose" ? "#d74b82" : "#426cae";
		ctx.fillRect(x, y, width, height);
	}
	ctx.restore();
}

function stamp(
	ctx: CanvasRenderingContext2D,
	edition: PrismEdition,
	x: number,
	y: number,
	label: string,
) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(-0.16);
	ctx.strokeStyle = edition.accent;
	ctx.lineWidth = 2;
	for (const radius of [57, 64]) {
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.textAlign = "center";
	text(ctx, label, 0, -6, 15, mono, edition.accent, 98);
	text(ctx, "EDITION", 0, 17, 13, mono, edition.accent, 98);
	ctx.restore();
}

function ticks(
	ctx: CanvasRenderingContext2D,
	color: string,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	ctx.strokeStyle = color;
	ctx.lineWidth = 4;
	for (const [cx, cy, dx, dy] of [
		[x, y, 1, 1],
		[x + width, y, -1, 1],
		[x, y + height, 1, -1],
		[x + width, y + height, -1, -1],
	]) {
		ctx.beginPath();
		ctx.moveTo(cx + dx * 28, cy);
		ctx.lineTo(cx, cy);
		ctx.lineTo(cx, cy + dy * 28);
		ctx.stroke();
	}
}

function signalFrame(
	ctx: CanvasRenderingContext2D,
	edition: PrismEdition,
	y: number,
	height: number,
) {
	ctx.strokeStyle = `${edition.ink}35`;
	ctx.lineWidth = 1;
	ctx.strokeRect(72, y, 660, height);
	ticks(ctx, edition.ink, 72, y, 660, height);
}

function spread(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number) {
	const letters = [...value];
	const sizes = letters.map((letter) => ctx.measureText(letter).width);
	const gap = Math.max(
		0,
		(width - sizes.reduce((sum, size) => sum + size, 0)) / Math.max(1, letters.length - 1),
	);
	let position = x;
	for (let i = 0; i < letters.length; i++) {
		ctx.fillText(letters[i], position, y);
		position += sizes[i] + gap;
	}
}

function signalHeader(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	signalFrame(ctx, edition, 148, 190);
	const label = edition.title.join(" ");
	ctx.font = `400 67px ${fonts.sans}`;
	const scale = Math.min(1, 590 / ctx.measureText(label).width);
	ctx.save();
	ctx.translate(106, 247);
	ctx.scale(scale, scale);
	let x = 0;
	for (const letter of label) {
		ctx.fillStyle = letter === "K" ? edition.accent : edition.ink;
		ctx.fillText(letter, x, 0);
		x += ctx.measureText(letter).width;
	}
	ctx.restore();
	ctx.fillStyle = edition.accent;
	ctx.fillRect(109, 190, 6, 6);
	ctx.fillStyle = edition.ink;
	ctx.font = `400 21px ${mono}`;
	spread(ctx, edition.subtitle.toUpperCase(), 107, 297, 587);
	ctx.save();
	ctx.translate(818, 188);
	ctx.rotate(Math.PI / 2);
	const role =
		data.role === "attendee"
			? "PARTICIPANTE"
			: (data.metadata?.roleLabel || data.role).toUpperCase();
	ctx.font = `700 95px ${fonts.sans}`;
	ctx.fillStyle = edition.ink;
	spread(ctx, role, 0, 0, 1240);
	ctx.restore();
	ctx.fillStyle = edition.accent;
	ctx.fillRect(788, 148, 7, 52);
}

function signalNumbers(
	ctx: CanvasRenderingContext2D,
	data: PrismBadgeData,
	edition: PrismEdition,
	y: number,
) {
	const number = `#${String(data.number).padStart(3, "0")}`;
	ctx.font = `400 26px ${mono}`;
	ctx.fillStyle = `${edition.ink}65`;
	spread(ctx, `${number} * ${number} * ${number}`, 108, y, 586);
}

function editionQr(
	ctx: CanvasRenderingContext2D,
	data: PrismBadgeData,
	x: number,
	y: number,
	maxSize: number,
) {
	let url: URL;
	try {
		url = new URL(data.publicUrl || data.metadata?.website || "");
		if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return;
	} catch {
		return;
	}
	const matrix = QRCode.create(url.href, { errorCorrectionLevel: "M" }).modules;
	const cell = Math.floor(maxSize / (matrix.size + 8));
	if (cell < 1) return;
	const size = (matrix.size + 8) * cell;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(x, y, size, size);
	ctx.fillStyle = "#090a0b";
	for (let row = 0; row < matrix.size; row++)
		for (let col = 0; col < matrix.size; col++)
			if (matrix.get(row, col))
				ctx.fillRect(x + (col + 4) * cell, y + (row + 4) * cell, cell, cell);
	return url;
}

function signalFront(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	signalHeader(ctx, data, edition);
	signalNumbers(ctx, data, edition, 398);
	signalFrame(ctx, edition, 440, 662);
	signalNumbers(ctx, data, edition, 1149);
	signalFrame(ctx, edition, 1186, 278);
	editionQr(ctx, data, 93, 1202, 252);
	const names = data.name.trim().split(/\s+/);
	const surname = names.length > 1 ? names.pop() || "" : "";
	text(ctx, names.join(" ").toUpperCase(), 365, 1266, 67, fonts.sans, edition.ink, 333);
	text(ctx, surname.toUpperCase(), 365, 1335, 67, fonts.sans, edition.ink, 333);
	text(ctx, data.organization || "", 368, 1395, 30, fonts.sans, edition.ink, 325);
}

function signalBack(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	signalHeader(ctx, data, edition);
	signalNumbers(ctx, data, edition, 398);
	signalFrame(ctx, edition, 440, 234);
	text(ctx, "LA PERSONA", 106, 485, 17, mono, edition.accent, 590);
	text(ctx, data.name.toUpperCase(), 102, 565, 65, fonts.sans, edition.ink, 588);
	text(
		ctx,
		`${data.metadata?.roleLabel || data.role} / ${data.organization || ""}`,
		106,
		624,
		28,
		mono,
		edition.ink,
		590,
	);
	signalNumbers(ctx, data, edition, 735);
	signalFrame(ctx, edition, 777, 403);
	const url = editionQr(ctx, data, 102, 817, 304);
	text(ctx, "EL ENCUENTRO", 437, 843, 17, mono, edition.accent, 258);
	text(ctx, "iA Hackathon", 435, 905, 31, fonts.sans, edition.ink, 261);
	text(ctx, data.metadata?.location || "", 438, 959, 23, mono, edition.ink, 257);
	text(ctx, data.metadata?.eventDate || "", 438, 1030, 25, mono, edition.ink, 257);
	text(ctx, url?.hostname.replace(/^www\./, "") || "", 105, 1143, 20, mono, edition.ink, 590);
	signalFrame(ctx, edition, 1244, 220);
	text(ctx, "ROAD TO", 104, 1323, 56, fonts.sans, edition.ink, 586);
	text(ctx, "START HACK", 104, 1384, 56, fonts.sans, edition.ink, 586);
	text(ctx, "EDICIÓN INSPIRADA", 108, 1430, 16, mono, `${edition.ink}80`, 450);
	ctx.fillStyle = edition.accent;
	ctx.fillRect(669, 1416, 24, 5);
}

function editorialPortrait(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	appearance: PrismAppearance,
	edition: PrismEdition,
) {
	const poster = edition.title.length > 1;
	const box = poster
		? { x: 298, y: 405, width: 688, height: 904 }
		: { x: 100, y: 542, width: 830, height: 784 };
	const { canvas: layer, ctx: portrait } = plate();
	photo(
		portrait,
		image,
		appearance,
		{ ...edition, portrait: "mono" },
		box.x,
		box.y,
		box.width,
		box.height,
	);
	portrait.globalCompositeOperation = "multiply";
	portrait.fillStyle = "#c58bae";
	portrait.fillRect(box.x, box.y, box.width, box.height);
	portrait.globalCompositeOperation = "destination-in";
	const edges = portrait.createLinearGradient(box.x, 0, box.x + box.width, 0);
	edges.addColorStop(0, "#00000000");
	edges.addColorStop(poster ? 0.25 : 0.12, "#000000");
	edges.addColorStop(0.84, "#000000");
	edges.addColorStop(1, "#00000000");
	portrait.fillStyle = edges;
	portrait.fillRect(box.x, box.y, box.width, box.height);
	const bottom = portrait.createLinearGradient(0, box.y, 0, box.y + box.height);
	bottom.addColorStop(0, "#00000000");
	bottom.addColorStop(0.13, "#000000");
	bottom.addColorStop(0.75, "#000000");
	bottom.addColorStop(1, "#00000000");
	portrait.fillStyle = bottom;
	portrait.fillRect(box.x, box.y, box.width, box.height);
	ctx.drawImage(layer, 0, 0);

	const sw = Math.min(image.width, (image.height * box.width) / box.height) / appearance.crop.zoom;
	const sh = (sw * box.height) / box.width;
	const sx = (image.width - sw) * appearance.crop.x;
	const sy = (image.height - sh) * appearance.crop.y;
	const eyeX = Math.min(image.width, Math.max(0, image.width * appearance.face.x));
	const eyeY = Math.min(image.height, Math.max(0, image.height * appearance.face.y));
	const eyeWidth = Math.min(image.width, image.width * appearance.face.radius * 1.65);
	const eyeHeight = (eyeWidth * 94) / 349;
	const cropX = Math.max(0, Math.min(image.width - eyeWidth, eyeX - eyeWidth / 2));
	const cropY = Math.max(0, Math.min(image.height - eyeHeight, eyeY - eyeHeight / 2));
	const detailY = poster ? 251 : 214;
	ctx.save();
	ctx.filter = "grayscale(1) contrast(1.14)";
	ctx.drawImage(image, cropX, cropY, eyeWidth, eyeHeight, 94, detailY, 349, 94);
	ctx.filter = "none";
	ctx.globalCompositeOperation = "multiply";
	ctx.fillStyle = "#cf8eb5";
	ctx.fillRect(94, detailY, 349, 94);
	ctx.restore();
	const focusX = box.x + ((eyeX - sx) / sw) * box.width;
	const focusY = box.y + ((eyeY - sy) / sh) * box.height;
	const focusWidth = ((image.width * appearance.face.radius) / sw) * box.width;
	const frameX = focusX - focusWidth / 2;
	const frameY = focusY - focusWidth * 0.28;
	ctx.strokeStyle = "#c98dae";
	ctx.lineWidth = 1.4;
	ctx.strokeRect(94, detailY, 349, 94);
	ctx.strokeRect(frameX, frameY, focusWidth, focusWidth * 1.05);
	ctx.beginPath();
	ctx.moveTo(443, detailY);
	ctx.lineTo(frameX + focusWidth, frameY);
	ctx.moveTo(443, detailY + 94);
	ctx.lineTo(frameX, frameY);
	ctx.stroke();
	for (const [u, v, size, opacity] of [
		[0.02, 0.76, 76, 0.3],
		[0.14, 0.83, 94, 0.3],
		[0.01, 0.94, 63, 0.5],
		[0.86, 0.74, 74, 0.23],
		[0.9, 0.89, 65, 0.16],
		[0.85, 0.16, 60, 0.16],
	]) {
		ctx.fillStyle = "#b7809e";
		ctx.globalAlpha = opacity;
		ctx.fillRect(box.x + box.width * u, box.y + box.height * v, size, size);
	}
	ctx.globalAlpha = 1;
}

function editorialBrand(ctx: CanvasRenderingContext2D, edition: PrismEdition) {
	ctx.save();
	ctx.font = `italic 36px ${fonts.serif}`;
	ctx.fillStyle = edition.ink;
	ctx.fillText("ss", 485, 154);
	ctx.fillStyle = edition.accent;
	ctx.fillRect(526, 135, 15, 10);
	ctx.restore();
}

function editorialFront(
	ctx: CanvasRenderingContext2D,
	data: PrismBadgeData,
	edition: PrismEdition,
) {
	const poster = edition.title.length > 1;
	editorialBrand(ctx, edition);
	ctx.fillStyle = "#c58aae";
	ctx.fillRect(94, poster ? 213 : 176, 240, 35);
	ctx.font = `700 20px ${mono}`;
	ctx.fillStyle = edition.base;
	spread(ctx, "SHE SHIPS", 105, poster ? 238 : 201, 216);
	const words = data.name.trim().split(/\s+/);
	const surname = words.length > 1 ? words.pop() || "" : "";
	text(
		ctx,
		words.join(" ").toUpperCase(),
		86,
		poster ? 466 : 416,
		121,
		fonts.display,
		edition.ink,
		poster ? 420 : 490,
	);
	text(
		ctx,
		surname.toUpperCase(),
		86,
		poster ? 578 : 528,
		121,
		fonts.display,
		edition.ink,
		poster ? 420 : 490,
	);
	const metaX = poster ? 94 : 637;
	const metaY = poster ? 652 : 412;
	ctx.font = `400 22px ${mono}`;
	ctx.fillStyle = edition.accent;
	spread(ctx, (data.metadata?.roleLabel || data.role).toUpperCase(), metaX, metaY, 225);
	spread(ctx, (data.organization || "").toUpperCase(), metaX, metaY + 48, 225);
	text(ctx, "SHE SHIPS", metaX, metaY + 96, 18, mono, edition.accent, 225);
	ctx.textAlign = "right";
	text(ctx, "BUILD BOLDLY.", 920, 264, 17, mono, "#91a78a", 265);
	text(ctx, "SHIP TOGETHER.", 920, 294, 17, mono, "#91a78a", 265);
	ctx.textAlign = "left";
	ctx.fillStyle = edition.base;
	ctx.fillRect(596, 1265, 320, 65);
	ctx.fillStyle = edition.ink;
	ctx.font = `400 27px ${mono}`;
	spread(ctx, (data.metadata?.roleLabel || data.role).toUpperCase(), 622, 1308, 260);
	text(ctx, data.metadata?.location || "", 94, 1415, 19, mono, "#91a78a", 730);
	text(ctx, "SHE SHIPS / INSPIRED EDITION", 94, 1470, 15, mono, "#7b8079", 750);
	ctx.textAlign = "right";
	text(ctx, `Nº ${String(data.number).padStart(3, "0")}`, 924, 1470, 16, mono, edition.accent, 145);
}

function editorialBack(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	editorialBrand(ctx, edition);
	ctx.fillStyle = "#c58aae";
	ctx.fillRect(94, 214, 240, 35);
	ctx.font = `700 20px ${mono}`;
	ctx.fillStyle = edition.base;
	spread(ctx, "SHE SHIPS", 105, 239, 216);
	text(ctx, data.name.toUpperCase(), 87, 362, 112, fonts.display, edition.ink, 830);
	text(ctx, "LA PERSONA", 94, 469, 19, mono, edition.accent);
	text(ctx, data.metadata?.roleLabel || data.role, 91, 533, 47, fonts.display, edition.ink, 400);
	text(ctx, data.organization || "", 544, 533, 47, fonts.display, edition.ink, 380);
	rule(ctx, "#78987150", 581, 94, 830);
	text(ctx, "EL ENCUENTRO", 94, 660, 19, mono, edition.accent);
	text(ctx, data.metadata?.location || "", 92, 723, 43, fonts.display, edition.ink, 830);
	text(ctx, data.metadata?.eventDate || "", 94, 770, 23, mono, "#b781a3");
	const url = editionQr(ctx, data, 108, 865, 330);
	ctx.strokeStyle = "#c98dae";
	ctx.lineWidth = 1.4;
	ctx.strokeRect(94, 851, 358, 358);
	ctx.beginPath();
	ctx.moveTo(334, 249);
	ctx.lineTo(902, 260);
	ctx.lineTo(902, 819);
	ctx.lineTo(452, 851);
	ctx.stroke();
	text(ctx, "KEEP", 540, 966, 87, fonts.display, edition.ink, 360);
	text(ctx, "SHIPPING.", 540, 1054, 87, fonts.display, edition.ink, 360);
	text(ctx, url?.hostname || "", 541, 1127, 23, mono, edition.accent, 360);
	ctx.fillStyle = "#b7809e55";
	ctx.fillRect(833, 1140, 72, 72);
	ctx.fillRect(760, 1212, 73, 73);
	rule(ctx, "#78987150", 1291, 94, 830);
	text(ctx, "BUILD BOLDLY. SHIP TOGETHER.", 94, 1360, 29, fonts.display, edition.ink, 830);
	text(
		ctx,
		`ID ${String(data.number).padStart(3, "0")} / EDICIÓN INSPIRADA`,
		94,
		1433,
		19,
		mono,
		edition.accent,
	);
}

export function archiveGrain(ctx: CanvasRenderingContext2D, seed: number) {
	const texture = document.createElement("canvas");
	texture.width = 384;
	texture.height = 576;
	const grain = texture.getContext("2d");
	if (!grain) return;
	const pixels = grain.createImageData(texture.width, texture.height);
	const next = random(seed);
	for (let index = 0; index < pixels.data.length; index += 4) {
		const value = next() > 0.5 ? 230 : 0;
		pixels.data[index] = value;
		pixels.data[index + 1] = value;
		pixels.data[index + 2] = value;
		pixels.data[index + 3] = 5 + Math.floor(next() * 21);
	}
	grain.putImageData(pixels, 0, 0);
	ctx.save();
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(texture, 0, 0, 1024, 1536);
	ctx.restore();
}

export function ribbonPaper(ctx: CanvasRenderingContext2D, data: PrismBadgeData) {
	const texture = document.createElement("canvas");
	texture.width = 192;
	texture.height = 288;
	const surface = texture.getContext("2d");
	if (!surface) return;
	const pixels = surface.createImageData(192, 288);
	const phase = materialSignature(data.signature).values[0] * 1.7;
	const palette = [
		[0.96, 0.39, 0.99],
		[0.71, 0.49, 0.98],
		[0.57, 0.96, 0.98],
		[0.64, 0.96, 0.96],
	];
	const base = [0.975, 0.94, 0.955];
	for (let y = 0; y < 288; y++) {
		const py = (0.5 - y / 288) * 2.26;
		const bend = Math.sin(py * 2.4 + phase) * 0.28 + Math.sin(py * 1.15) * 0.13;
		for (let x = 0; x < 192; x++) {
			const h = (x / 192 - 0.5) * 1.49 * 0.9 + bend;
			const weights = [
				Math.exp(-(((h + 0.03) / 0.22) ** 2)) * 0.92,
				Math.exp(-(((h - 0.13) / 0.15) ** 2)) * 0.54,
				Math.exp(-(((h - 0.35) / 0.13) ** 2)) * 0.72,
				Math.exp(-(((h + 0.31) / 0.14) ** 2)) * 0.48,
			];
			for (let c = 0; c < 3; c++) {
				let value = base[c];
				for (let band = 0; band < 4; band++)
					value = value * (1 - weights[band]) + palette[band][c] * weights[band];
				pixels.data[(y * 192 + x) * 4 + c] = Math.round(value * 255);
			}
			pixels.data[(y * 192 + x) * 4 + 3] = 255;
		}
	}
	surface.putImageData(pixels, 0, 0);
	ctx.drawImage(texture, 0, 0, 1024, 1536);
}

function ribbonTitle(ctx: CanvasRenderingContext2D, edition: PrismEdition) {
	text(ctx, "THE GTM", 82, 270, 123, '"Andes Brand", sans-serif', edition.ink, 860);
	text(ctx, "HACKATHON", 82, 369, 102, '"Andes Brand", sans-serif', edition.ink, 860);
	ctx.save();
	ctx.letterSpacing = "3px";
	text(ctx, "48 HOURS OF REAL EXECUTION", 90, 425, 21, mono, edition.ink, 843);
	ctx.restore();
	for (const [x, turn] of [
		[39, -Math.PI / 2],
		[985, Math.PI / 2],
	]) {
		ctx.save();
		ctx.translate(x, turn < 0 ? 1230 : 463);
		ctx.rotate(turn);
		ctx.letterSpacing = "4px";
		text(ctx, "REAL CHALLENGES. REAL RESULTS.", 0, 0, 17, mono, "#693861", 784);
		ctx.restore();
	}
}

function ribbonFront(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	ribbonTitle(ctx, edition);
	ticks(ctx, edition.ink, 158, 494, 708, 696);
	ctx.fillStyle = edition.ink;
	ctx.fillRect(81, 1345, 116, 89);
	text(ctx, String(data.number).padStart(3, "0"), 101, 1403, 30, mono, "#f8eff3", 90);
	text(ctx, data.name.toUpperCase(), 81, 1292, 91, fonts.display, edition.ink, 866);
	text(
		ctx,
		(data.metadata?.roleLabel || data.role).toUpperCase(),
		230,
		1388,
		30,
		mono,
		edition.ink,
		692,
	);
	text(ctx, data.organization || "", 231, 1430, 23, mono, edition.ink, 692);
	rule(ctx, "#100d2059", 1470, 82, 859);
	text(ctx, "LATAMBUILDS / GO TO MARKET", 86, 1510, 17, mono, edition.ink, 859);
}

function ribbonBack(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	ribbonTitle(ctx, edition);
	text(ctx, data.name.toUpperCase(), 82, 553, 89, fonts.display, edition.ink, 861);
	for (const [number, label, value, y] of [
		["01", "ROL", data.metadata?.roleLabel || data.role, 646],
		["02", "EQUIPO", data.organization || "", 743],
		["03", "EDICIÓN", data.eventName, 840],
	] as const) {
		ctx.fillStyle = edition.ink;
		ctx.fillRect(86, y - 43, 70, 62);
		text(ctx, number, 101, y, 27, mono, "#f8eff3", 50);
		text(ctx, label, 185, y - 12, 16, mono, edition.ink, 170);
		text(ctx, value.toUpperCase(), 397, y + 1, 27, mono, edition.ink, 533);
		rule(ctx, "#100d2059", y + 29, 184, 743);
	}
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(76, 958, 388, 388);
	const url = editionQr(ctx, data, 92, 974, 360);
	text(ctx, "BUILD.", 508, 1058, 72, fonts.display, edition.ink, 422);
	text(ctx, "GO TO", 508, 1156, 72, fonts.display, edition.ink, 422);
	text(ctx, "MARKET.", 508, 1254, 72, fonts.display, edition.ink, 422);
	text(ctx, url?.hostname || "", 86, 1405, 20, mono, edition.ink, 840);
	rule(ctx, "#100d2059", 1457, 82, 859);
	text(ctx, "REAL CHALLENGES. REAL RESULTS.", 86, 1505, 18, mono, edition.ink, 850);
}

function desktopText(
	ctx: CanvasRenderingContext2D,
	value: string,
	x: number,
	y: number,
	size: number,
	width: number,
	color = "#141414",
) {
	ctx.fillStyle = color;
	ctx.font = `400 ${size}px "Next Craft Pixel", monospace`;
	const measured = ctx.measureText(value).width;
	if (measured > width)
		ctx.font = `400 ${(size * width) / measured}px "Next Craft Pixel", monospace`;
	ctx.fillText(value, x, y);
}

function desktopBevel(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	fill = "#d5d5d5",
) {
	ctx.fillStyle = "#262626";
	ctx.fillRect(x, y, width, height);
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(x, y, width - 4, height - 4);
	ctx.fillStyle = "#808080";
	ctx.fillRect(x + 4, y + 4, width - 4, height - 4);
	ctx.fillStyle = fill;
	ctx.fillRect(x + 4, y + 4, width - 9, height - 9);
}

function desktopWindow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	title: string,
) {
	desktopBevel(ctx, x, y, width, height, "#dedede");
	ctx.fillStyle = "#1807c7";
	ctx.fillRect(x + 8, y + 8, width - 19, 50);
	desktopText(ctx, title, x + 20, y + 43, 23, width - 150, "#ffffff");
	for (const [offset, close] of [
		[108, false],
		[59, true],
	] as const) {
		const left = x + width - offset;
		desktopBevel(ctx, left, y + 13, 43, 40);
		ctx.strokeStyle = "#101010";
		ctx.lineWidth = 4;
		ctx.beginPath();
		if (close) {
			ctx.moveTo(left + 10, y + 22);
			ctx.lineTo(left + 30, y + 43);
			ctx.moveTo(left + 30, y + 22);
			ctx.lineTo(left + 10, y + 43);
		} else {
			ctx.moveTo(left + 9, y + 43);
			ctx.lineTo(left + 31, y + 43);
		}
		ctx.stroke();
	}
}

export function desktopScenery(ctx: CanvasRenderingContext2D, seed: number) {
	const next = random(seed);
	const sky = ctx.createLinearGradient(0, 0, 0, 1410);
	sky.addColorStop(0, "#28518b");
	sky.addColorStop(0.72, "#5797d0");
	sky.addColorStop(1, "#b4d2dc");
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, 1024, 1536);
	for (let cloud = 0; cloud < 14; cloud++) {
		const x = next() * 1300 - 140;
		const y = next() * 1230;
		for (let puff = 0; puff < 9; puff++) {
			const cx = x + puff * 29;
			const cy = y + next() * 50;
			const radius = 48 + next() * 61;
			const mist = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
			mist.addColorStop(0, "#f5eee4c9");
			mist.addColorStop(0.55, "#f5eee496");
			mist.addColorStop(1, "#f5eee400");
			ctx.fillStyle = mist;
			ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
		}
	}
	const hill = ctx.createLinearGradient(0, 1185, 0, 1536);
	hill.addColorStop(0, "#668919");
	hill.addColorStop(0.4, "#79a310");
	hill.addColorStop(1, "#3c560d");
	ctx.fillStyle = hill;
	ctx.beginPath();
	ctx.moveTo(0, 1210);
	ctx.bezierCurveTo(360, 1180, 656, 1295, 1024, 1235);
	ctx.lineTo(1024, 1536);
	ctx.lineTo(0, 1536);
	ctx.closePath();
	ctx.fill();
	ctx.save();
	ctx.clip();
	for (let blade = 0; blade < 3800; blade++) {
		ctx.fillStyle = next() > 0.5 ? "#d1d64736" : "#152a1638";
		ctx.fillRect(next() * 1024, 1180 + next() * 356, 1 + next() * 2, 2 + next() * 7);
	}
	ctx.restore();
	for (const x of [134, 333]) {
		ctx.fillStyle = "#1b1b1b";
		ctx.fillRect(x, 177, 59, 30);
		ctx.fillRect(x, 196, 121, 85);
		ctx.fillStyle = "#fff5b3";
		ctx.fillRect(x + 4, 182, 48, 21);
		ctx.fillRect(x + 4, 201, 112, 73);
		ctx.fillStyle = "#d9a241";
		ctx.fillRect(x + 9, 207, 107, 67);
		ctx.fillStyle = "#ffe17d";
		ctx.fillRect(x + 14, 211, 96, 61);
	}
	desktopBevel(ctx, 559, 193, 80, 90, "#d4d4cf");
	ctx.save();
	ctx.translate(599, 240);
	ctx.fillStyle = "#238536";
	for (let arrow = 0; arrow < 3; arrow++) {
		ctx.rotate((Math.PI * 2) / 3);
		ctx.beginPath();
		ctx.moveTo(-19, -13);
		ctx.lineTo(4, -26);
		ctx.lineTo(14, -8);
		ctx.lineTo(2, -11);
		ctx.lineTo(-1, -16);
		ctx.lineTo(-14, -8);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();
	ctx.fillStyle = "#ffffff";
	for (let sheet = 0; sheet < 4; sheet++) {
		ctx.save();
		ctx.translate(560 + sheet * 22, 180 + (sheet % 2) * 10);
		ctx.rotate(sheet * 0.22 - 0.4);
		ctx.fillRect(0, 0, 25, 42);
		ctx.restore();
	}
	desktopBevel(ctx, 754, 163, 109, 90);
	ctx.fillStyle = "#141414";
	ctx.fillRect(767, 175, 78, 58);
	ctx.fillStyle = "#099ab5";
	ctx.fillRect(775, 183, 62, 42);
	desktopBevel(ctx, 790, 191, 35, 27, "#ffffff");
	desktopBevel(ctx, 743, 257, 137, 27);
	ctx.fillStyle = "#1b802c";
	ctx.fillRect(754, 265, 11, 8);
}

function desktopPortrait(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	edition: PrismEdition,
) {
	desktopScenery(ctx, data.signature?.seed ?? data.number);
	desktopWindow(ctx, 76, 310, 872, 1052, "vibecode.exe");
	for (let row = 0; row < 35; row++)
		for (let col = 0; col < 39; col++) {
			ctx.fillStyle = (row + col) % 2 ? "#eeeeee" : "#ffffff";
			ctx.fillRect(112 + col * 20, 492 + row * 20, 20, 20);
		}
	photo(ctx, image, appearance, edition, 130, 492, 764, 700);
}

function desktopFront(ctx: CanvasRenderingContext2D, data: PrismBadgeData) {
	desktopText(ctx, "VAMOS AL", 122, 435, 28, 211);
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(335, 389, 578, 109);
	desktopText(ctx, "VIBE CODE", 355, 471, 77, 545);
	ctx.fillStyle = "#242021";
	ctx.fillRect(651, 498, 262, 102);
	desktopText(ctx, "FEST", 672, 575, 78, 222, "#ffe000");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(145, 1088, 318, 94);
	desktopText(ctx, `#${String(data.number).padStart(4, "0")}`, 158, 1160, 67, 295);
	desktopText(ctx, data.name.toUpperCase(), 118, 1246, 48, 786);
	desktopBevel(ctx, 648, 1270, 240, 68);
	desktopText(ctx, "OK", 724, 1317, 38, 145);
	ctx.save();
	ctx.translate(822, 1300);
	ctx.rotate(-0.25);
	ctx.scale(3.6, 3.6);
	ctx.fillStyle = "#ffffff";
	ctx.strokeStyle = "#111111";
	ctx.lineWidth = 1.5;
	ctx.lineJoin = "miter";
	ctx.beginPath();
	ctx.moveTo(6, 20);
	for (const [x, y] of [
		[6, 15],
		[0, 9],
		[0, 6],
		[3, 6],
		[7, 10],
		[7, 0],
		[10, 0],
		[10, 8],
		[13, 8],
		[13, 6],
		[16, 6],
		[16, 9],
		[19, 9],
		[19, 12],
		[21, 12],
		[21, 20],
		[18, 20],
		[18, 24],
		[9, 24],
		[9, 20],
	])
		ctx.lineTo(x, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
	desktopWindow(ctx, 44, 1290, 358, 202, "nos vemos");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(58, 1359, 325, 113);
	desktopText(ctx, "EN LA UTEC", 75, 1406, 29, 293);
	desktopText(ctx, "VIBE / BUILD", 75, 1451, 24, 293);
	desktopText(ctx, "CRAFTER.RUN/VIBE", 442, 1431, 27, 530, "#ffffff");
	desktopText(ctx, data.metadata?.roleLabel || "Builder", 442, 1475, 21, 470, "#ffffff");
}

function desktopBack(ctx: CanvasRenderingContext2D, data: PrismBadgeData) {
	desktopScenery(ctx, data.signature?.seed ?? data.number);
	desktopWindow(ctx, 76, 310, 872, 587, "perfil.exe");
	desktopText(ctx, "VIBE CODE FEST", 118, 435, 43, 772);
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(112, 474, 795, 103);
	desktopText(ctx, data.name.toUpperCase(), 129, 552, 59, 760);
	for (const [label, value, y] of [
		["ROL", data.metadata?.roleLabel || data.role, 640],
		["EQUIPO", data.organization || "", 716],
		["LUGAR", data.metadata?.location || "UTEC", 792],
	] as const) {
		desktopText(ctx, label, 123, y, 25, 205, "#5a5a5a");
		desktopText(ctx, value.toUpperCase(), 349, y, 31, 527);
	}
	rule(ctx, "#929292", 830, 116, 786);
	desktopText(ctx, `#${String(data.number).padStart(4, "0")}`, 122, 872, 28, 770);
	desktopWindow(ctx, 77, 951, 560, 505, "conectar.exe");
	const url = editionQr(ctx, data, 167, 1045, 374);
	desktopText(ctx, url?.hostname || "", 114, 1430, 21, 478);
	desktopWindow(ctx, 662, 1021, 308, 301, "vibe.txt");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(678, 1093, 271, 208);
	desktopText(ctx, "BUILD.", 699, 1146, 30, 227);
	desktopText(ctx, "SHARE.", 699, 1200, 30, 227);
	desktopText(ctx, "REPEAT.", 699, 1254, 30, 227);
	desktopText(ctx, "HECHO PARA", 673, 1403, 24, 290, "#ffffff");
	desktopText(ctx, "CREAR.", 673, 1447, 40, 290, "#ffffff");
}

function archivePortrait(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	edition: PrismEdition,
) {
	const { canvas, ctx: portrait } = plate();
	photo(portrait, image, appearance, edition, 58, 350, 908, 944);
	portrait.globalCompositeOperation = "multiply";
	portrait.fillStyle = edition.ink;
	portrait.fillRect(58, 350, 908, 944);
	portrait.globalCompositeOperation = "destination-in";
	const edges = portrait.createLinearGradient(58, 0, 966, 0);
	edges.addColorStop(0, "#00000000");
	edges.addColorStop(0.13, "#000000");
	edges.addColorStop(0.9, "#000000");
	edges.addColorStop(1, "#00000000");
	portrait.fillStyle = edges;
	portrait.fillRect(58, 350, 908, 944);
	const fade = portrait.createLinearGradient(0, 350, 0, 1294);
	fade.addColorStop(0, "#00000000");
	fade.addColorStop(0.12, "#000000");
	fade.addColorStop(0.94, "#000000");
	fade.addColorStop(1, "#00000000");
	portrait.fillStyle = fade;
	portrait.fillRect(58, 350, 908, 944);
	ctx.drawImage(canvas, 0, 0);
	archiveGrain(ctx, data.signature?.seed ?? data.number);
}

function archiveTitle(ctx: CanvasRenderingContext2D, edition: PrismEdition) {
	ctx.textAlign = "center";
	ctx.fillStyle = edition.ink;
	ctx.font = '400 62px "Next Craft Script", cursive';
	ctx.fillText("the next craft", 426, 240);
	ctx.textAlign = "left";
}

function archiveFront(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	archiveTitle(ctx, edition);
	ctx.fillStyle = edition.ink;
	ctx.fillRect(750, 126, 238, 304);
	ctx.textAlign = "center";
	ctx.fillStyle = edition.base;
	ctx.font = '400 34px "Next Craft Pixel", monospace';
	ctx.fillText(`#${String(data.number).padStart(3, "0")}`, 869, 175);
	ctx.textAlign = "left";
	editionQr(ctx, data, 765, 195, 208);
	ctx.textAlign = "center";
	text(
		ctx,
		data.name.toUpperCase(),
		512,
		1370,
		86,
		'"Next Craft Mono", monospace',
		edition.ink,
		870,
	);
	text(
		ctx,
		`${data.metadata?.roleLabel || data.role} / ${data.organization || ""}`,
		512,
		1431,
		22,
		mono,
		edition.ink,
		870,
	);
	text(ctx, "CRAFTER · OPEN2 · AI LABS · NÚCLEO", 512, 1483, 17, mono, edition.ink, 870);
}

function archiveBack(ctx: CanvasRenderingContext2D, data: PrismBadgeData, edition: PrismEdition) {
	archiveGrain(ctx, data.signature?.seed ?? data.number);
	archiveTitle(ctx, edition);
	ctx.textAlign = "right";
	ctx.font = '400 34px "Next Craft Pixel", monospace';
	ctx.fillStyle = edition.ink;
	ctx.fillText(`#${String(data.number).padStart(3, "0")}`, 932, 174);
	ctx.textAlign = "left";
	text(ctx, data.name.toUpperCase(), 88, 408, 75, '"Next Craft Mono", monospace', edition.ink, 846);
	rule(ctx, "#c4c2b959", 465, 92, 840);
	text(ctx, "ROL", 92, 544, 21, mono, edition.accent, 390);
	text(ctx, "ORGANIZACIÓN", 546, 544, 21, mono, edition.accent, 390);
	text(
		ctx,
		data.metadata?.roleLabel || data.role,
		92,
		603,
		32,
		'"Next Craft Mono", monospace',
		edition.ink,
		390,
	);
	text(
		ctx,
		data.organization || "",
		546,
		603,
		32,
		'"Next Craft Mono", monospace',
		edition.ink,
		390,
	);
	text(ctx, "EL ENCUENTRO", 92, 712, 21, mono, edition.accent, 840);
	text(
		ctx,
		data.metadata?.location || "",
		92,
		767,
		33,
		'"Next Craft Mono", monospace',
		edition.ink,
		840,
	);
	text(ctx, data.metadata?.eventDate || "", 92, 817, 25, mono, edition.ink, 840);
	rule(ctx, "#c4c2b959", 859, 92, 840);
	const url = editionQr(ctx, data, 92, 931, 336);
	text(ctx, "HECHO PARA", 504, 1019, 40, '"Next Craft Mono", monospace', edition.ink, 427);
	text(ctx, "CREAR.", 500, 1096, 74, '"Next Craft Mono", monospace', edition.ink, 427);
	text(ctx, url?.hostname || "", 506, 1160, 20, mono, edition.accent, 425);
	rule(ctx, "#c4c2b959", 1327, 92, 840);
	ctx.textAlign = "center";
	text(ctx, "CRAFTER · OPEN2 · AI LABS · NÚCLEO", 512, 1406, 22, mono, edition.ink, 840);
	text(ctx, "ESTUDIO DE BADGE / EDICIÓN INSPIRADA", 512, 1471, 17, mono, edition.ink, 840);
}

export function createEditionPortrait(
	image: ImageBitmap,
	data: PrismBadgeData,
	appearance: PrismAppearance,
) {
	const edition = data.edition;
	if (!edition) throw new Error("Falta la edición.");
	const { canvas, ctx } = plate();
	const seed = data.signature?.seed ?? data.number;
	paper(ctx, edition, seed);
	if (edition.layout === "ribbon") {
		ribbonPaper(ctx, data);
		photo(ctx, image, appearance, edition, 174, 510, 676, 664);
	} else if (edition.layout === "archive") {
		archivePortrait(ctx, image, data, appearance, edition);
	} else if (edition.layout === "signal") {
		photo(ctx, image, appearance, edition, 74, 442, 656, 658);
	} else if (edition.layout === "postage") {
		ctx.strokeStyle = edition.accent;
		ctx.lineWidth = 1.5;
		ctx.strokeRect(40, 108, 944, 1385);
		ctx.strokeRect(47, 115, 930, 1371);
		ctx.fillStyle = edition.base;
		ctx.fillRect(142, 400, 740, 752);
		photo(ctx, image, appearance, edition, 160, 412, 704, 704);
		ticks(ctx, edition.accent, 157, 409, 710, 710);
		stamp(ctx, edition, 860, 283, "2026");
		ctx.setLineDash([2, 11]);
		ctx.strokeStyle = `${edition.ink}60`;
		ctx.beginPath();
		ctx.moveTo(79, 1390);
		ctx.lineTo(941, 1390);
		ctx.stroke();
		ctx.setLineDash([]);
	} else if (edition.layout === "editorial") {
		editorialPortrait(ctx, image, appearance, edition);
	} else if (edition.layout === "heart") {
		ctx.save();
		ctx.beginPath();
		heart(ctx, 512, 857, 544);
		ctx.clip();
		photo(ctx, image, appearance, edition, 100, 354, 824, 810);
		ctx.restore();
		ctx.beginPath();
		heart(ctx, 512, 857, 561);
		ctx.strokeStyle = edition.accent;
		ctx.lineWidth = 2;
		ctx.stroke();
	} else if (edition.layout === "window") {
		desktopPortrait(ctx, image, data, appearance, edition);
	} else {
		const winter = edition.layout === "winter";
		const terminal = edition.layout === "terminal";
		const x = terminal ? 102 : 140;
		const y = winter ? 397 : 367;
		const width = 1024 - x * 2;
		ctx.save();
		ctx.beginPath();
		if (winter) ctx.roundRect(x, y, width, 740, [width / 2, width / 2, 0, 0]);
		else ctx.rect(x, y, width, 786);
		ctx.clip();
		photo(ctx, image, appearance, edition, x, y, width, winter ? 740 : 786);
		ctx.restore();
		if (terminal) {
			ctx.fillStyle = edition.accent;
			ctx.globalAlpha = 0.08;
			for (let row = y; row < y + 786; row += 5) ctx.fillRect(x, row, width, 1);
			ctx.globalAlpha = 1;
			ticks(ctx, edition.accent, x - 8, y - 8, width + 16, 802);
		}
	}
	return canvas;
}

export function createEditionFoil(data: PrismBadgeData) {
	const edition = data.edition;
	if (!edition) throw new Error("Falta la edición.");
	const { canvas, ctx } = plate();
	const family = fonts[edition.typeface];
	const title = edition.title;
	const editorial = edition.layout === "editorial";
	const window = edition.layout === "window";
	if (edition.layout === "ribbon") {
		ribbonFront(ctx, data, edition);
		return canvas;
	}
	if (edition.layout === "signal") {
		signalFront(ctx, data, edition);
		return canvas;
	}
	if (edition.layout === "archive") {
		archiveFront(ctx, data, edition);
		return canvas;
	}
	if (editorial) {
		editorialFront(ctx, data, edition);
		return canvas;
	}
	if (window) {
		desktopFront(ctx, data);
		return canvas;
	}
	text(ctx, edition.subtitle.toUpperCase(), 84, 173, 19, mono, edition.accent);
	const twoLines = title.length > 1;
	const size = twoLines ? 85 : 105;
	const gap = 83;
	title.forEach((value, index) =>
		text(
			ctx,
			value,
			78,
			279 + gap * index,
			size,
			family,
			edition.ink,
			edition.layout === "postage" ? 695 : 866,
		),
	);
	const nameY = 1280;
	text(ctx, data.name.toUpperCase(), 78, nameY, 95, family, edition.ink);
	text(
		ctx,
		`↗ ${(data.metadata?.roleLabel || "Builder").toUpperCase()}`,
		84,
		nameY + 58,
		27,
		mono,
		edition.accent,
		390,
	);
	ctx.textAlign = "right";
	text(ctx, data.organization || "", 938, nameY + 58, 23, mono, edition.ink, 390);
	ctx.textAlign = "left";
	rule(ctx, `${edition.ink}70`, 1380);
	text(ctx, data.metadata?.location || "Made to build", 84, 1444, 20, mono, edition.ink, 700);
	ctx.textAlign = "right";
	text(ctx, `Nº ${String(data.number).padStart(3, "0")}`, 940, 1476, 18, mono, edition.accent, 175);
	return canvas;
}

export function createEditionBack(data: PrismBadgeData) {
	const edition = data.edition;
	if (!edition) throw new Error("Falta la edición.");
	const { canvas, ctx } = plate();
	const seed = data.signature?.seed ?? data.number;
	paper(ctx, edition, seed);
	if (edition.layout === "ribbon") {
		ribbonPaper(ctx, data);
		ribbonBack(ctx, data, edition);
		return canvas;
	}
	if (edition.layout === "signal") {
		signalBack(ctx, data, edition);
		return canvas;
	}
	if (edition.layout === "archive") {
		archiveBack(ctx, data, edition);
		return canvas;
	}
	if (edition.layout === "editorial") {
		editorialBack(ctx, data, edition);
		return canvas;
	}
	if (edition.layout === "window") {
		desktopBack(ctx, data);
		return canvas;
	}
	ctx.fillStyle = `${edition.base}e8`;
	ctx.fillRect(54, 110, 916, 1278);
	motif(ctx, edition, seed, true);
	const family = fonts[edition.typeface];
	text(ctx, data.eventName.toUpperCase(), 82, 176, 40, family, edition.ink, 710);
	ctx.textAlign = "right";
	text(ctx, "REVERSE", 940, 173, 17, mono, edition.accent, 170);
	ctx.textAlign = "left";
	rule(ctx, `${edition.ink}65`, 217);
	text(ctx, "THE PERSON", 84, 280, 20, mono, edition.accent);
	text(ctx, data.name.toUpperCase(), 79, 380, 95, family, edition.ink);
	text(
		ctx,
		`${data.metadata?.roleLabel || "Builder"}  /  ${data.organization || ""}`,
		84,
		436,
		29,
		mono,
		edition.ink,
	);
	rule(ctx, `${edition.ink}55`, 483);
	text(ctx, "THE EDITION", 84, 546, 20, mono, edition.accent);
	text(ctx, edition.subtitle, 80, 622, 51, family, edition.ink);
	text(ctx, data.metadata?.location || "Comunidad de builders", 84, 674, 26, mono, edition.ink);
	rule(ctx, `${edition.ink}55`, 720);
	const value = data.publicUrl || data.metadata?.website;
	let url: URL | undefined;
	try {
		const parsed = new URL(value ?? "");
		if (["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password)
			url = parsed;
	} catch {}
	if (url) {
		text(ctx, "KEEP EXPLORING", 84, 786, 20, mono, edition.accent);
		const matrix = QRCode.create(url.href, { errorCorrectionLevel: "M" }).modules;
		const cell = Math.min(10, Math.floor(374 / (matrix.size + 8)));
		const size = (matrix.size + 8) * cell;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(84, 823, size, size);
		ctx.fillStyle = "#141414";
		for (let row = 0; row < matrix.size; row++)
			for (let col = 0; col < matrix.size; col++)
				if (matrix.get(row, col))
					ctx.fillRect(84 + (col + 4) * cell, 823 + (row + 4) * cell, cell, cell);
		text(ctx, "Ideas travel.", 502, 905, 48, family, edition.ink, 410);
		text(ctx, "Take yours further.", 502, 969, 33, fonts.serif, edition.ink, 410);
		text(ctx, url.hostname.replace(/^www\./, ""), 502, 1040, 19, mono, edition.accent, 405);
		stamp(ctx, edition, 658, 1140, "BUILDER");
	}
	rule(ctx, `${edition.ink}55`, 1260);
	text(ctx, "Una persona. Muchas formas de crear.", 84, 1324, 31, family, edition.ink);
	text(
		ctx,
		`ID ${seed.toString(16).toUpperCase().padStart(8, "0")}`,
		84,
		1380,
		20,
		mono,
		edition.accent,
	);
	rule(ctx, `${edition.ink}55`, 1418);
	text(ctx, "BADGE STUDY / INSPIRED EDITION", 84, 1468, 17, mono, edition.ink, 730);
	ctx.textAlign = "right";
	text(ctx, `Nº ${String(data.number).padStart(3, "0")}`, 940, 1468, 20, mono, edition.accent, 150);
	return canvas;
}
