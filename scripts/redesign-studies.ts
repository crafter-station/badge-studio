import { readFile, writeFile } from "node:fs/promises";
import { badgeDesignSchema } from "../packages/design/src/badge-design";

const file = new URL("../packages/design/src/catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(file, "utf8"));

const text = (
	id: string,
	value: string,
	x: number,
	y: number,
	w: number,
	h: number,
	size: number,
	color: string,
	extra = {},
) => ({
	id,
	kind: "text",
	text: value,
	binding: "none",
	x,
	y,
	w,
	h,
	size,
	color,
	font: "sans",
	weight: "400",
	align: "left",
	fit: "shrink",
	lineHeight: 1,
	...extra,
});
const shape = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
	extra = {},
) => ({
	id,
	kind: "shape",
	shape: "rectangle",
	x,
	y,
	w,
	h,
	color,
	radius: 0,
	stroke: 0,
	opacity: 1,
	...extra,
});
const graphic = (
	id: string,
	pattern: string,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
	extra = {},
) => ({
	id,
	kind: "graphic",
	pattern,
	x,
	y,
	w,
	h,
	color,
	accent: color,
	density: 0.5,
	seed: 7319,
	...extra,
});
const path = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	value: string,
	color: string,
	extra = {},
) => graphic(id, "path", x, y, w, h, color, { path: value, stroke: 2, ...extra });
const rule = (id: string, x: number, y: number, w: number, color: string, extra = {}) =>
	shape(id, x, y, w, 2, color, extra);
const photo = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	filter: string,
	extra = {},
) => ({
	id,
	kind: "portrait",
	x,
	y,
	w,
	h,
	filter,
	radius: 0,
	channel: "print",
	crop: { x: 0.5, y: 0.38, zoom: 1 },
	cropMode: "cover",
	contrast: 1.05,
	...extra,
});
const art = (id: string, x: number, y: number, w: number, h: number, extra = {}) => ({
	id,
	kind: "image",
	x,
	y,
	w,
	h,
	asset: "art",
	radius: 0,
	opacity: 1,
	...extra,
});
const qr = (x: number, y: number, size: number, ink: string, background: string) => ({
	id: "access-qr",
	kind: "qr",
	x,
	y,
	w: size,
	h: size,
	foreground: ink,
	background,
});
const gradient = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	colors: string[],
	extra = {},
) => ({
	id,
	kind: "gradient",
	x,
	y,
	w,
	h,
	direction: "vertical",
	stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })),
	...extra,
});
const paper = (color: string, ink: string, seed = 7319) =>
	graphic("paper-stock", "paper", 0, 0, 1024, 1536, color, {
		ink,
		accent: ink,
		variant: "plain",
		seed,
	});
const grain = () => graphic("print-grain", "grain", 0, 0, 1024, 1536, "#111111", { opacity: 0.12 });
const serif = { font: "serif", tracking: -4 };
const italic = { ...serif, italic: true };
const mono = { font: "mono", tracking: 1 };
const display = { font: "display", weight: "800", tracking: -2 };
const name = { binding: "name" };
const role = { binding: "role", transform: "uppercase" };
const org = { binding: "organization" };
const event = { binding: "event" };
const number = { binding: "number", prefix: "" };
const satin = { surface: "satin", roughness: 0.85, iridescence: 0, speed: 0.12 };
const wave = (w: number, h: number, cycles = 7) =>
	Array.from({ length: 161 }, (_, i) => {
		const x = (i * w) / 160;
		const envelope = Math.sin((i / 160) * Math.PI) ** 0.6;
		const y = h / 2 + Math.sin((i / 160) * Math.PI * cycles * 2) * h * 0.45 * envelope;
		return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
	}).join(" ");
const ellipse = (w: number, h: number) =>
	`M2 ${h / 2} a${w / 2 - 2} ${h / 2 - 2} 0 1 0 ${w - 4} 0 a${w / 2 - 2} ${h / 2 - 2} 0 1 0 -${w - 4} 0`;
const screenedEllipse = (w: number, h: number) =>
	Array.from({ length: Math.floor(h / 8) }, (_, i) => {
		const y = i * 8 + 4;
		const half = (w / 2) * Math.sqrt(1 - ((y - h / 2) / (h / 2)) ** 2);
		return `M${(w / 2 - half).toFixed(2)} ${y} H${(w / 2 + half).toFixed(2)}`;
	}).join(" ");
