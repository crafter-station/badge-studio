export function orbitPosition(phase: number, index: number, count: number, width: number) {
	const angle = phase + (index / count) * Math.PI * 2;
	const depth = Math.cos(angle);
	const radius = Math.min(560, Math.max(190, width * 0.39));
	const x = Math.sin(angle) * radius;
	return {
		x,
		y: depth * 48 - x * 0.09,
		scale: 0.56 + (depth + 1) * 0.23,
		rotation: Math.sin(angle) * 11 - 7,
		yaw: Math.sin(angle) * -23,
		brightness: 0.86 + ((depth + 1) / 2) * 0.14,
		z: Math.round((depth + 1) * 100),
	};
}

export function tickIndex(phase: number) {
	return Math.floor(phase / (Math.PI / 32));
}

export function settleVelocity(velocity: number, seconds: number) {
	return velocity * Math.exp(-3.5 * seconds);
}

export function orbitLiveIndices(phase: number, count: number, compact: boolean) {
	if (!compact || count <= 3) return Array.from({ length: count }, (_, index) => index);
	const front = Math.round((-phase * count) / (Math.PI * 2));
	return [-1, 0, 1]
		.map((offset) => (((front + offset) % count) + count) % count)
		.sort((a, b) => a - b);
}
