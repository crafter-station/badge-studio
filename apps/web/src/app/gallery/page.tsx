import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import { directions } from "../landing/directions";
import { DesignGallery } from "./design-gallery";
import "./gallery.css";

export const metadata = {
	title: "Gallery",
	description:
		"Every Badge Studio art direction. Explore both faces, find your style and make it yours.",
};

export default function GalleryPage() {
	const order = [...directions.map((item) => item.id), ...designCatalog.map((item) => item.source)];
	const items = designCatalog
		.filter((design) => design.source)
		.map((design) => {
			const reference = directions.find((item) => item.id === design.source);
			return {
				id: design.source as string,
				name: design.name,
				description: design.description,
				category: reference
					? reference.category === "Materials"
						? "Materials"
						: "Events"
					: "Studies",
				custom: !reference,
			};
		})
		.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
	return <DesignGallery directions={items} />;
}
