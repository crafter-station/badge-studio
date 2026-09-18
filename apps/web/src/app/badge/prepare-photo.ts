export async function preparePhoto(file: File): Promise<Blob> {
	if (file.size > 8 * 1024 * 1024) throw new Error("Elige una foto de hasta 8 MB.");
	if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
		throw new Error("Elige una foto JPG, PNG o WebP.");
	}
	const bitmap = await createImageBitmap(file);
	try {
		if (bitmap.width * bitmap.height > 24_000_000) {
			throw new Error(
				"Esta foto es demasiado grande. Exporta una versión de hasta 24 megapíxeles.",
			);
		}
		if (file.size < 3 * 1024 * 1024 && Math.max(bitmap.width, bitmap.height) <= 2400) return file;
		const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("No pudimos preparar la foto.");
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const image = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, file.type === "image/jpeg" ? "image/jpeg" : "image/webp", 0.92),
		);
		if (!image || image.size > 3.5 * 1024 * 1024)
			throw new Error("No pudimos reducir la foto. Prueba con una versión más pequeña.");
		return image;
	} finally {
		bitmap.close();
	}
}
