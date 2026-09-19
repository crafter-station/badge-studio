import { SiteHeader } from "@/components/site-header";
import { fontAnalog, fontBody, fontMono, fontPixel } from "@/lib/fonts";
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://badge-studio.crafter.run"),
	title: { default: "Badge Studio · Make something worth keeping", template: "%s · Badge Studio" },
	description:
		"A playground for badges with personality. Explore art directions, make them yours, and take the design into your own workflow.",
	applicationName: "Badge Studio",
	openGraph: {
		type: "website",
		siteName: "Badge Studio",
		title: "Badge Studio · Badges with personality",
		description:
			"Your photo. Every style. Make it yours. An open-source playground for beautiful badges.",
		images: [
			{
				url: "/brand-assets/og-image.png",
				width: 1200,
				height: 630,
				alt: "Badge Studio. Badges with personality, featuring Vibecode Fest, HackZero Navidad and The GTM Hackathon.",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Badge Studio · Badges with personality",
		description: "Your photo. Every style. Make it yours.",
		images: ["/brand-assets/og-image.png"],
	},
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "16x16 32x32 64x64" },
			{ url: "/brand-assets/favicon.svg", type: "image/svg+xml" },
		],
		apple: [{ url: "/brand-assets/apple-touch-icon.png", sizes: "180x180" }],
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const content = (
		<Providers>
			<SiteHeader />
			{children}
		</Providers>
	);
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${fontBody.variable} ${fontMono.variable} ${fontPixel.variable} ${fontAnalog.variable}`}
		>
			<body>{content}</body>
		</html>
	);
}
