import { expect, test } from "bun:test";
import { validateCliToken } from "./community-cli";

const token = {
	clientId: "badgio",
	subject: "user_owner",
	scopes: ["profile"],
	revoked: false,
	expired: false,
	expiration: Math.floor(Date.now() / 1000) + 60,
};
test("CLI authority binds live user tokens to this exact OAuth client and scope", () => {
	expect(validateCliToken(token, "badgio")).toBe("user_owner");
	for (const patch of [
		{ clientId: "another-app" },
		{ subject: "org_owner" },
		{ scopes: [] },
		{ revoked: true },
		{ expired: true },
		{ expiration: Math.floor(Date.now() / 1000) - 1 },
	])
		expect(() => validateCliToken({ ...token, ...patch }, "badgio")).toThrow("LOGIN_REQUIRED");
});
