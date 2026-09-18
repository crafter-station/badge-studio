import { expect, test } from "bun:test";
import { previewConnection } from "./studio-bridge";

test("preview connection accepts only exact loopback origins and a 256-bit capability", () => {
	const token = "a1".repeat(32);
	const params = (origin: string, key = token) =>
		`#badgio=${key}&parent=${encodeURIComponent(origin)}`;
	expect(previewConnection(params("http://127.0.0.1:8123"))).toEqual({
		token,
		origin: "http://127.0.0.1:8123",
	});
	for (const origin of [
		"https://attacker.example",
		"http://127.0.0.1:8123.attacker.example",
		"http://127.0.0.1:8123/",
		"http://127.0.0.1:8123/path",
		"http://user@127.0.0.1:8123",
		"http://localhost:8123",
		"null",
		"file:///tmp/preview",
		"http://127.0.0.1",
	])
		expect(previewConnection(params(origin))).toBeNull();
	for (const key of ["", "bad", "a".repeat(63), "a".repeat(65), "g".repeat(64)])
		expect(previewConnection(params("http://127.0.0.1:8123", key))).toBeNull();
	expect(previewConnection("")).toBeNull();
});
