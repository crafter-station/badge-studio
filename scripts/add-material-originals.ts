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
	binding: "none",
	text: value,
	x,
	y,
	w,
	h,
	size,
	color,
	font: "sans",
	weight: "500",
	align: "left",
	fit: "shrink",
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
	seed: 42091,
	...extra,
});

const gradient = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	colors: string[],
	direction = "diagonal",
) => ({
	id,
	kind: "gradient",
	x,
	y,
	w,
	h,
	direction,
	stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })),
});

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
	radius: 0,
	filter,
	contrast: 1,
	crop: { x: 0.5, y: 0.42, zoom: 1.08 },
	...extra,
});

const qr = (x: number, y: number, size: number, background: string) => ({
	id: "access-qr",
	kind: "qr",
	x,
	y,
	w: size,
	h: size,
	foreground: "#11121a",
	background,
});

const mono = { font: "mono", tracking: 2 };
const bold = { font: "display", weight: "800", tracking: -4 };
const serif = { font: "serif", weight: "400", tracking: -5 };
const spectrum = ["#3331a3", "#762aee", "#d320ac", "#fa3f2e", "#ff9b30", "#f7f35c"];
const bars = (x: number, y: number, w: number, h: number) =>
	spectrum.map((color, i) =>
		shape(`spectrum-${i}`, x + (i * w) / spectrum.length, y, w / spectrum.length, h, color, {
			protectMaterial: true,
		}),
	);
const barcode = (x: number, y: number, w: number, h: number, color: string) =>
	graphic("serial-bars", "path", x, y, w, h, color, {
		path: Array.from({ length: 40 }, (_, i) => {
			const at = (i / 40) * w;
			const width = i % 3 === 0 ? 5 : 2;
			return `M${at} 0 h${width} v${h} h-${width} Z`;
		}).join(" "),
	});

function thermalFaces() {
	const ink = "#fcf66d";
	const paper = "#160d2b";
	return {
		front: [
			gradient("thermal-bed", 0, 0, 1024, 1536, [paper, "#302053", "#c53731"]),
			graphic("signal-grid", "grid", 0, 0, 1024, 1536, "#180f2b", {
				accent: "#ef7337",
				opacity: 0.27,
				density: 0.25,
			}),
			text("edition", "HS / 01 / A HUMAN FREQUENCY", 66, 108, 892, 45, 25, ink, mono),
			text("heat", "HEAT", 55, 174, 914, 230, 220, ink, {
				font: "sans",
				weight: "900",
				tracking: -6,
				fit: "spread",
			}),
			text("signal", "SIGNAL", 68, 397, 610, 83, 67, ink, { ...bold, tracking: 14 }),
			photo("hero-portrait", 139, 485, 746, 709, "thermal", {
				fade: { x: 0.025, top: 0.04, bottom: 0.24 },
			}),
			graphic("portrait-corners", "path", 122, 482, 780, 698, ink, {
				path: "M0 55 V0 H55 M725 0 H780 V55 M0 643 V698 H55 M725 698 H780 V643",
				stroke: 3,
			}),
			...Array.from({ length: 15 }, (_, i) =>
				shape(`calibration-${i}`, 67, 515 + i * 37, i % 3 === 0 ? 33 : 16, 2, ink, {
					opacity: 0.65,
				}),
			),
			text("human-signal", "HUMAN SIGNAL DETECTED", 931, 499, 34, 614, 21, ink, {
				...mono,
				rotation: 90,
			}),
			text("name", "", 68, 1199, 888, 124, 105, "#fff5e4", {
				binding: "name",
				transform: "uppercase",
				weight: "800",
				tracking: -5,
			}),
			shape("access-strip", 65, 1343, 894, 69, ink, { protectMaterial: true }),
			text("role", "", 86, 1356, 590, 47, 30, paper, {
				binding: "role",
				transform: "uppercase",
				...mono,
			}),
			text("number", "", 728, 1355, 207, 47, 31, paper, {
				binding: "number",
				prefix: "",
				align: "right",
				...mono,
			}),
			...bars(66, 1440, 382, 14),
			text("organization", "", 500, 1434, 454, 38, 24, ink, {
				binding: "organization",
				align: "right",
				...mono,
			}),
		],
		back: [
			gradient("thermal-bed", 0, 0, 1024, 1536, [paper, "#72244c", "#ff6528"]),
			graphic("heat-contours", "terrain", 0, 0, 1024, 1536, ink, { opacity: 0.28 }),
			text("edition", "HEAT SIGNAL / PERSONAL TRANSMISSION", 69, 113, 886, 40, 23, ink, mono),
			text("stay", "STAY", 61, 188, 881, 202, 187, ink, bold),
			text("in-signal", "IN SIGNAL.", 62, 366, 890, 154, 144, ink, bold),
			photo("portrait-detail", 71, 567, 295, 350, "thermal", { radius: 2 }),
			graphic("waveform", "path", 427, 596, 515, 207, ink, {
				path: "M0 110 H52 L71 72 L98 150 L119 27 L145 179 L169 107 H219 L239 63 L263 150 L285 6 L312 201 L339 110 H395 L417 49 L442 163 L467 110 H515",
				stroke: 4,
			}),
			text("signal-label", "ONE HUMAN.\nENDLESS POSSIBILITIES.", 432, 833, 505, 69, 22, ink, {
				...mono,
				fit: "wrap",
			}),
			text("name", "", 67, 957, 884, 107, 82, "#fff5e4", {
				binding: "name",
				weight: "800",
				tracking: -3,
				transform: "uppercase",
			}),
			shape("divider", 71, 1090, 883, 2, ink),
			text("role", "", 71, 1140, 480, 56, 36, ink, {
				binding: "role",
				transform: "uppercase",
				...mono,
			}),
			text("organization", "", 71, 1209, 476, 51, 30, "#fff5e4", { binding: "organization" }),
			text("serial", "", 71, 1301, 480, 49, 26, ink, {
				binding: "signature",
				prefix: "SIGNAL / ",
				...mono,
			}),
			text("entry", "SCAN TO CONNECT ↗", 73, 1406, 481, 47, 23, ink, mono),
			...bars(73, 1462, 466, 12),
			qr(614, 1141, 326, "#fff6c5"),
		],
	};
}

