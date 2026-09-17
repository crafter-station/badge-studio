export type PrismShader = { version: 1; code: string };

export const shaderFunctions = [
	"abs",
	"acos",
	"asin",
	"atan",
	"atan2",
	"ceil",
	"clamp",
	"cos",
	"cross",
	"distance",
	"dot",
	"exp",
	"exp2",
	"floor",
	"fract",
	"length",
	"log",
	"log2",
	"max",
	"min",
	"mix",
	"normalize",
	"pow",
	"reflect",
	"round",
	"select",
	"sign",
	"sin",
	"smoothstep",
	"sqrt",
	"step",
	"tan",
	"tanh",
	"trunc",
	"vec2f",
	"vec3f",
	"vec4f",
	"f32",
	"noise2",
	"cells2",
] as const;
const functions = new Set<string>(shaderFunctions);
const inputs = ["p", "t", "pointer", "seed"];

export function shaderCodeIssue(code: string): string | undefined {
	if (!code || code.length > 4800) return "Usa una fórmula de hasta 4800 caracteres.";
	if (!/^[\x20-\x7e\n\r\t]+$/.test(code) || /\/[/\*]|\*\//.test(code))
		return "La fórmula solo admite código sin comentarios.";
	const statements = code.trim().split(";");
	if (statements.pop()?.trim() || statements.length < 1 || statements.length > 40)
		return "La fórmula debe terminar en return y tener hasta 40 instrucciones.";
	const names = new Set([...inputs, ...shaderFunctions, "true", "false"]);
	let tokens = 0;
	let calls = 0;
	let noiseCalls = 0;
	for (const [index, statement] of statements.entries()) {
		const last = index === statements.length - 1;
		const match = last
			? /^\s*return\s+([\s\S]+)$/.exec(statement)
			: /^\s*let\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*([\s\S]+)$/.exec(statement);
		if (!match) return "Usa declaraciones let y un único return final.";
		const name = last ? undefined : match[1];
		if (name && (names.has(name) || name.startsWith("__"))) return "Nombre reservado o repetido.";
		const expression = last ? match[1] : match[2];
		const parts =
			expression.match(
				/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?f?|[A-Za-z_][A-Za-z0-9_]*|\s+|&&|\|\||==|!=|<=|>=|[().,+\-*/%<>!]/g,
			) ?? [];
		if (parts.join("") !== expression) return "La fórmula contiene sintaxis no admitida.";
		const significant = parts.filter((part) => part.trim());
		let depth = 0;
		for (const [i, part] of significant.entries()) {
			if (++tokens > 700) return "La fórmula es demasiado compleja.";
			if (part === "(" && ++depth > 16) return "Demasiados niveles en la fórmula.";
			if (part === ")" && --depth < 0) return "Paréntesis incompletos.";
			if (!/^[A-Za-z_]/.test(part)) continue;
			if (significant[i - 1] === ".") {
				if (!/^[xyzwrgba]{1,4}$/.test(part)) return "Solo se permiten componentes de vectores.";
			} else if (significant[i + 1] === "(") {
				if (!functions.has(part)) return `Función no admitida: ${part}.`;
				if (++calls > 80) return "La fórmula admite hasta 80 llamadas.";
				if ((part === "noise2" || part === "cells2") && ++noiseCalls > 12)
					return "Usa como máximo 12 muestras de ruido.";
			} else if (!names.has(part)) return "La fórmula usa una variable no disponible.";
		}
		if (depth !== 0) return "Paréntesis incompletos.";
		if (name) names.add(name);
	}
}
