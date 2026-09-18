import { SiteHeader } from "@/components/site-header";
import { fontAnalog, fontBody, fontMono, fontPixel } from "@/lib/fonts";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_APP_URL ||
			(process.env.VERCEL_PROJECT_PRODUCTION_URL
				? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
				: "http://localhost:3004"),
	),
	title: { default: "Badge Studio · Make something worth keeping", template: "%s · Badge Studio" },
	description:
		"A playground for badges with personality. Explore art directions, make them yours, and take the design into your own workflow.",
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
			<body>
				{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY ? (
					<ClerkProvider>{content}</ClerkProvider>
				) : (
					content
				)}
			</body>
		</html>
	);
}
