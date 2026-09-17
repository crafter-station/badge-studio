import { badgeDesignSchema } from "./badge-design";
import { andes } from "./design-presets/andes";
import { archive } from "./design-presets/archive";
import { classic } from "./design-presets/classic";
import { vibecode } from "./design-presets/desktop";
import { she } from "./design-presets/editorial";
import { gtm } from "./design-presets/gtm";
import { signal } from "./design-presets/signal";
export const collectionDesigns = [
	gtm,
	andes,
	signal,
	classic(
		"hackzero-winter",
		"HackZero · Navidad",
		["Season of", "builders."],
		"HackZero / Holiday edition",
		"#153b33",
		"#f3ead7",
		"#c4dba4",
		"serif",
		"winter",
	),
	classic(
		"hackzero",
		"HackZero · Builder",
		["HACK0.DEV"],
		"The builder community",
		"#171711",
		"#f3f0d7",
		"#e4cb7e",
		"mono",
		"terminal",
	),
	she,
	classic(
		"cursor-buildathon",
		"Cursor Buildathon",
		["CURSOR", "BUILDATHON"],
		"El Salvador / 2026",
		"#1b140f",
		"#f7f2e6",
		"#f0743d",
		"display",
		"postage",
	),
	vibecode,
	archive,
].map((value) => badgeDesignSchema.parse(value));
