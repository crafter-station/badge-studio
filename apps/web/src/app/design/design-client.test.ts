import { describe, expect, it } from "bun:test";
import { badgeDesignExamples } from "@crafter-station/badge-studio-design/badge-design-examples";
import { parseDesigns } from "./design-client";

describe("design responses", () => {
	it("rejects incomplete batches and malformed compositions", () => {
		expect(() => parseDesigns([badgeDesignExamples[0]], 3)).toThrow("every proposal");
		expect(() => parseDesigns([{ ...badgeDesignExamples[0], front: { layers: [] } }], 1)).toThrow(
			"needs fixing",
		);
		expect(parseDesigns(badgeDesignExamples.slice(0, 3), 3)).toHaveLength(3);
	});
});
