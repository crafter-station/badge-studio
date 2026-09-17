export const styleFixture = {
	version: 1 as const,
	name: "Archivo lunar",
	description: "Plata suave y grano editorial.",
	surface: "satin" as const,
	finish: "crystal" as const,
	palette: ["#172038", "#61718b", "#f7eedc"] as [string, string, string],
	accent: "#d7b187",
	portrait: { strength: 0.6, saturation: 0.5, contrast: 1 },
	texture: { pattern: "grain" as const, amount: 0.12, scale: 0.8 },
	material: { roughness: 0.7, iridescence: 0.12 },
	field: {
		layers: [
			{
				basis: "noise" as const,
				scale: 2,
				stretch: 1,
				angle: 20,
				warp: 1,
				drift: 0.12,
				weight: 1,
				blend: "add" as const,
			},
		],
		relief: 0.5,
		refraction: 0.2,
		film: 0.4,
		coverage: 0.8,
	},
	motion: { speed: 0.2, amplitude: 0.25 },
	heading: "serif" as const,
};
export const recipeFixture = {
	...styleFixture,
	seed: 55,
	promptVersion: "style-director-v1" as const,
	model: "google/gemini-2.5-flash",
};
