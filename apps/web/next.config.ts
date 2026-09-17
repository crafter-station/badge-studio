import type { NextConfig } from "next";
const config: NextConfig = {
	devIndicators: false,
	distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
	transpilePackages: [
		"@crafter-station/badge-studio-design",
		"@crafter-station/badge-studio-renderer",
	],
	serverExternalPackages: ["sharp"],
};
export default config;
