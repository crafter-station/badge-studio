export class ShaderValidationError extends Error {}

export function inspectField(pixels: Float32Array) {
	if (pixels.length < 8 || pixels.length % 4 !== 0)
		throw new ShaderValidationError("No pudimos leer la muestra del material.");
	let min = 1;
	let max = -1;
	let clipped = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		for (let c = 0; c < 4; c++)
			if (!Number.isFinite(pixels[i + c]))
				throw new ShaderValidationError("La fórmula produjo valores inválidos.");
		min = Math.min(min, pixels[i]);
		max = Math.max(max, pixels[i]);
		if (Math.abs(pixels[i]) >= 0.995) clipped++;
	}
	if (max - min < 0.025 || clipped / (pixels.length / 4) > 0.9)
		throw new ShaderValidationError("El material salió plano o saturado. Prueba otra exploración.");
	return max - min;
}

export function inspectFrameTimes(times: number[]) {
	if (times.length !== 4 || times.some((value) => !Number.isFinite(value) || value < 0))
		throw new ShaderValidationError("No pudimos medir este material.");
	const milliseconds = times.slice(1).sort((a, b) => a - b)[1];
	if (milliseconds > 30)
		throw new ShaderValidationError(
			"Este material es demasiado pesado para tu GPU. Prueba una forma más simple.",
		);
	return milliseconds;
}
