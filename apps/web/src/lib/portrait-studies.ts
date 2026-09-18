export type PortraitMode = "event" | "photo";

export const demoPortraitUrl = "/api/demo-portrait";

export const portraitStudies = [
	{
		source: "peru-ai",
		label: "Retrato en grafito",
		description: "Tu foto en píxeles finos de grafito, conservando el encuadre y las proporciones.",
	},
	{
		source: "next-craft",
		label: "Retrato de archivo",
		description: "Píxeles grandes, sombras de carbón y luces en hueso.",
	},
	{
		source: "vibecode",
		label: "Píxel de escritorio",
		description: "La misma foto y pose, reconstruida en píxeles monocromos y tramado fino.",
	},
	{
		source: "hackzero-winter",
		label: "Retrato navideño",
		description: "Tu retrato en pixel art a color, con el mismo encuadre y un detalle navideño.",
	},
].map((study) => ({
	...study,
	url: `/prism/portraits/${study.source}${study.source === "next-craft" ? "" : "-v2"}.webp`,
}));

export function portraitStudyFor(source?: string) {
	return portraitStudies.find((study) => study.source === source);
}

export function resolveStudioPortrait(url: string, source: string | undefined, mode: PortraitMode) {
	if (url !== demoPortraitUrl || mode === "photo") return url;
	return portraitStudyFor(source)?.url ?? url;
}
