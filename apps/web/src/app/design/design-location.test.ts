import { expect, test } from "bun:test";
import { designCatalog } from "@crafter-station/badge-studio-design/catalog";
import { designHref, readDesignLocation } from "./design-location";

test("a community deep link stays addressable after switching away and back", () => {
	const community = { kind: "remix" as const, id: "2c66b839-e998-47bc-885b-25cb7a48488d" };
	const url = designHref(community);
	expect(url).toBe("/design?remix=2c66b839-e998-47bc-885b-25cb7a48488d");
	expect(designHref({ kind: "style", id: "gtm" }, url)).toBe("/design?style=gtm");
	expect(designHref(community, "/design?style=gtm")).toBe(url);
	expect(readDesignLocation(new URL(url, "https://example.com").searchParams)).toEqual(community);
});

test("switches have one source of truth and preserve unrelated URL state", () => {
	for (const kind of ["style", "remix", "design"] as const) {
		const url = new URL(
			designHref(
				{ kind, id: "target" },
				"/design?style=old&remix=old&design=old&bridge=keep#session",
			),
			"https://example.com",
		);
		expect(url.searchParams.get("bridge")).toBe("keep");
		expect(url.hash).toBe("#session");
		expect([...url.searchParams.keys()].filter((key) => key !== "bridge")).toEqual([kind]);
		expect(readDesignLocation(url.searchParams)).toEqual({ kind, id: "target" });
	}
	expect(designHref(null, "/design?remix=old&bridge=keep#session")).toBe(
		"/design?bridge=keep#session",
	);
	expect(readDesignLocation(new URLSearchParams("style=&bridge=keep"))).toBeNull();
	expect(readDesignLocation(new URLSearchParams("style=gtm&design=saved&remix=public"))).toEqual({
		kind: "design",
		id: "saved",
	});
});

test("every collection source and URL-sensitive identifier survives a reload", () => {
	for (const id of [
		...designCatalog
			.map((item) => item.source)
			.filter((source): source is string => Boolean(source)),
		"Órbita / + # & ?",
		"a=b%20c",
	]) {
		const location = { kind: "style" as const, id };
		const url = new URL(designHref(location), "https://example.com");
		expect(readDesignLocation(url.searchParams)).toEqual(location);
		expect(url.hash).toBe("");
	}
});
