import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import { directions } from "../landing/directions";
import "../community/community.css";
import { DesignGallery, type GalleryFilter } from "./design-gallery";
import "./gallery.css";

export const metadata = {
	title: "Gallery",
	description:
		"Curated Badge Studio art directions and community creations. Explore both faces, find your style and make it yours.",
};

function readFilter(value?: string): GalleryFilter {
	if (value === "curated" || value === "community") return value;
	return "all";
}

export default async function GalleryPage({
	searchParams,
}: {
	searchParams: Promise<{ filter?: string }>;
}) {
	const { filter } = await searchParams;
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
	return <DesignGallery directions={items} initialFilter={readFilter(filter)} />;
}
