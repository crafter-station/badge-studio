import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Badge Studio",
		short_name: "Badge Studio",
		description: "Your photo. Every style. Create badges with personality.",
		start_url: "/design",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#141414",
		icons: [
			{ src: "/brand-assets/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/brand-assets/icon-512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/brand-assets/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
