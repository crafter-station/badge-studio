export async function loadBadgeFonts() {
	await Promise.all(
		[
			'700 100px "Andes Brand"',
			'700 100px "Andes Display"',
			'400 24px "Andes Mono"',
			'400 60px "Next Craft Script"',
			'700 72px "Next Craft Mono"',
			'400 30px "Next Craft Pixel"',
		].map((font) => document.fonts.load(font)),
	);
}
