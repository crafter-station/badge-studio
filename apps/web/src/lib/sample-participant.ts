export const sampleParticipant = {
	name: "Alex Rivera",
	role: "Builder",
	organization: "Creative community",
	portraitUrl: "/prism/demo/alex-cutout.webp",
} as const;

export async function currentExamplePhoto(photo: Blob | null, signal: AbortSignal) {
	if (!photo || photo.size !== 187250) return photo;
	try {
		const digest = Array.from(
			new Uint8Array(await crypto.subtle.digest("SHA-256", await photo.arrayBuffer())),
			(value) => value.toString(16).padStart(2, "0"),
		).join("");
		if (digest !== "9caf18bba861d2f966323d531fdb6feecb1b9446eb9a69161e798106aa571687") return photo;
		const response = await fetch(sampleParticipant.portraitUrl, {
			signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
		});
		if (!response.ok) return photo;
		const current = await response.blob();
		return current.type === "image/webp" && current.size > 0 && current.size < 4 * 1024 * 1024
			? current
			: photo;
	} catch {
		return photo;
	}
}
