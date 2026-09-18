import { badgeDesignSchema } from "./badge-design";
import documents from "./catalog.json";
import nocheAbierta from "./noche-abierta.json";

export const designCatalog = [...documents, nocheAbierta].map((document) =>
	badgeDesignSchema.parse(document),
);

export function findDesign(source: string) {
	return designCatalog.find((design) => design.source === source);
}
