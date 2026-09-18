import { designCatalog } from "@crafter-station/badge-studio-design/catalog";

const sources = new Set([
	"herbario-azul",
	"frecuencia-acida",
	"terracota-postal",
	"opalo-lunar",
	"radio-risografica",
]);
export const showcaseDesigns = designCatalog.filter((design) => sources.has(design.source ?? ""));
export const showcaseAssets = new Set([
	"71d4488f-4cb9-4867-ba52-3abe520284c6",
	"314f02d1-316d-4e17-b51a-e3f448555fca",
	"743a479e-26b2-47a6-a2c5-2ed0ac00b668",
	...showcaseDesigns.flatMap((design) => (design.artwork ? [design.artwork.assetId] : [])),
]);