const prism = (
	title: string,
	palette: string[],
	seed: number,
	roughness: number,
	iridescence: number,
) => ({
	surface: "prism",
	roughness,
	iridescence,
	speed: 0.16,
	effect: "standard",
	recipe: {
		version: 1,
		name: title,
		description: title,
		surface: "prism",
		finish: "crystal",
		palette,
		accent: palette[1],
		portrait: { strength: 0, saturation: 1, contrast: 1 },
		texture: { pattern: "grain", amount: 0.025, scale: 1.4 },
		material: { roughness, iridescence },
		field: {
			layers: [
				{
					basis: "ribbons",
					scale: 1.2,
					stretch: 1.6,
					angle: -28,
					warp: 0.5,
					drift: 0.06,
					weight: 1,
					blend: "add",
				},
			],
			relief: 0.16,
			refraction: 0.01,
			film: 0.22,
			coverage: 0.65,
		},
		motion: { speed: 0.16, amplitude: 0.18 },
		heading: "sans",
		seed,
		promptVersion: "material-director-v3",
		model: "material-director",
	},
});

const blue = "#112f52";
const ivory = "#f1eedf";
const herbarium = {
	version: 1,
	source: "herbario-azul",
	name: "Herbario azul",
	event: "Herbarium",
	description:
		"Cianotipia de colección: azul de Prusia, retrato de contacto y una ficha botánica en papel marfil.",
	artwork: { assetId: "b0960e23-8714-4f78-a614-3ec4dfaa27f5" },
	artPrompt:
		"Authentic Prussian-blue cyanotype contact print, fine ivory fern fronds and wild grasses at the edges, quiet blue center and top, subtle cotton paper, no lettering, no people.",
	material: satin,
	front: {
		background: blue,
		layers: [
			art("cyanotype-print", 0, 0, 1024, 1536),
			text("collection-label", "COLLECTION VIVANTE", 60, 104, 660, 34, 28, ivory, mono),
			text("plate-number", "", 758, 104, 206, 34, 28, ivory, {
				...mono,
				...number,
				align: "right",
				prefix: "PL. ",
			}),
			text("exhibition-title", "", 48, 162, 928, 166, 146, ivory, { ...serif, ...event }),
			text("exhibition-subtitle", "Rencontres botaniques", 60, 340, 850, 52, 34, ivory, {
				...italic,
				tracking: 0,
			}),
			photo("contact-portrait", 188, 418, 648, 648, "cyanotype", {
				brightness: 1.16,
				contrast: 0.95,
				fade: { x: 0.06, right: 0.06, top: 0.03, bottom: 0.17 },
			}),
			shape("contact-corners", 170, 400, 684, 684, ivory, {
				shape: "corners",
				stroke: 2,
				opacity: 0.5,
			}),
			shape("accession-label", 48, 1110, 928, 378, ivory, { protectMaterial: true }),
			text("participant-name", "", 80, 1150, 864, 108, 86, blue, { ...serif, ...name }),
			text("participant-role", "", 82, 1270, 862, 42, 30, blue, {
				...mono,
				binding: "roleOrganization",
				transform: "uppercase",
			}),
			rule("label-rule", 82, 1340, 860, blue, { opacity: 0.3 }),
			text("label-location", "", 82, 1368, 860, 36, 26, blue, { ...mono, binding: "location" }),
			text("label-date", "", 82, 1420, 860, 36, 26, blue, { ...mono, binding: "date" }),
		],
	},
	back: {
		background: ivory,
		layers: [
			paper(ivory, blue),
			shape("blue-binding", 0, 0, 18, 1536, blue),
			text("archive-label", "ARCHIVES / COLLECTION VIVANTE", 64, 108, 896, 36, 26, blue, mono),
			rule("archive-rule", 64, 166, 896, blue),
			text("accession-title", "Fiche\nd’accession.", 58, 210, 710, 254, 116, blue, serif),
			art("botanical-specimen", 792, 220, 168, 234),
			text("holder-label", "NOM DU PARTICIPANT", 64, 526, 896, 32, 26, blue, mono),
			text("participant-name", "", 58, 578, 908, 116, 90, blue, { ...serif, ...name }),
			text("participant-role", "", 64, 712, 896, 44, 34, blue, {
				...mono,
				binding: "roleOrganization",
			}),
			rule("identity-rule", 64, 800, 896, blue, { opacity: 0.35 }),
			text("location-label", "LIEU", 64, 842, 410, 32, 26, blue, mono),
			text("location-value", "", 64, 892, 410, 80, 33, blue, {
				...serif,
				binding: "location",
				fit: "wrap",
				tracking: 0,
			}),
			text("date-label", "ÉDITION", 556, 842, 404, 32, 26, blue, mono),
			text("date-value", "", 556, 892, 404, 80, 33, blue, {
				...serif,
				binding: "date",
				fit: "wrap",
				tracking: 0,
			}),
			rule("access-rule", 64, 1004, 896, blue, { opacity: 0.35 }),
			text("specimen-label", "NUMÉRO D’ACCÈS", 64, 1070, 462, 36, 26, blue, mono),
			text("specimen-number", "", 54, 1124, 476, 158, 142, blue, { ...serif, ...number }),
			text("access-caption", "Une présence.\nUne nouvelle feuille.", 64, 1318, 468, 86, 32, blue, {
				...italic,
				tracking: 0,
				lineHeight: 1.25,
			}),
			text("archive-footer", "", 64, 1452, 896, 36, 26, blue, {
				...mono,
				...event,
				transform: "uppercase",
			}),
			qr(596, 1052, 364, blue, ivory),
		],
	},
};

