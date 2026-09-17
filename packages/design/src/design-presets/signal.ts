import type { BadgeLayer } from "../badge-design";
import { design, g, p, q, s, t, upper } from "./builders";
const signalFrame = (id: string, y: number, h: number): BadgeLayer[] => [
	s(`${id}-rule`, 72, y, 660, h, "#f4f4f2", "frame", 0.22),
	s(id, 72, y, 660, h, "#f4f4f2", "corners"),
];
const signalHeader = (): BadgeLayer[] => [
	...signalFrame("header", 148, 190),
	t("event", "iA HACKATHON", 106, 247, 590, 67, "sans", "#f4f4f2", {
		weight: "400",
		highlights: [{ text: "K", color: "#bd0a2b" }],
	}),
	s("red-dot", 109, 190, 6, 6, "#bd0a2b"),
	t("subtitle", "ROAD TO START HACK", 107, 297, 587, 21, "mono", "#f4f4f2", { fit: "spread" }),
	t("role", "$admissionRole", 818, 283, 105, 95, "sans", "#f4f4f2", {
		y: 188,
		h: 1240,
		rotation: 90,
		baselineOffset: 105,
		fit: "spread",
		...upper,
	}),
	s("red-rule", 788, 148, 7, 52, "#bd0a2b"),
];
const numbers = (id: string, y: number) =>
	t(id, "#{number} * #{number} * #{number}", 108, y, 586, 26, "mono", "#f4f4f2", {
		binding: "template",
		fit: "spread",
		opacity: 0.4,
	});
export const signal = design(
	"peru-ai",
	"IA Hackathon Perú",
	"Grafito técnico, marcos abiertos y rol vertical.",
	"#090a0b",
	[
		g("paper", "paper", 0, 0, 1024, 1536, "#090a0b", "#bd0a2b", {
			variant: "technical",
			ink: "#f4f4f2",
		}),
		p(74, 442, 656, 658),
		...signalHeader(),
		numbers("numbers-top", 398),
		...signalFrame("photo-frame", 440, 662),
		numbers("numbers-bottom", 1149),
		...signalFrame("identity", 1186, 278),
		t("first-name", "$name", 365, 1266, 333, 67, "sans", "#f4f4f2", { ...upper, segment: "first" }),
		t("last-name", "$name", 365, 1335, 333, 67, "sans", "#f4f4f2", { ...upper, segment: "last" }),
		t("organization", "$organization", 368, 1395, 325, 30, "sans", "#f4f4f2"),
		q(93, 1202, 252),
	],
	[
		g("paper", "paper", 0, 0, 1024, 1536, "#090a0b", "#bd0a2b", {
			variant: "technical",
			ink: "#f4f4f2",
		}),
		...signalHeader(),
		numbers("numbers-top", 398),
		...signalFrame("identity", 440, 234),
		t("person", "LA PERSONA", 106, 485, 590, 17, "mono", "#bd0a2b"),
		t("name", "$name", 102, 565, 588, 65, "sans", "#f4f4f2", upper),
		t("role-and-team", "$roleOrganization", 106, 624, 590, 28, "mono", "#f4f4f2"),
		numbers("numbers-bottom", 735),
		...signalFrame("meeting", 777, 403),
		t("meeting-label", "EL ENCUENTRO", 437, 843, 258, 17, "mono", "#bd0a2b"),
		t("meeting-name", "iA Hackathon", 435, 905, 261, 31, "sans", "#f4f4f2"),
		t("location", "$location", 438, 959, 257, 23, "mono", "#f4f4f2"),
		t("date", "$date", 438, 1030, 257, 25, "mono", "#f4f4f2"),
		t("website", "$website", 105, 1143, 590, 20, "mono", "#f4f4f2"),
		...signalFrame("footer-frame", 1244, 220),
		t("road", "ROAD TO", 104, 1323, 586, 56, "sans", "#f4f4f2"),
		t("start", "START HACK", 104, 1384, 586, 56, "sans", "#f4f4f2"),
		t("footer", "EDICIÓN INSPIRADA", 108, 1430, 450, 16, "mono", "#f4f4f2", { opacity: 0.5 }),
		s("red-bar", 669, 1416, 24, 5, "#bd0a2b"),
		q(102, 817, 304),
	],
);
