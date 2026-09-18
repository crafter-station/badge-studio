import { describe, expect, it } from "bun:test";
import { safeArtworkUrl } from "./design-assets";

const origin = "https://badges.example";

describe("artwork URL boundary", () => {
	it("accepts same-origin assets and browser-owned blobs", () => {
		expect(safeArtworkUrl("/prism/art.png", origin)).toBe(`${origin}/prism/art.png`);
		const blob = `blob:${origin}/b89ae1e4-897c-452f-bfee-df70bbf65747`;
		expect(safeArtworkUrl(blob, origin)).toBe(blob);
	});

	it("rejects remote origins, opaque blobs and unsupported protocols", () => {
		for (const url of [
			"https://other.example/art.png",
			"//other.example/art.png",
			"blob:https://other.example/id",
			"blob:null/id",
			"blob:javascript:alert(1)",
			"javascript:alert(1)",
			"file:///art.png",
			"http://badges.example/art.png",
			"https://badges.example@other.example/art.png",
		])
			expect(() => safeArtworkUrl(url, origin)).toThrow();
	});

	it("keeps the raster-only data URL boundary", () => {
		for (const type of ["png", "jpeg", "webp"]) {
			const url = `data:image/${type};base64,YWJj`;
			expect(safeArtworkUrl(url, origin)).toBe(url);
		}
		expect(() => safeArtworkUrl("data:image/svg+xml;base64,YWJj", origin)).toThrow();
		expect(() =>
			safeArtworkUrl(`data:image/png;base64,${"A".repeat(8_000_000)}`, origin),
		).toThrow();
	});
});
