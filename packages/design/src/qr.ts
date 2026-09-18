import QRCode from "qrcode";

export function badgeQrLayout(destination: string, width: number, maxCellSize = 20) {
	const url = new URL(destination);
	if (
		!["http:", "https:"].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.href.length > 400
	)
		throw new Error("El destino del QR no es válido.");
	const matrix = QRCode.create(url.href, { errorCorrectionLevel: "M" }).modules;
	const cell = Math.min(maxCellSize, Math.floor(width / (matrix.size + 8)));
	if (cell < 2) throw new Error("El QR necesita más espacio.");
	return { matrix, cell };
}