const acid = "#dcff3f";
const black = "#10130e";
const white = "#f1f1e7";
const frequency = {
	version: 1,
	source: "frecuencia-acida",
	name: "Frecuencia ácida",
	event: "FRECUENCIA",
	description:
		"Una señal de club: tipografía de gran formato, retrato nocturno y ondas ácidas sobre vinilo negro.",
	artPrompt: "",
	material: {
		...prism("Acid vinyl", [black, "#83952e", acid], 7412, 0.65, 0.08),
		surface: "satin",
		effect: "standard",
		focus: { x: 0.5, y: 0.52, radius: 0.3 },
		recipe: {
			...prism("Acid vinyl", [black, "#83952e", acid], 7412, 0.65, 0.08).recipe,
			surface: "satin",
		},
	},
	front: {
		background: black,
		layers: [
			shape("acid-header", 0, 0, 1024, 408, acid, { protectMaterial: true }),
			text("series-label", "ELECTRONIC ASSEMBLY", 52, 102, 730, 38, 28, black, mono),
			text("side-a", "A / B", 822, 102, 148, 38, 28, black, { ...mono, align: "right" }),
			text("festival-title", "", 44, 164, 940, 176, 180, black, {
				...display,
				...event,
				tracking: -4,
			}),
			path("carrier-wave", 52, 334, 920, 54, wave(920, 54, 15), black, { stroke: 3 }),
			photo("night-portrait", 0, 424, 1024, 756, "mono", {
				contrast: 1.2,
				brightness: 1.14,
				tint: "#c3ce9b",
				tintMode: "color",
				tintOpacity: 0.2,
				crop: { x: 0.5, y: 0.12, zoom: 1 },
				fade: { x: 0, top: 0, bottom: 0.16 },
			}),
			path("signal-left", 48, 570, 104, 460, wave(104, 460, 1), acid, { stroke: 3, opacity: 0.8 }),
			path("signal-right", 872, 570, 104, 460, wave(104, 460, 1), acid, {
				stroke: 3,
				opacity: 0.8,
			}),
			text("portrait-index", "LIVE / TRANSMISSION", 52, 1106, 732, 34, 28, acid, mono),
			text("participant-name", "", 46, 1208, 934, 122, 108, white, {
				...display,
				...name,
				transform: "uppercase",
			}),
			shape("admission-band", 52, 1360, 920, 114, acid, { protectMaterial: true }),
			text("participant-role", "", 76, 1380, 656, 56, 46, black, { ...display, ...role }),
			text("ticket-number", "", 736, 1380, 212, 56, 46, black, {
				...display,
				...number,
				align: "right",
			}),
			text("participant-org", "", 76, 1440, 690, 28, 24, black, { ...mono, ...org }),
		],
	},
	back: {
		background: black,
		layers: [
			shape("acid-pass", 0, 0, 1024, 480, acid, { protectMaterial: true }),
			text("pass-label", "", 52, 106, 748, 38, 28, black, { ...mono, ...event }),
			text("side-b", "SIDE B", 800, 106, 172, 38, 28, black, { ...mono, align: "right" }),
			text("admission-role", "", 44, 196, 936, 200, 194, black, { ...display, ...role }),
			path("back-signal", 52, 402, 920, 48, wave(920, 48, 16), black, { stroke: 3 }),
			text("holder-label", "CONNECTED TO", 52, 540, 920, 34, 28, acid, mono),
			text("participant-name", "", 46, 598, 934, 116, 100, white, {
				...display,
				...name,
				transform: "uppercase",
			}),
			text("participant-org", "", 52, 736, 920, 46, 36, white, { ...mono, ...org }),
			rule("metadata-rule", 52, 822, 920, acid, { opacity: 0.45 }),
			text("location-value", "", 52, 864, 472, 94, 32, white, {
				...mono,
				binding: "location",
				fit: "wrap",
				lineHeight: 1.2,
			}),
			text("date-value", "", 568, 864, 404, 94, 32, white, {
				...mono,
				binding: "date",
				fit: "wrap",
				align: "right",
				lineHeight: 1.2,
			}),
			text("ticket-label", "PERSONAL FREQUENCY", 494, 1060, 476, 36, 26, acid, mono),
			text("ticket-number", "", 484, 1120, 488, 192, 188, acid, { ...display, ...number }),
			text("tuning-label", "TUNED IN.\nREADY TO CONNECT.", 494, 1322, 476, 86, 29, white, {
				...mono,
				lineHeight: 1.4,
			}),
			text("back-website", "", 52, 1460, 920, 34, 26, acid, { ...mono, binding: "website" }),
			qr(52, 1054, 360, black, acid),
		],
	},
};