function prismFaces() {
	const ink = "#252540";
	const lilac = "#7655c4";
	const glass = () => [
		gradient("opal-paper", 0, 0, 1024, 1536, ["#f2eadd", "#d7dcec", "#eadde8"]),
		graphic("optical-triangle", "path", 74, 475, 829, 670, "#b9a3dc", {
			path: "M4 552 L445 5 L823 661 Z",
			fill: true,
			stroke: 2,
			accent: "#806baf",
			opacity: 0.38,
		}),
		...Array.from({ length: 7 }, (_, i) =>
			graphic(`light-ray-${i}`, "path", 75, 556, 870, 441, lilac, {
				path: `M0 ${360 - i * 22} L380 ${103 + i * 4} L870 ${30 + i * 40}`,
				stroke: 2,
				opacity: 0.4,
			}),
		),
	];
	return {
		front: [
			...glass(),
			text("edition", "PRISM / AN OPTICAL GATHERING", 74, 113, 875, 44, 23, ink, mono),
			photo("hero-portrait", 368, 448, 568, 724, "original", {
				clip: "arch",
				fade: { x: 0, top: 0, bottom: 0.06 },
				crop: { x: 0.5, y: 0.47, zoom: 1.03 },
			}),
			text("after", "after", 65, 207, 784, 214, 207, ink, { ...serif, italic: true }),
			text("light", "light.", 159, 367, 747, 214, 207, ink, { ...serif, italic: true }),
			graphic("optical-disc", "stamp", 89, 636, 224, 224, lilac, { stroke: 2 }),
			graphic("optical-cross", "cross", 131, 678, 140, 140, lilac, { stroke: 2 }),
			text("angle", "360°", 113, 892, 198, 77, 56, ink, serif),
			text("angle-caption", "A DIFFERENT\nPOINT OF VIEW.", 82, 986, 245, 95, 21, ink, {
				...mono,
				lineHeight: 1.65,
			}),
			text("name", "", 71, 1205, 881, 124, 86, ink, {
				binding: "name",
				...serif,
				tracking: -3,
			}),
			shape("divider", 73, 1358, 877, 2, lilac, { opacity: 0.6 }),
			text("role", "", 74, 1398, 385, 56, 30, ink, {
				binding: "role",
				...mono,
				transform: "uppercase",
			}),
			text("number", "", 761, 1395, 187, 57, 39, ink, {
				binding: "number",
				prefix: "N° ",
				align: "right",
				...serif,
				tracking: 0,
			}),
		],
		back: [
			...glass(),
			text("edition", "AFTERLIGHT / THE OTHER SIDE", 74, 113, 870, 43, 24, ink, mono),
			text("another", "Another", 68, 213, 882, 161, 151, ink, { ...serif, italic: true }),
			text("perspective", "perspective.", 68, 352, 884, 165, 145, ink, {
				...serif,
				italic: true,
			}),
			photo("portrait-detail", 743, 564, 195, 246, "original", {
				clip: "ellipse",
				crop: { x: 0.5, y: 0.4, zoom: 1.25 },
			}),
			graphic("optical-disc", "stamp", 90, 558, 250, 250, lilac, { stroke: 2 }),
			graphic("lens-focus", "cross", 139, 607, 151, 151, lilac, { stroke: 2 }),
			text("name", "", 73, 857, 871, 118, 80, ink, { binding: "name", ...serif }),
			text("organization", "", 76, 992, 856, 51, 29, ink, {
				binding: "roleOrganization",
				...mono,
			}),
			shape("divider", 74, 1077, 875, 2, lilac, { opacity: 0.6 }),
			text("invitation", "Meet on the\nother side.", 459, 1145, 474, 151, 64, ink, {
				...serif,
				tracking: -2,
			}),
			text("scan-label", "YOUR INVITATION ↙", 464, 1328, 468, 47, 23, ink, mono),
			text("number", "EDITION 02 / N° {number}", 467, 1410, 472, 58, 34, ink, {
				binding: "template",
				...mono,
			}),
			qr(76, 1140, 328, "#faf5ed"),
		],
	};
}

