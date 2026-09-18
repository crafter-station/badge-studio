import { afterAll, afterEach, expect, spyOn, test } from "bun:test";
import { currentExamplePhoto, sampleParticipant } from "./sample-participant";

const original = Bun.file(new URL("../../public/prism/demo/alex.webp", import.meta.url));
const replacement = Bun.file(new URL("../../public/prism/demo/alex-cutout.webp", import.meta.url));
const request = spyOn(globalThis, "fetch");
afterEach(() => request.mockReset());
afterAll(() => request.mockRestore());

test("refreshes only the exact former public example", async () => {
	request.mockResolvedValue(
		new Response(replacement, { headers: { "Content-Type": "image/webp" } }),
	);
	const photo = await currentExamplePhoto(original, new AbortController().signal);
	expect(photo).not.toBe(original);
	expect(await photo?.arrayBuffer()).toEqual(await replacement.arrayBuffer());
	expect(request).toHaveBeenCalledWith(sampleParticipant.portraitUrl, expect.any(Object));
});

test("never replaces participant photos, including one with the same byte size", async () => {
	for (const photo of [
		null,
		new Blob(["personal"], { type: "image/png" }),
		new Blob([new Uint8Array(original.size)], { type: "image/webp" }),
		replacement,
	]) {
		expect(await currentExamplePhoto(photo, new AbortController().signal)).toBe(photo);
	}
	expect(request).not.toHaveBeenCalled();
});

test("keeps the saved example when offline or the new asset is unavailable", async () => {
	request.mockRejectedValueOnce(new Error("Offline"));
	expect(await currentExamplePhoto(original, new AbortController().signal)).toBe(original);
	request.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
	expect(await currentExamplePhoto(original, new AbortController().signal)).toBe(original);
	request.mockResolvedValueOnce(new Response("<html>error</html>"));
	expect(await currentExamplePhoto(original, new AbortController().signal)).toBe(original);
});