const clay = "#a84533";
const cream = "#f2e6ce";
const espresso = "#51271e";
const postal = {
	version: 1,
	source: "terracota-postal",
	name: "Terracota postal",
	event: "Casa abierta",
	description:
		"Una postal para llevar puesta: terracota, fotografía cálida, matasellos y un reverso listo para viajar.",
	artPrompt: "",
	material: satin,
	front: {
		background: clay,
		layers: [
			paper(clay, espresso),
			grain(),
			text(
				"residency-label",
				"ENCUENTRO DE PRÁCTICAS CREATIVAS",
				60,
				106,
				904,
				36,
				27,
				cream,
				mono,
			),
			text("residency-title", "", 48, 182, 700, 292, 148, cream, {
				...italic,
				...event,
				fit: "wrap",
				suffix: ".",
				tracking: -6,
				lineHeight: 0.9,
			}),
			shape("stamp-paper", 230, 502, 700, 700, cream, { rotation: 6 }),
			photo("postage-portrait", 262, 534, 636, 600, "warm", {
				rotation: 6,
				contrast: 0.92,
				brightness: 1.2,
				saturation: 0.7,
			}),
			text("stamp-caption", "ENCUENTROS / 2026", 276, 1148, 568, 34, 26, espresso, {
				...mono,
				rotation: 6,
			}),
			graphic("cancellation-ring", "stamp", 52, 976, 286, 174, espresso, {
				stroke: 4,
				rotation: -12,
				opacity: 0.85,
			}),
			text("cancellation-mark", "CASA\nABIERTA", 89, 1018, 210, 72, 28, espresso, {
				...mono,
				align: "center",
				rotation: -12,
				lineHeight: 1.15,
			}),
			path(
				"postal-cancellation",
				280,
				1080,
				416,
				90,
				"M0 10 C70 0 110 30 180 20 S300 0 416 10 M0 36 C70 26 110 56 180 46 S300 26 416 36 M0 62 C70 52 110 82 180 72 S300 52 416 62",
				espresso,
				{ stroke: 4, opacity: 0.8 },
			),
			text("participant-name", "", 52, 1260, 920, 108, 86, cream, { ...serif, ...name }),
			text("participant-role", "", 60, 1380, 672, 40, 28, cream, {
				...mono,
				binding: "roleOrganization",
				transform: "uppercase",
			}),
			text("postal-number", "", 768, 1380, 196, 40, 28, cream, {
				...mono,
				...number,
				align: "right",
				prefix: "Nº ",
			}),
			rule("postal-rule", 60, 1440, 904, cream, { opacity: 0.4 }),
			text("postal-location", "", 60, 1464, 904, 36, 26, cream, { ...mono, binding: "location" }),
		],
	},
	back: {
		background: cream,
		layers: [
			paper(cream, espresso),
			grain(),
			shape("mail-band", 0, 0, 1024, 18, clay),
			text("postcard-title", "Carte\npostale.", 50, 134, 552, 260, 116, espresso, italic),
			text("postcard-event", "", 60, 430, 528, 48, 36, clay, { ...serif, ...event, tracking: 0 }),
			shape("stamp-frame", 618, 106, 354, 354, clay, { shape: "frame", stroke: 3 }),
			text("air-mail-label", "POR AVIÓN / AIR MAIL", 630, 478, 330, 32, 23, clay, {
				...mono,
				align: "center",
				tracking: 0,
			}),
			rule("postcard-divider", 60, 548, 904, clay, { opacity: 0.4 }),
			text("address-label", "PARA", 60, 598, 904, 36, 28, clay, mono),
			text("participant-name", "", 52, 662, 920, 110, 84, espresso, { ...serif, ...name }),
			text("participant-role", "", 60, 794, 904, 44, 32, clay, {
				...mono,
				binding: "roleOrganization",
			}),
			rule("address-rule", 60, 884, 904, clay, { opacity: 0.4 }),
			shape("postcard-spine", 582, 932, 2, 426, clay, { opacity: 0.4 }),
			text(
				"correspondence",
				"Las ideas\nviajan mejor\nen compañía.",
				54,
				960,
				494,
				246,
				57,
				espresso,
				{ ...italic, tracking: -2, lineHeight: 1.2 },
			),
			text("edition-label", "ENCUENTRO", 626, 952, 338, 36, 26, clay, mono),
			text("date-value", "", 626, 1008, 338, 84, 32, espresso, {
				...serif,
				binding: "date",
				fit: "wrap",
				tracking: 0,
			}),
			text("location-value", "", 626, 1140, 338, 92, 32, espresso, {
				...serif,
				binding: "location",
				fit: "wrap",
				tracking: 0,
			}),
			text("serial-value", "", 626, 1290, 338, 52, 36, clay, { ...mono, ...number, prefix: "Nº " }),
			text("website-value", "", 60, 1452, 904, 36, 26, clay, { ...mono, binding: "website" }),
			qr(636, 124, 318, espresso, cream),
		],
	},
};

