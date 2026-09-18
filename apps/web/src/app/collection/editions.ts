import type { PrismRecipe } from "@crafter-station/badge-studio-design/prism-style";
import type {
	PrismAppearance,
	PrismBadgeData,
	PrismEdition,
} from "@crafter-station/badge-studio-renderer";
import { sampleParticipant } from "../../lib/sample-participant";
import { andesAppearance, andesData } from "../hack-the-andes/andes-data";
import { gtmFlow } from "./gtm-flow";

export type BadgeEdition = {
	id: string;
	name: string;
	material: string;
	description: string;
	year: string;
	sourceLabel: string;
	sourceUrl: string;
	data: PrismBadgeData;
	appearance: PrismAppearance;
};

type EditionInput = {
	id: string;
	name: string;
	material: string;
	description: string;
	year?: string;
	location?: string;
	url: string;
	source?: string;
	layout: PrismEdition["layout"];
	title: string[];
	subtitle: string;
	colors: [string, string, string];
	motif: PrismEdition["motif"];
	portrait?: PrismEdition["portrait"];
	typeface?: PrismEdition["typeface"];
	surface?: PrismAppearance["surface"];
};

function seedFor(value: string) {
	let seed = 2166136261;
	for (const char of value) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
	return seed;
}

function edition(input: EditionInput): BadgeEdition {
	const seed = seedFor(input.id);
	const paper = input.layout === "postage";
	const signal = input.layout === "signal";
	const editorial = input.layout === "editorial";
	const archive = input.layout === "archive";
	const desktop = input.layout === "window";
	const ribbon = input.layout === "ribbon";
	const surface = input.surface ?? "satin";
	const recipe: PrismRecipe = {
		version: 1,
		name: input.material,
		description: input.description,
		surface,
		finish: "obsidian",
		palette: input.colors,
		accent: input.colors[2],
		portrait: { strength: 0, saturation: 0, contrast: 1.1 },
		texture: { pattern: paper ? "grain" : "none", amount: paper ? 0.12 : 0, scale: 1 },
		material: {
			roughness: ribbon
				? 0.78
				: desktop
					? 0.9
					: archive
						? 0.92
						: signal
							? 0.84
							: editorial
								? 0.73
								: paper
									? 0.78
									: surface === "chrome"
										? 0.32
										: 0.48,
			iridescence: surface === "prism" ? 0.34 : 0.02,
		},
		field: {
			layers: [
				{
					basis:
						input.motif === "waves"
							? "ribbons"
							: input.motif === "orbit"
								? "rings"
								: input.motif === "petals"
									? "cells"
									: "noise",
					scale: paper ? 2.6 : 1.6,
					stretch: 0.85,
					angle: (seed % 90) - 45,
					warp: paper ? 0.18 : 0.65,
					drift: 0.03,
					weight: 1,
					blend: "add",
				},
			],
			relief: ribbon
				? 0.16
				: archive || desktop
					? 0.07
					: signal || editorial
						? 0.12
						: paper
							? 0.09
							: 0.48,
			refraction: ribbon
				? 0.035
				: archive || desktop
					? 0.01
					: signal || editorial
						? 0.02
						: paper
							? 0.015
							: 0.13,
			film: surface === "prism" ? 0.5 : 0.015,
			coverage: ribbon
				? 0.92
				: archive || desktop
					? 0.18
					: signal || editorial
						? 0.22
						: paper
							? 0.28
							: 0.8,
		},
		...(ribbon ? { shader: { version: 1 as const, code: gtmFlow } } : {}),
		motion: { speed: ribbon ? 0.4 : paper ? 0.13 : 0.26, amplitude: ribbon ? 0.27 : 0.4 },
		heading: input.typeface === "serif" ? "serif" : input.typeface === "mono" ? "mono" : "sans",
		seed,
		promptVersion: "material-director-v3",
		model: "curated/event-collection",
	};
	return {
		id: input.id,
		name: input.name,
		material: input.material,
		description: input.description,
		year: input.year ?? "2026",
		sourceLabel: input.source ? "Repositorio original" : "Identidad del evento",
		sourceUrl: input.source ?? input.url,
		data: {
			...sampleParticipant,
			role: "attendee",
			number: 1,
			eventName: input.name,
			accentColor: input.colors[2],
			portraitUrl: andesData.portraitUrl,
			signature: { seed, version: 1 },
			publicUrl: input.url,
			metadata: {
				roleLabel: "Builder",
				eventName: input.name,
				eventDate: `Edición ${input.year ?? "2026"}`,
				location: input.location ?? "Latinoamérica",
				website: input.url,
				bio: input.description,
			},
			edition: {
				layout: input.layout,
				title: input.title,
				subtitle: input.subtitle,
				base: input.colors[0],
				ink: input.colors[1],
				accent: input.colors[2],
				motif: input.motif,
				portrait: input.portrait ?? "mono",
				typeface: input.typeface ?? "display",
			},
		},
		appearance: {
			recipe,
			surface,
			filter: "mono",
			finish: "obsidian",
			motion: "living",
			crop: { x: 0.5, y: 0.5, zoom: 1 },
			face: editorial ? { x: 0.54, y: 0.435, radius: 0.26 } : { x: 0.5, y: 0.48, radius: 0.26 },
		},
	};
}

const codeBrewSource = "https://github.com/crafter-station/code-brew-bog";

