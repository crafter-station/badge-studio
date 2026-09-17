import { designCatalog } from "@crafter-station/badge-studio-design/catalog";

const sources = new Set([
	"herbario-azul",
	"frecuencia-acida",
	"terracota-postal",
	"opalo-lunar",
	"radio-risografica",
]);
export const showcaseDesigns = designCatalog.filter((design) => sources.has(design.source ?? ""));
export const showcaseAssets = new Set(
	showcaseDesigns.flatMap((design) => (design.artwork ? [design.artwork.assetId] : [])),
);