const pearl = "#e8e3ee";
const violet = "#30243f";
const opal = {
	version: 1,
	source: "opalo-lunar",
	name: "Ópalo lunar",
	event: "Ópalo",
	description:
		"Cine en una pieza de nácar: serif monumental, retrato elíptico y reflejos suaves que cambian con la luz.",
	artPrompt: "",
	material: {
		...prism("Lunar nacre", ["#e6e3ed", "#b4a3d4", "#c7ddd6"], 92731, 0.52, 0.27),
		focus: { x: 0.65, y: 0.57, radius: 0.22 },
	},
	front: {
		background: pearl,
		layers: [
			gradient("nacre-ground", 0, 0, 1024, 1536, ["#f2eee9", "#c9bedc", "#ebe6ef"]),
			{
				id: "pearl-ribbons",
				kind: "effect",
				effect: "ribbons",
				x: 0,
				y: 0,
				w: 1024,
				h: 1536,
				colors: ["#ded8e7", "#eee6ef", "#b4c8c7"],
				opacity: 0.25,
				scale: 1.2,
			},
			text("festival-label", "ENCUENTRO DE CINE & ARTE", 58, 106, 908, 36, 27, violet, mono),
			text("festival-title", "", 42, 166, 942, 232, 206, violet, {
				...serif,
				...event,
				suffix: ".",
				tracking: -8,
			}),
			text("festival-subtitle", "La luz también se encuentra.", 58, 428, 900, 46, 34, violet, {
				...italic,
				tracking: -1,
			}),
			path("lunar-orbit", 84, 564, 848, 422, ellipse(848, 422), "#68547e", {
				rotation: -25,
				stroke: 2,
				opacity: 0.55,
			}),
			path("second-orbit", 78, 566, 860, 444, ellipse(860, 444), "#ffffff", {
				rotation: -25,
				stroke: 2,
				opacity: 0.7,
			}),
			shape("portrait-mount", 396, 516, 540, 674, "#d3cddd", { shape: "ellipse" }),
			photo("lunar-portrait", 410, 530, 512, 646, "mono", {
				clip: "ellipse",
				contrast: 0.94,
				brightness: 1.2,
				tint: "#a58dbb",
				tintMode: "color",
				tintOpacity: 0.22,
			}),
			text("program-mark", "CINE\nARTE\nLUZ", 60, 612, 310, 198, 39, violet, {
				...mono,
				tracking: 4,
				lineHeight: 1.5,
			}),
			text("edition-number", "26", 48, 930, 318, 174, 156, violet, { ...serif, tracking: -8 }),
			text("participant-name", "", 54, 1238, 920, 112, 86, violet, { ...serif, ...name }),
			rule("identity-rule", 60, 1370, 904, violet, { opacity: 0.3 }),
			text("participant-role", "", 60, 1406, 708, 40, 28, violet, {
				...mono,
				binding: "roleOrganization",
				transform: "uppercase",
			}),
			text("edition-serial", "", 770, 1406, 194, 40, 28, violet, {
				...mono,
				...number,
				prefix: "Nº ",
				align: "right",
			}),
		],
	},
	back: {
		background: violet,
		layers: [
			gradient("night-ground", 0, 0, 1024, 1536, [violet, "#1f1c30"]),
			text("back-festival", "", 60, 108, 724, 36, 28, pearl, {
				...mono,
				...event,
				transform: "uppercase",
			}),
			text("edition-index", "", 810, 108, 154, 36, 28, pearl, {
				...mono,
				...number,
				align: "right",
			}),
			text("exhibition-title", "Fuera\nde campo.", 50, 208, 920, 292, 138, pearl, {
				...serif,
				tracking: -6,
				lineHeight: 0.94,
			}),
			path("exhibition-orbit", 54, 492, 910, 52, wave(910, 52, 1), "#bba5d5", { stroke: 2 }),
			text("participant-name", "", 54, 610, 918, 112, 84, pearl, { ...serif, ...name }),
			text("participant-role", "", 60, 744, 904, 44, 32, pearl, {
				...mono,
				binding: "roleOrganization",
			}),
			shape("exhibition-label", 48, 862, 928, 626, pearl, { protectMaterial: true }),
			text("exhibition-caption", "PASE DE EXPOSICIÓN", 82, 900, 862, 36, 26, violet, mono),
			rule("caption-rule", 82, 960, 862, violet, { opacity: 0.3 }),
			text("location-value", "", 82, 1012, 460, 90, 35, violet, {
				...serif,
				binding: "location",
				fit: "wrap",
				tracking: 0,
			}),
			text("date-value", "", 82, 1134, 460, 90, 33, violet, {
				...serif,
				binding: "date",
				fit: "wrap",
				tracking: 0,
			}),
			text("access-caption", "Cada mirada\nabre otro mundo.", 82, 1310, 464, 104, 37, violet, {
				...italic,
				tracking: -1,
				lineHeight: 1.2,
			}),
			qr(580, 1072, 364, violet, pearl),
		],
	},
};

