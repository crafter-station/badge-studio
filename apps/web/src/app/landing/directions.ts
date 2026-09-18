export const directions = [
	{
		id: "thermal",
		name: "Térmico",
		note: "Heat Signal. A human frequency, turned all the way up.",
		category: "Materials",
	},
	{
		id: "prism",
		name: "Prisma",
		note: "Afterlight. An optical gathering, a different point of view.",
		category: "Materials",
	},
	{
		id: "chrome",
		name: "Cromo",
		note: "Chrome Club. Brushed steel for objects in motion.",
		category: "Materials",
	},
	{
		id: "gtm",
		name: "The GTM Hackathon",
		note: "Liquid color. Built to move.",
		category: "Experimental",
	},
	{
		id: "she-ships",
		name: "She Ships",
		note: "Bold type, soft pink, full confidence.",
		category: "Editorial",
	},
	{
		id: "next-craft",
		name: "The Next Craft",
		note: "A little handmade. A little digital.",
		category: "Editorial",
	},
	{
		id: "andes",
		name: "Hack the Andes",
		note: "Mountain air. Electric energy.",
		category: "Experimental",
	},
	{
		id: "peru-ai",
		name: "IA Hackathon Perú",
		note: "High contrast, unmistakable character.",
		category: "Editorial",
	},
	{ id: "vibecode", name: "Vibecode Fest", note: "A festival you can wear.", category: "Retro" },
	{
		id: "hackzero-winter",
		name: "HackZero · Navidad",
		note: "Winter graphics, warm company.",
		category: "Retro",
	},
	{
		id: "hackzero",
		name: "HackZero · Builder",
		note: "A badge for the ones who build.",
		category: "Experimental",
	},
	{
		id: "cursor-buildathon",
		name: "Cursor Buildathon",
		note: "Terminal spirit. A fresh perspective.",
		category: "Retro",
	},
] as const;

export const previewUrl = (id: string, side = "front") =>
	`/prism/collection/previews/${id}-${side}.webp`;

export const orbitObjects = directions.map((direction) => ({
	id: direction.id,
	label: direction.name,
	physical: direction.category === "Materials",
}));
