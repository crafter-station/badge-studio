import { design, flow, p, q, rule, s, t, upper } from "./builders";
const gtmHeader = () => [
	t("event-line-one", "THE GTM", 82, 270, 860, 123, "brand", "#100d20"),
	t("event-line-two", "HACKATHON", 82, 369, 860, 102, "brand", "#100d20"),
	t("tagline", "48 HOURS OF REAL EXECUTION", 90, 425, 843, 21, "mono", "#100d20", { tracking: 3 }),
	t("left-edge", "REAL CHALLENGES. REAL RESULTS.", 22, 480, 25, 17, "mono", "#693861", {
		y: 446,
		h: 784,
		rotation: -90,
		baselineOffset: 17,
		tracking: 4,
	}),
	t("right-edge", "REAL CHALLENGES. REAL RESULTS.", 977, 480, 25, 17, "mono", "#693861", {
		y: 463,
		h: 784,
		rotation: 90,
		tracking: 4,
	}),
];
export const gtm = design(
	"gtm",
	"The GTM Hackathon",
	"Bandas magenta y cian, fotografía monocroma y tipografía precisa sobre papel claro.",
	"#f8eff3",
	[
		flow(),
		...gtmHeader(),
		p(174, 510, 676, 664),
		s("crop-marks", 158, 494, 708, 696, "#100d20", "corners"),
		t("name", "$name", 81, 1292, 866, 91, "display", "#100d20", upper),
		s("number-plate", 81, 1345, 116, 89, "#100d20"),
		t("number", "$number", 101, 1403, 90, 30, "mono", "#f8eff3", { prefix: "" }),
		t("role", "$role", 230, 1388, 692, 30, "mono", "#100d20", upper),
		t("organization", "$organization", 231, 1430, 692, 23, "mono", "#100d20"),
		rule("footer-rule", 1470, "#100d20", 82, 859),
		t("footer", "LATAMBUILDS / GO TO MARKET", 86, 1510, 859, 17, "mono", "#100d20"),
	],
	[
		flow(),
		...gtmHeader(),
		t("name", "$name", 82, 553, 861, 89, "display", "#100d20", upper),
		...(["role", "organization", "event"] as const).flatMap((binding, i) => {
			const y = 646 + i * 97;
			return [
				s(`meta-plate-${i}`, 86, y - 43, 70, 62, "#100d20"),
				t(`meta-number-${i}`, `0${i + 1}`, 101, y, 50, 27, "mono", "#f8eff3"),
				t(
					`meta-label-${i}`,
					["ROL", "EQUIPO", "EDICIÓN"][i],
					185,
					y - 12,
					170,
					16,
					"mono",
					"#100d20",
				),
				t(binding, `$${binding}`, 397, y + 1, 533, 27, "mono", "#100d20", upper),
				rule(`meta-rule-${i}`, y + 29, "#100d20", 184, 743),
			];
		}),
		{ ...s("qr-paper", 76, 958, 388, 388, "#ffffff"), protectMaterial: true },
		t("build", "BUILD.", 508, 1058, 422, 72, "display", "#100d20"),
		t("go", "GO TO", 508, 1156, 422, 72, "display", "#100d20"),
		t("market", "MARKET.", 508, 1254, 422, 72, "display", "#100d20"),
		t("website", "$website", 86, 1405, 840, 20, "mono", "#100d20"),
		rule("footer-rule", 1457, "#100d20", 82, 859),
		t("footer", "REAL CHALLENGES. REAL RESULTS.", 86, 1505, 850, 18, "mono", "#100d20"),
		q(92, 974, 360),
	],
);
