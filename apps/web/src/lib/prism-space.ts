export function prismSpace() {
	return {
		id: process.env.PRISM_SPACE_ID?.trim() || "badge-studio",
		name: "Badge Studio",
		accentColor: "#dadde3",
	};
}