function chromeFaces() {
	const ink = "#15171b";
	const white = "#f5f7ef";
	const acid = "#dfff5a";
	const steel = () => [
		gradient("brushed-steel", 0, 0, 1024, 1536, [
			"#c0c8cf",
			"#fafbf6",
			"#8e999f",
			"#e6eae7",
			"#a0a8ac",
		]),
		graphic("machining-lines", "scanlines", 0, 0, 1024, 1536, "#293239", { opacity: 0.16 }),
		...[
			[47, 116],
			[951, 116],
			[47, 1470],
			[951, 1470],
		].map(([x, y], index) => graphic(`rivet-${index}`, "cross", x, y, 22, 22, ink, { stroke: 2 })),
	];
	return {
		front: [
			...steel(),
			shape("header-plate", 74, 140, 875, 252, ink, { protectMaterial: true }),
			text("chrome-title", "CHROME", 87, 169, 849, 151, 148, white, {
				weight: "900",
				italic: true,
				tracking: -6,
			}),
			text("edition", "CLUB / OBJECTS IN MOTION", 104, 333, 815, 40, 23, acid, mono),
			graphic("chassis", "path", 75, 428, 873, 648, ink, {
				path: "M1 1 H793 L872 80 V647 H80 L1 568 Z",
				stroke: 3,
				fill: true,
				protectMaterial: true,
			}),
			photo("hero-portrait", 124, 477, 775, 548, "silver", {
				crop: { x: 0.5, y: 0.32, zoom: 1 },
				contrast: 1.1,
			}),
			shape("label-tab", 664, 987, 238, 61, acid, { protectMaterial: true }),
			text("role-code", "", 681, 999, 201, 40, 22, ink, {
				binding: "role",
				transform: "uppercase",
				align: "center",
				...mono,
			}),
			text("portrait-label", "OWNER / IDENTITY CAPTURE", 91, 1091, 849, 43, 21, ink, mono),
			text("first-name", "", 77, 1161, 864, 99, 84, ink, {
				binding: "name",
				segment: "first",
				transform: "uppercase",
				weight: "900",
				tracking: -5,
			}),
			text("last-name", "", 77, 1248, 664, 106, 93, ink, {
				binding: "name",
				segment: "last",
				transform: "uppercase",
				weight: "900",
				tracking: -5,
			}),
			shape("footer-line", 78, 1372, 668, 3, ink),
			text("organization", "", 79, 1397, 638, 37, 23, ink, {
				binding: "roleOrganization",
				...mono,
			}),
			text("number", "", 79, 1453, 646, 41, 25, ink, {
				binding: "number",
				prefix: "CC / UNIT ",
				...mono,
			}),
			qr(790, 1325, 158, "#f5f7ef"),
		],
		back: [
			...steel(),
			shape("control-plate", 75, 141, 873, 314, ink, { protectMaterial: true }),
			text("access", "ACCESS", 102, 171, 810, 142, 128, white, {
				weight: "900",
				italic: true,
				tracking: -7,
			}),
			text("control", "CONTROL", 103, 302, 810, 133, 115, white, {
				weight: "900",
				italic: true,
				tracking: -6,
			}),
			photo("portrait-detail", 77, 497, 277, 350, "silver"),
			text("identity-label", "REGISTERED TO", 399, 503, 534, 44, 23, ink, mono),
			text("name", "", 394, 571, 540, 173, 75, ink, {
				binding: "name",
				fit: "wrap",
				weight: "800",
				tracking: -3,
				transform: "uppercase",
			}),
			text("organization", "", 400, 775, 531, 58, 29, ink, { binding: "organization", ...mono }),
			shape("access-strip", 77, 895, 872, 78, acid, { protectMaterial: true }),
			text("role", "", 96, 915, 832, 48, 31, ink, {
				binding: "role",
				transform: "uppercase",
				...mono,
			}),
			text("unit-label", "MEMBER UNIT", 82, 1031, 411, 51, 26, ink, mono),
			text("number", "", 75, 1102, 419, 139, 118, ink, {
				binding: "number",
				prefix: "",
				font: "sans",
				weight: "900",
				italic: true,
				tracking: -8,
			}),
			barcode(82, 1301, 404, 81, ink),
			text("serial", "", 82, 1404, 418, 48, 26, ink, { binding: "signature", ...mono }),
			text("scan-label", "SCAN / MAKE CONTACT", 564, 1440, 374, 42, 22, ink, mono),
			qr(566, 1045, 374, "#f5f7ef"),
		],
	};
}

