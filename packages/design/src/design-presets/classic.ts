import type { BadgeLayer } from "../badge-design";
import { type TextLayer, design, g, p, q, s, t, upper } from "./builders";
export function classic(
	id: string,
	event: string,
	title: string[],
	subtitle: string,
	base: string,
	ink: string,
	accent: string,
	font: TextLayer["font"],
	layout: "winter" | "terminal" | "postage",
) {
	const variant = layout === "winter" ? "snow" : layout === "postage" ? "postal" : "grid";
	const decoration = () => [g("paper", "paper", 0, 0, 1024, 1536, base, accent, { variant, ink })];
	const x = layout === "terminal" ? 102 : layout === "postage" ? 160 : 140;
	const y = layout === "winter" ? 397 : layout === "postage" ? 412 : 367;
	const w = 1024 - x * 2;
	const h = layout === "winter" ? 740 : layout === "postage" ? 704 : 786;
	const front: BadgeLayer[] = [
		...decoration(),
		...(layout === "postage"
			? [{ ...s("photo-matte", 142, 400, 740, 752, base), channel: "print" as const }]
			: []),
		p(x, y, w, h, {
			filter: layout === "terminal" ? "mono" : "warm",
			clip: layout === "winter" ? "arch" : "rectangle",
		}),
		...(layout === "postage"
			? [
					s("border", 40, 108, 944, 1385, accent, "frame"),
					s("border-inner", 47, 115, 930, 1371, accent, "frame"),
					s("crop-marks", 157, 409, 710, 710, accent, "corners"),
					g("stamp", "stamp", 796, 219, 128, 128, accent),
					t("stamp-year", "2026", 811, 277, 98, 15, "mono", accent, {
						align: "center",
						rotation: -9.167324722093172,
						x: 809.0284371931488,
						y: 262.15806236822664,
					}),
					t("stamp-edition", "EDITION", 811, 300, 98, 13, "mono", accent, {
						align: "center",
						rotation: -9.167324722093172,
						x: 812.8281764208984,
						y: 286.8534330767353,
					}),
				]
			: []),
		...(layout === "terminal"
			? [
					g("scanlines", "scanlines", x, y, w, h, accent, accent, { opacity: 0.08 }),
					s("crop-marks", x - 8, y - 8, w + 16, 802, accent, "corners"),
				]
			: []),
		t("subtitle", subtitle.toUpperCase(), 84, 173, 850, 19, "mono", accent),
		...title.map((value, i) =>
			t(
				`title-${i}`,
				value,
				78,
				279 + i * 83,
				layout === "postage" ? 695 : 866,
				title.length > 1 ? 85 : 105,
				font,
				ink,
			),
		),
		t("name", "$name", 78, 1280, 850, 95, font, ink, upper),
		t("role", "$role", 84, 1338, 390, 27, "mono", accent, { ...upper, prefix: "↗ " }),
		t("organization", "$organization", 548, 1338, 390, 23, "mono", ink, { align: "right" }),
		s("footer-rule", 82, 1380, 860, 1.5, `${ink}70`),
		t("location", "$location", 84, 1444, 700, 20, "mono", ink),
		t("number", "$number", 765, 1476, 175, 18, "mono", accent, { prefix: "Nº ", align: "right" }),
	];
	const back: BadgeLayer[] = [
		...decoration(),
		{ ...s("back-panel", 54, 110, 916, 1278, `${base}e8`), channel: "print" },
		g("back-motif", "grid", 0, 0, 1024, 1536, base, accent, { variant, ink, reverse: true }),
		t("event", "$event", 82, 176, 710, 40, font, ink, upper),
		t("reverse", "REVERSE", 770, 173, 170, 17, "mono", accent, { align: "right" }),
		s("header-rule", 82, 217, 860, 1.5, `${ink}65`),
		t("person-label", "THE PERSON", 84, 280, 850, 20, "mono", accent),
		t("name", "$name", 79, 380, 850, 95, font, ink, upper),
		t("role", "{role}  /  {organization}", 84, 436, 840, 29, "mono", ink, { binding: "template" }),
		s("identity-rule", 82, 483, 860, 1.5, `${ink}55`),
		t("edition-label", "THE EDITION", 84, 546, 850, 20, "mono", accent),
		t("subtitle", subtitle, 80, 622, 850, 51, font, ink),
		t("location", "$location", 84, 674, 850, 26, "mono", ink),
		s("meeting-rule", 82, 720, 860, 1.5, `${ink}55`),
		t("explore", "KEEP EXPLORING", 84, 786, 850, 20, "mono", accent),
		t("ideas", "Ideas travel.", 502, 905, 410, 48, font, ink),
		t("further", "Take yours further.", 502, 969, 410, 33, "serif", ink),
		t("website", "$website", 502, 1040, 405, 19, "mono", accent),
		g("stamp", "stamp", 594, 1076, 128, 128, accent),
		t("stamp-label", "BUILDER", 609, 1134, 98, 15, "mono", accent, {
			align: "center",
			rotation: -9.167324722093172,
			x: 607.0284371931488,
			y: 1119.1580623682266,
		}),
		t("stamp-edition", "EDITION", 609, 1157, 98, 13, "mono", accent, {
			align: "center",
			rotation: -9.167324722093172,
			x: 610.8281764208984,
			y: 1143.8534330767354,
		}),
		s("footer-rule", 82, 1260, 860, 1.5, `${ink}55`),
		t("closing", "Una persona. Muchas formas de crear.", 84, 1324, 850, 31, font, ink),
		t("signature", "$signature", 84, 1380, 840, 20, "mono", accent, { prefix: "ID " }),
		s("bottom-rule", 82, 1418, 860, 1.5, `${ink}55`),
		t("footer", "BADGE STUDY / INSPIRED EDITION", 84, 1468, 730, 17, "mono", ink),
		t("number", "$number", 790, 1468, 150, 20, "mono", accent, { prefix: "Nº ", align: "right" }),
		{ ...q(84, 823, 374), foreground: "#141414", maxCellSize: 10 },
	];
	return design(
		id,
		event,
		layout === "winter"
			? "Cristal de invierno, nieve y retrato con arco."
			: layout === "terminal"
				? "Fósforo cálido, retícula y líneas de escaneo."
				: "Cobre quemado, marco doble y sello de edición.",
		base,
		front,
		back,
		layout === "winter" ? "prism" : "satin",
	);
}
