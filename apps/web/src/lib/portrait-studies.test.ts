import { describe, expect, test } from "bun:test";
import { demoPortraitUrl, portraitStudies, resolveStudioPortrait } from "./portrait-studies";

describe("editor portrait identity", () => {
	test("each event resolves its own portrait and can return to the original", () => {
		for (const source of ["peru-ai", "next-craft", "vibecode", "hackzero-winter"]) {
			expect(resolveStudioPortrait(demoPortraitUrl, source, "event")).toBe(
				`/prism/portraits/alex-${source}.webp`,
			);
			expect(resolveStudioPortrait(demoPortraitUrl, source, "photo")).toBe(demoPortraitUrl);
		}
		expect(new Set(portraitStudies.map((study) => study.url)).size).toBe(4);
	});

	test("changing events never replaces an uploaded or external participant photo", () => {
		for (const url of [
			"blob:http://localhost/another-person",
			"/api/designs/assets/abc",
			"https://example.com/portrait.png",
		]) {
			for (const study of portraitStudies) {
				expect(resolveStudioPortrait(url, study.source, "event")).toBe(url);
				expect(resolveStudioPortrait(url, study.source, "photo")).toBe(url);
			}
		}
	});

	test("directions without a study keep the original instead of borrowing another event", () => {
		for (const source of ["she-ships", "gtm", "andes", "prism", "custom", undefined]) {
			expect(resolveStudioPortrait(demoPortraitUrl, source, "event")).toBe(demoPortraitUrl);
		}
	});
});