const originals = [
	{
		id: "thermal",
		name: "Térmico",
		title: "HEAT SIGNAL",
		description:
			"Póster de señal térmica: tipografía monumental, calibración espectral y retrato infrarrojo.",
		surface: "satin",
		paper: "#160d2b",
		accent: "#ff7942",
		roughness: 0.45,
		iridescence: 0.08,
		colors: ["#160d2b", "#72244c", "#ff6528"],
		faces: thermalFaces(),
		focus: { x: 0.5, y: 0.52, radius: 0.28 },
	},
	{
		id: "prism",
		name: "Prisma",
		title: "AFTERLIGHT",
		description:
			"Encuentro óptico editorial: serif gestual, retrato en arco, rayos de luz y vidrio facetado.",
		surface: "prism",
		paper: "#ede6ec",
		accent: "#a89cde",
		roughness: 0.18,
		iridescence: 0.42,
		colors: ["#f2eadd", "#d7dcec", "#eadde8"],
		faces: prismFaces(),
		focus: { x: 0.64, y: 0.51, radius: 0.24 },
	},
	{
		id: "chrome",
		name: "Cromo",
		title: "CHROME CLUB",
		description:
			"Credencial de club industrial: chasis biselado, acero cepillado, placa tipográfica y acentos ácidos.",
		surface: "chrome",
		paper: "#bdc5ca",
		accent: "#dfff5a",
		roughness: 0.14,
		iridescence: 0.06,
		colors: ["#b1bcc4", "#f2f4ee", "#89969d"],
		faces: chromeFaces(),
		focus: { x: 0.5, y: 0.49, radius: 0.28 },
	},
];

for (const [index, p] of originals.entries()) {
	const recipe = {
		version: 1,
		promptVersion: "style-director-v1",
		model: "badge-studio-originals",
		name: p.name,
		description: p.description,
		surface: p.surface,
		finish: "crystal",
		palette: p.colors,
		accent: p.accent,
		portrait: { strength: 0, saturation: 1, contrast: 1 },
		texture: { pattern: "none", amount: 0, scale: 1 },
		material: { roughness: p.roughness, iridescence: p.iridescence },
		motion: { speed: 0.45, amplitude: 0.35 },
		heading: "sans",
		seed: 42091 + index * 519,
	};
	const design = badgeDesignSchema.parse({
		version: 1,
		source: p.id,
		name: p.name,
		description: p.description,
		event: p.title,
		artPrompt: "",
		material: {
			surface: p.surface,
			roughness: p.roughness,
			iridescence: p.iridescence,
			speed: 0.45,
			focus: p.focus,
			recipe,
		},
		front: { background: p.paper, layers: p.faces.front },
		back: { background: p.paper, layers: p.faces.back },
	});
	const existing = catalog.findIndex((item: { source: string }) => item.source === p.id);
	if (existing >= 0) catalog[existing] = design;
	else catalog.push(design);
}
await writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`);
console.log("Updated three validated material directions, with distinct fronts and backs.");
