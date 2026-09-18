import type { PrismRecipe } from "@crafter-station/badge-studio-design/prism-style";
import type { PrismAppearance, PrismBadgeData } from "@crafter-station/badge-studio-renderer";
import { sampleParticipant } from "../../lib/sample-participant";

export const andesRecipe: PrismRecipe = {
	version: 1,
	name: "Obsidiana topográfica",
	description: "Vidrio ahumado, curvas de nivel grabadas y reflejos azul hielo.",
	surface: "satin",
	finish: "obsidian",
	palette: ["#080B10", "#6F9BFF", "#F6F3EE"],
	accent: "#6F9BFF",
	portrait: { strength: 0, saturation: 0, contrast: 1.14 },
	texture: { pattern: "none", amount: 0, scale: 1 },
	material: { roughness: 0.3, iridescence: 0.02 },
	field: {
		layers: [
			{
				basis: "noise",
				scale: 1.2,
				stretch: 0.8,
				angle: 25,
				warp: 0.8,
				drift: 0.015,
				weight: 1,
				blend: "add",
			},
		],
		relief: 0.55,
		refraction: 0.1,
		film: 0.015,
		coverage: 0.9,
	},
	shader: {
		version: 1,
		code: `let drift = vec2f(t * 0.009, sin(t * 0.065) * 0.06);
let q = p * vec2f(1.8, 1.2) + seed.xy * 3.0 + drift;
let broad = noise2(q) * 0.52;
let ridge = (1.0 - abs(noise2(q * 2.1 + vec2f(3.0, 7.0)))) * 0.28;
let detail = noise2(q * 4.8) * 0.07;
let touch = exp(-dot(p - pointer * 0.55, p - pointer * 0.55) * 3.0) * 0.045;
return clamp(broad + ridge + detail + touch - 0.14, -0.9, 0.9);`,
	},
	motion: { speed: 0.22, amplitude: 0.48 },
	heading: "sans",
	seed: 1838327995,
	promptVersion: "shader-director-v2",
	model: "curated/andes-topography",
};

export const andesAppearance: PrismAppearance = {
	recipe: andesRecipe,
	surface: "satin",
	filter: "mono",
	finish: "obsidian",
	motion: "living",
	crop: { x: 0.5, y: 0.5, zoom: 1 },
	face: { x: 0.5, y: 0.49, radius: 0.24 },
};

export const andesData = {
	design: "andes",
	...sampleParticipant,
	role: "attendee",
	number: 1,
	eventName: "Hack the Andes",
	accentColor: "#6f9bff",
	signature: { seed: 1838327995, version: 1 },
	publicUrl: "https://theandeshackathon.com/",
	metadata: {
		roleLabel: "Builder",
		eventName: "Hack the Andes",
		eventDate: "17–18 OCT 2026",
		location: "Lima, Perú",
		website: "https://theandeshackathon.com/",
		bio: "",
	},
} satisfies PrismBadgeData;
