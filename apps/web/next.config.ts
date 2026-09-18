import type { NextConfig } from "next";
const config: NextConfig = {
	devIndicators: false,
	distDir:
		process.env.BADGE_BUILD_DIR ?? (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
	transpilePackages: [
		"@crafter-station/badge-studio-design",
		"@crafter-station/badge-studio-renderer",
	],
	serverExternalPackages: ["sharp"],
	async headers() {
		return [
			{
				source: "/community/authorize",
				headers: [
					{ key: "Referrer-Policy", value: "no-referrer" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
				],
			},
		];
	},
};
export default config;