export const badgeEditions: BadgeEdition[] = [
	{
		id: "andes",
		name: "Hack the Andes",
		material: "Obsidiana topográfica",
		description: "Vidrio ahumado, relieve vivo y líneas que recorren la luz.",
		year: "2026",
		sourceLabel: "Identidad del evento",
		sourceUrl: "https://theandeshackathon.com/",
		data: andesData,
		appearance: andesAppearance,
	},
	edition({
		id: "peru-ai",
		name: "IA Hackathon Perú",
		material: "Grafito técnico",
		description: "Marcos abiertos, numeración y un rol vertical. Blanco y rojo sobre grafito vivo.",
		year: "2025",
		location: "Lima, Perú",
		url: "https://www.peru.ai-hackathon.co/",
		source: "https://github.com/crafter-station/peru.ai-hackathon.co",
		layout: "signal",
		title: ["iA HACKATHON"],
		subtitle: "Road to Start Hack",
		colors: ["#090a0b", "#f4f4f2", "#bd0a2b"],
		motif: "grid",
		typeface: "sans",
		surface: "satin",
	}),
	edition({
		id: "hackzero-winter",
		name: "HackZero · Navidad",
		material: "Cristal de invierno",
		description: "Una tarjeta de regalo convertida en vidrio escarchado, verde pino y nieve.",
		year: "2025",
		url: "https://hack0.dev/",
		source:
			"https://github.com/crafter-station/hack0/commit/10f7db8c0556d4be06e52d0d758b885a0dd8b2b6",
		layout: "winter",
		title: ["Season of", "builders."],
		subtitle: "HackZero / Holiday edition",
		colors: ["#153b33", "#f3ead7", "#c4dba4"],
		motif: "snow",
		portrait: "warm",
		typeface: "serif",
		surface: "prism",
	}),
	edition({
		id: "hackzero",
		name: "HackZero · Builder",
		material: "Terminal ámbar",
		description: "El carnet de la comunidad, con fósforo cálido y una retícula de ingeniería.",
		url: "https://hack0.dev/",
		source: "https://github.com/crafter-station/hack0",
		layout: "terminal",
		title: ["HACK0.DEV"],
		subtitle: "The builder community",
		colors: ["#171711", "#f3f0d7", "#e4cb7e"],
		motif: "grid",
		typeface: "mono",
	}),
	edition({
		id: "she-ships",
		name: "She Ships",
		material: "Retrato en foco",
		description: "Fotografía magenta, una mirada conectada y acentos verdes sobre negro satinado.",
		location: "Bogotá, Colombia",
		url: "https://she.ships/",
		source: "https://github.com/crafter-station/she.ships",
		layout: "editorial",
		title: ["SHE SHIPS"],
		subtitle: "Build boldly. Ship together.",
		colors: ["#101411", "#edede5", "#9cd98c"],
		motif: "grid",
		portrait: "rose",
		surface: "satin",
	}),
	edition({
		id: "gtm",
		name: "The GTM Hackathon",
		material: "Flujo cromático",
		description: "Bandas magenta y cian que fluyen y responden al cursor sobre papel claro.",
		url: "https://crafters.chat/",
		source: `${codeBrewSource}/tree/abe6307`,
		layout: "ribbon",
		title: ["THE GTM", "HACKATHON"],
		subtitle: "48 hours of real execution",
		colors: ["#f8eff3", "#100d20", "#e963e8"],
		motif: "waves",
		typeface: "sans",
	}),
	edition({
		id: "cursor-buildathon",
		name: "Cursor Buildathon",
		material: "Cobre quemado",
		description:
			"Negro café, detalles naranja y un marco de cobre para una edición de construcción.",
		location: "El Salvador",
		url: "https://cursor.com/",
		source: `${codeBrewSource}/tree/2881299`,
		layout: "postage",
		title: ["CURSOR", "BUILDATHON"],
		subtitle: "El Salvador / 2026",
		colors: ["#1b140f", "#f7f2e6", "#f0743d"],
		motif: "grid",
		portrait: "warm",
	}),
	edition({
		id: "vibecode",
		name: "Vibecode Fest",
		material: "Escritorio de recuerdos",
		description: "Cielo, pradera y ventanas azules. Tu retrato en el escritorio del festival.",
		location: "UTEC",
		url: "https://crafter.run/vibe",
		source: "https://github.com/crafter-station/vibecode-fest-badges",
		layout: "window",
		title: ["VIBE CODE", "FEST"],
		subtitle: "Vamos al Vibe Code Fest",
		colors: ["#dedede", "#141414", "#ffe000"],
		motif: "waves",
	}),
	edition({
		id: "next-craft",
		name: "The Next Craft",
		material: "Grano de archivo",
		description: "Retrato en hueso, marca manuscrita y grano fino con un QR en la esquina.",
		url: "https://thenextcraft.crafter.run/",
		source: "https://thenextcraft.crafter.run/en/participant/055",
		layout: "archive",
		title: ["the next craft"],
		subtitle: "Hecho para crear",
		colors: ["#1a1a17", "#c4c2b9", "#e6e3d8"],
		motif: "grid",
		portrait: "mono",
		typeface: "mono",
	}),
];

export function getBadgeEdition(id?: string) {
	return badgeEditions.find((item) => item.id === id) ?? badgeEditions[0];
}
