import { shaderCodeIssue } from "@crafter-station/badge-studio-design/prism-shader";
import type { PrismRecipe } from "@crafter-station/badge-studio-design/prism-style";
import { type Gpu, effect, frame, init, target } from "vgpu";
import { fieldUniforms } from "./material-field";
import source from "./material-field.wgsl";
import { ShaderValidationError, inspectField, inspectFrameTimes } from "./shader-inspection";
import { materialSignature } from "./signature";

export function laboratorySource(code: string) {
	const issue = shaderCodeIssue(code);
	if (issue) throw new ShaderValidationError(issue);
	const perlin = /fn (\w*perlin2d)\(/.exec(source)?.[1];
	const voronoi = /fn (\w*voronoi2d)\(/.exec(source)?.[1];
	if (!perlin || !voronoi) throw new Error("No pudimos cargar las funciones del material.");
	return `${source.replace(/@fragment fn fs_main[\s\S]*?\n\}/, "")}
fn noise2(p: vec2f) -> f32 { return ${perlin}(p); }
fn cells2(p: vec2f) -> f32 { let c = ${voronoi}(p); return c.f2 - c.f1; }
fn invented(p: vec2f, t: f32, pointer: vec2f, seed: vec4f) -> f32 {
${code}
}
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = vec2f((uv.x - 0.5) * 1.49, (0.5 - uv.y) * 2.26);
  let h = clamp(invented(p, field.time, field.pointer, field.seed), -1.0, 1.0);
  let dx = clamp(dpdx(h) * (384.0 / 1.49), -16.0, 16.0);
  let dy = clamp(-dpdy(h) * (576.0 / 2.26), -16.0, 16.0);
  return vec4f(h, dx, dy, 1.0);
}`;
}

export type ShaderCheck = { preview: string; milliseconds: number; spread: number };

export async function validateShader(
	recipe: PrismRecipe,
	callerSignal?: AbortSignal,
): Promise<ShaderCheck> {
	if (!recipe.shader) throw new ShaderValidationError("Falta la fórmula del material.");
	const wgsl = laboratorySource(recipe.shader.code);
	let gpu: Gpu | undefined;
	let closed = false;
	let unsubscribe: (() => void) | undefined;
	const controller = new AbortController();
	const signal = callerSignal
		? AbortSignal.any([callerSignal, controller.signal])
		: controller.signal;
	const timeout = setTimeout(() => controller.abort(), 10_000);
	let abort: (() => void) | undefined;
	try {
		return await Promise.race([
			(async () => {
				signal.throwIfAborted();
				const context = await init();
				if (closed || signal.aborted) {
					context.dispose();
					signal.throwIfAborted();
					throw new Error("Validación cerrada.");
				}
				gpu = context;
				let failure: unknown;
				unsubscribe = gpu.onError((error) => {
					failure = error;
				});
				const output = target(gpu, {
					size: [384, 576],
					format: "rgba16float",
					label: "lab-admission",
				});
				const material = effect(gpu, wgsl, {
					set: {
						field: {
							time: 0,
							pointer: [0, 0],
							seed: materialSignature({ seed: recipe.seed, version: 1 }).values,
							...fieldUniforms(recipe.field),
						},
					},
				});
				await material.compile(output);
				signal.throwIfAborted();
				const times: number[] = [];
				let first: Float32Array | undefined;
				let spread = 0;
				for (const [time, x, y] of [
					[0, 0, 0],
					[1.7, 0.8, -0.7],
					[19.3, -1, 1],
					[83.1, 0.3, 0.5],
				]) {
					signal.throwIfAborted();
					material.set({ field: { time, pointer: [x, y] } });
					const start = performance.now();
					frame(gpu, (f) => f.pass(output, material));
					await gpu.gpu.queue.onSubmittedWorkDone();
					signal.throwIfAborted();
					times.push(performance.now() - start);
					const pixels = await output.readFloats();
					await gpu.settled();
					signal.throwIfAborted();
					if (failure) throw failure;
					spread = Math.max(spread, inspectField(pixels));
					first ??= pixels;
				}
				const milliseconds = inspectFrameTimes(times);
				signal.throwIfAborted();
				const canvas = document.createElement("canvas");
				canvas.width = 384;
				canvas.height = 576;
				const ctx = canvas.getContext("2d");
				if (!ctx || !first)
					throw new ShaderValidationError("No pudimos preparar la muestra del material.");
				const image = ctx.createImageData(384, 576);
				const colors = recipe.palette.map((hex) =>
					[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)),
				);
				for (let i = 0; i < first.length; i += 4) {
					const h = Math.max(0, Math.min(1, first[i] * 0.5 + 0.5));
					const a = h < 0.5 ? colors[0] : colors[1];
					const b = h < 0.5 ? colors[1] : colors[2];
					const mix = h < 0.5 ? h * 2 : h * 2 - 1;
					const light = 0.6 + 0.4 / Math.sqrt(1 + first[i + 1] ** 2 + first[i + 2] ** 2);
					for (let c = 0; c < 3; c++) image.data[i + c] = (a[c] * (1 - mix) + b[c] * mix) * light;
					image.data[i + 3] = 255;
				}
				ctx.putImageData(image, 0, 0);
				return { preview: canvas.toDataURL(), milliseconds, spread };
			})(),
			new Promise<never>((_, reject) => {
				abort = () =>
					reject(
						new ShaderValidationError(
							callerSignal?.aborted
								? "Exploración cancelada."
								: "La prueba de GPU tardó demasiado. Puedes volver a intentarlo.",
						),
					);
				signal.addEventListener("abort", abort, { once: true });
				if (signal.aborted) abort();
			}),
		]);
	} catch (error) {
		if (error instanceof ShaderValidationError) throw error;
		if (callerSignal?.aborted) throw new DOMException("Exploración cancelada.", "AbortError");
		throw new ShaderValidationError(
			"No pudimos validar este material en tu GPU. Prueba otra exploración o usa el compositor.",
		);
	} finally {
		closed = true;
		clearTimeout(timeout);
		if (abort) signal.removeEventListener("abort", abort);
		unsubscribe?.();
		gpu?.dispose();
	}
}