const stock = "#f2edda";
const cobalt = "#263c9e";
const vermilion = "#e4482e";
const radio = {
	version: 1,
	source: "radio-risografica",
	name: "Radio risográfica",
	event: "RADIO NÓMADA",
	description:
		"Radio independiente en dos tintas: cobalto, bermellón, fotografía tramada y papel sin estucar.",
	artPrompt: "",
	material: { ...satin, roughness: 0.94 },
	front: {
		background: stock,
		layers: [
			paper(stock, cobalt),
			shape("masthead-rule", 50, 96, 924, 12, vermilion),
			text("radio-echo", "", 53, 150, 924, 412, 212, vermilion, {
				...display,
				...event,
				font: "brand",
				weight: "900",
				tracking: -5,
				fit: "wrap",
				lineHeight: 0.94,
				transform: "uppercase",
			}),
			text("radio-masthead", "", 48, 146, 924, 412, 212, cobalt, {
				...display,
				...event,
				font: "brand",
				weight: "900",
				tracking: -5,
				fit: "wrap",
				lineHeight: 0.94,
				transform: "uppercase",
			}),
			text("station-label", "ENCUENTRO DE RADIO INDEPENDIENTE", 56, 570, 908, 34, 27, cobalt, {
				...mono,
				tracking: 0,
			}),
			path(
				"transmission-band",
				54,
				690,
				126,
				424,
				"M124 20 C10 90 10 330 124 404 M124 84 C60 150 60 274 124 340 M124 156 C103 182 103 234 124 268",
				vermilion,
				{ stroke: 7 },
			),
			path("portrait-registration", 220, 642, 692, 580, ellipse(692, 580), vermilion, {
				stroke: 5,
			}),
			photo("broadcast-portrait", 238, 658, 656, 550, "mono", {
				clip: "ellipse",
				contrast: 1.02,
				brightness: 1.12,
				tint: "#5c6eba",
				tintMode: "color",
				tintOpacity: 0.75,
			}),
			path("portrait-screen", 238, 658, 656, 550, screenedEllipse(656, 550), cobalt, {
				stroke: 1,
				opacity: 0.18,
			}),
			shape("on-air-sticker", 708, 1086, 266, 126, vermilion, { rotation: -5 }),
			text("on-air-label", "EN VIVO", 724, 1116, 236, 66, 54, stock, { ...display, rotation: -5 }),
			grain(),
			text("participant-name", "", 50, 1270, 924, 110, 96, cobalt, {
				...display,
				...name,
				transform: "uppercase",
			}),
			text("participant-role", "", 56, 1398, 682, 40, 28, cobalt, {
				...mono,
				binding: "roleOrganization",
				transform: "uppercase",
			}),
			text("station-number", "", 758, 1398, 212, 40, 30, vermilion, {
				...display,
				...number,
				prefix: "FM / ",
				align: "right",
			}),
			shape("bottom-rule", 50, 1476, 924, 12, vermilion),
		],
	},
	back: {
		background: cobalt,
		layers: [
			paper(cobalt, "#172965"),
			grain(),
			text("station-name", "", 58, 106, 908, 38, 28, stock, { ...mono, ...event }),
			text("broadcast-title", "SEÑAL\nABIERTA.", 44, 196, 936, 300, 154, stock, {
				...display,
				tracking: -2,
				lineHeight: 0.92,
			}),
			path("broadcast-wave", 58, 536, 908, 90, wave(908, 90, 9), vermilion, { stroke: 6 }),
			text("participant-name", "", 50, 690, 924, 108, 94, stock, {
				...display,
				...name,
				transform: "uppercase",
			}),
			text("participant-role", "", 58, 818, 908, 52, 38, stock, {
				...mono,
				binding: "roleOrganization",
			}),
			shape("identity-rule", 58, 916, 908, 10, vermilion),
			text("serial-label", "SEÑAL PERSONAL", 58, 974, 446, 34, 27, stock, mono),
			text("serial-value", "", 46, 1040, 468, 158, 148, stock, { ...display, ...number }),
			text("location-value", "", 58, 1242, 452, 84, 29, stock, {
				...mono,
				binding: "location",
				fit: "wrap",
				lineHeight: 1.2,
			}),
			text("date-value", "", 58, 1346, 452, 66, 29, stock, {
				...mono,
				binding: "date",
				fit: "wrap",
				lineHeight: 1.2,
			}),
			text("station-website", "", 58, 1460, 908, 34, 26, stock, { ...mono, binding: "website" }),
			qr(604, 1044, 362, cobalt, stock),
		],
	},
};

for (const replacement of [herbarium, frequency, postal, opal, radio]) {
	const design = badgeDesignSchema.parse(replacement);
	const index = catalog.findIndex((item: { source: string }) => item.source === design.source);
	if (index === -1) throw new Error(`Unknown study: ${design.source}`);
	catalog[index] = design;
}
await writeFile(file, `${JSON.stringify(catalog, null, "\t")}\n`);
console.log("Rebuilt five art directions. Twelve reference designs preserved.");
