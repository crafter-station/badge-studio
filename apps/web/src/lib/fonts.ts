import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";

const instrumentSerif = Instrument_Serif({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-display-analog",
});

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	weight: ["500", "700"],
	variable: "--font-display-brutal",
});

export const fontBody = GeistSans;
export const fontMono = GeistMono;
export const fontPixel = GeistPixelSquare;
export const fontAnalog = instrumentSerif;
export const fontBrutal = spaceGrotesk;
