export const gtmFlow = `let bend = sin(p.y * 2.4 + t * 0.22 + seed.x * 1.7) * 0.28 + sin(p.y * 1.15 - t * 0.14) * 0.13;
let cursor = pointer * vec2f(0.745, -1.13);
let offset = p - cursor;
let touch = exp(-dot(offset, offset) * 4.0) * (pointer.x * 0.20 - pointer.y * 0.12);
return clamp(p.x * 0.9 + bend + touch, -0.93, 0.93);`;
