export function advanceTurn(
	initialAngle: number,
	initialVelocity: number,
	target: number,
	elapsed: number,
	immediate = false,
): [number, number] {
	if (immediate) return [target, 0];
	let angle = initialAngle;
	let velocity = initialVelocity;
	const delta = Math.max(0, Math.min(elapsed, 0.05));
	const steps = Math.max(1, Math.ceil(delta * 120));
	for (let index = 0; index < steps; index++) {
		velocity += (((target - angle) * 100 - velocity * 17) * delta) / steps;
		angle += (velocity * delta) / steps;
	}
	return Math.abs(target - angle) < 0.0002 && Math.abs(velocity) < 0.001
		? [target, 0]
		: [angle, velocity];
}
