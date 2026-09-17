import { badgeDesignSchema } from "./badge-design";
import documents from "./catalog.json";

export const designCatalog = documents.map((document) => badgeDesignSchema.parse(document));

export function findDesign(source: string) {
	return designCatalog.find((design) => design.source === source);
}
