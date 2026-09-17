import {
	type Effect,
	type Frame,
	type FrameLoopHandle,
	type Gpu,
	type Surface,
	type Target,
	effect,
	frame,
	frameLoop,
	init,
	sampler,
	surface,
	target,
} from "vgpu";
import type { Texture } from "vgpu/core";
import bloomShader from "./bloom.wgsl";
import { createDesignMask } from "./design";
import { loadDesignArtwork } from "./design-assets";
import { designMaterialData } from "./design-material";
import { fieldCoating, fieldUniforms } from "./material-field";
import fieldShader from "./material-field.wgsl";
import presentShader from "./present.wgsl";
import { createBack, createFoil, createPrint, loadPortrait } from "./print";
import shader from "./prism.wgsl";
import { laboratorySource, validateShader } from "./shader-lab";
import { materialSignature } from "./signature";
import { advanceTurn } from "./turn";
import type { PrismAppearance, PrismBadgeData, PrismSide } from "./types";

export type StudioOptions = {
	finish: number;
	spectral: number;
	motion: boolean;
	fluid: boolean;
	side?: PrismSide;
};

export type StudioController = {
	setOptions: (options: StudioOptions) => void;
	setContent: (data: PrismBadgeData, appearance: PrismAppearance) => Promise<void>;
	exportImage: () => Promise<Blob>;
	dispose: () => void;
};

export function startPrism(
	canvas: HTMLCanvasElement,
	initial: StudioOptions,
	data: PrismBadgeData,
	appearance: PrismAppearance,
	assetsBaseUrl: string,
	fixedSize: boolean,
	onReady: () => void,
	onError: (message: string) => void,
): StudioController {
	let disposed = false;
	let gpu: Gpu | undefined;
	let screen: Surface | undefined;
	let material: Effect | undefined;
	let scene: Target | undefined;
	let glowX: Target | undefined;
	let glowY: Target | undefined;
	let blurX: Effect | undefined;
	let blurY: Effect | undefined;
	let presentation: Effect | undefined;
	let fieldMaterial: Effect | undefined;
	let fieldMap: Target | undefined;
	let texture: Texture | undefined;
	let loop: FrameLoopHandle | undefined;
	let options = initial;
	let content = data;
	let layout = appearance;
	let portraitBitmap: ImageBitmap | undefined;
	let foilTexture: Texture | undefined;
	let backTexture: Texture | undefined;
	let designMask: Texture | undefined;
	let artworkBitmap: ImageBitmap | undefined;
	let designEffects: Texture | undefined;
	let artworkKey = "";
	let turn = initial.side === "back" ? Math.PI : 0;
	let turnVelocity = 0;
	let heat = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
	let lastHeat = 0;
	let photoRequest = 0;
	let portraitUrl: string | undefined;
	let pendingPhoto: { url: string; abort: AbortController; promise: Promise<void> } | undefined;
	let phase = 0;
	let lastTime = performance.now();
	let pointerX = 0;
	let pointerY = 0;
	let smoothX = 0;
	let smoothY = 0;
	let lightX = 0;
	let lightY = 0;
	let lightVelocityX = 0;
	let lightVelocityY = 0;
	let activity = 0;
	let fluidity = initial.fluid ? 1 : 0;
	let unsubscribeResize: (() => void) | undefined;
	let unsubscribeError: (() => void) | undefined;
	let unsubscribeDeviceError: (() => void) | undefined;
	const abort = new AbortController();
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	const still = fixedSize || new URLSearchParams(window.location.search).has("still");

	const fail = (error: unknown) => {
		if (disposed) return;
		dispose();
		onError(error instanceof Error ? error.message : "No se pudo iniciar el vidrio.");
	};

	const upload = (image: ImageBitmap) => {
		if (!gpu || disposed) return;
		const plate = createPrint(image, layout, false, content, artworkBitmap);
		if (!texture) {
			texture = gpu.device.createTexture({
				size: [1024, 1536],
				format: "rgba8unorm",
				usage: ["texture_binding", "copy_dst", "render_attachment"],
				label: "portrait-print",
			});
		}
		gpu.gpu.queue.copyExternalImageToTexture(
			{ source: plate },
			{ texture: texture.gpu },
			[1024, 1536],
		);
	};

	const render = (current: Frame) => {
		if (!screen || !material || !scene || !glowX || !glowY || !blurX || !blurY || !presentation)
			return;
		if (layout.recipe?.field && fieldMap && fieldMaterial) current.pass(fieldMap, fieldMaterial);
		current.pass(scene, material);
		current.pass(glowX, blurX);
		current.pass(glowY, blurY);
		current.pass(screen, presentation);
	};

	const resume = () => {
		if (!gpu || !material || !screen || disposed || fixedSize || document.hidden || loop) return;
		lastTime = performance.now();
		loop = frameLoop(gpu, (frame) => {
			if (!material || !screen) return;
			try {
				const now = performance.now();
				const delta = Math.min((now - lastTime) / 1000, 0.05);
				lastTime = now;
				const moving = options.motion && !reduced.matches && !still;
				const turnTarget = options.side === "back" ? Math.PI : 0;
				[turn, turnVelocity] = advanceTurn(
					turn,
					turnVelocity,
					turnTarget,
					delta,
					reduced.matches || still,
				);
				canvas.dataset.side =
					Math.abs(turnTarget - turn) < 0.002
						? options.side === "back"
							? "back"
							: "front"
						: "turning";
				for (const point of heat) point[2] = moving ? point[2] * Math.exp(-delta * 1.7) : 0;
				if (moving)
					phase +=
						delta *
						(0.84 + materialSignature(content.signature).values[1] * 0.32) *
						(layout.recipe ? layout.recipe.motion.speed * 2 : 1);
				const easing = 1 - Math.exp(-delta * 8);
				smoothX += (pointerX - smoothX) * easing;
				smoothY += (pointerY - smoothY) * easing;
				const driftX = Math.sin(phase * 0.26) * 0.014;
				const driftY = Math.sin(phase * 0.21) * 0.023;
				const lightTargetX = reduced.matches ? 0 : smoothX * 0.82 + Math.sin(phase * 0.31) * 0.19;
				const lightTargetY = reduced.matches ? 0 : smoothY * 0.58 + Math.sin(phase * 0.23) * 0.14;
				const substeps = Math.max(1, Math.ceil(delta / (1 / 120)));
				const step = delta / substeps;
				for (let index = 0; index < substeps; index++) {
					lightVelocityX += ((lightTargetX - lightX) * 48 - lightVelocityX * 12) * step;
					lightVelocityY += ((lightTargetY - lightY) * 48 - lightVelocityY * 12) * step;
					lightX += lightVelocityX * step;
					lightY += lightVelocityY * step;
				}
				activity +=
					(Math.min(1, Math.hypot(lightVelocityX, lightVelocityY) * 0.65) - activity) *
					(1 - Math.exp(-delta * 3));
				fluidity = reduced.matches
					? options.fluid
						? 1
						: 0
					: fluidity + ((options.fluid ? 1 : 0) - fluidity) * (1 - Math.exp(-delta * 5));
				const arc = Math.sin(turn);
				const amplitude = layout.recipe ? layout.recipe.motion.amplitude * 2 : 1;
				const tiltX = reduced.matches ? 0 : (smoothY * 0.1 + driftX) * amplitude + arc * 0.09;
				const frontWeight = (1 + Math.cos(turn)) * 0.5;
				const tiltY =
					turn +
					(reduced.matches ? 0 : (smoothX * 0.21 - 0.075 + driftY) * frontWeight * amplitude);
				material.set({
					params: {
						angles: [tiltX, tiltY],
						roll: reduced.matches ? 0 : arc * -0.14,
						heat0: heat[0],
						heat1: heat[1],
						heat2: heat[2],
						heat3: heat[3],
						pointer: reduced.matches ? [0, 0] : [smoothX * amplitude, smoothY * amplitude],
						light: reduced.matches ? [0, 0] : [lightX * amplitude, lightY * amplitude],
						time: reduced.matches ? 0 : phase,
						activity: reduced.matches ? 0 : activity,
						fluidity,
						lift: reduced.matches ? 0 : Math.sin(phase * 0.34) * 0.009 * amplitude + arc * 0.045,
					},
				});
				fieldMaterial?.set({
					field: {
						time: reduced.matches ? 0 : phase,
						pointer: reduced.matches
							? [0, 0]
							: layout.recipe?.shader
								? [smoothX, smoothY]
								: [smoothX * amplitude, smoothY * amplitude],
					},
				});
				render(frame);
			} catch (error) {
				frame.cancel();
				queueMicrotask(() => fail(error));
			}
		});
	};

	const visibility = () => {
		if (document.hidden) {
			loop?.stop();
			loop = undefined;
		} else {
			resume();
		}
	};

	const move = (event: PointerEvent) => {
		const bounds = canvas.getBoundingClientRect();
		pointerX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
		pointerY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
		if (
			performance.now() - lastHeat > 60 &&
			options.motion &&
			!reduced.matches &&
			options.side !== "back"
		) {
			const aspect = bounds.width / bounds.height;
			const focal = 2.58 * Math.min(1, aspect / 0.64);
			heat = [
				[(pointerX * aspect * 3.7) / focal, (-pointerY * 3.7) / focal, 1, 0],
				...heat.slice(0, 3),
			];
			lastHeat = performance.now();
		}
	};
	const leave = () => {
		pointerX = 0;
		pointerY = 0;
	};
	const key = (event: KeyboardEvent) => {
		const step = 0.22;
		if (event.key === "ArrowLeft") pointerX = Math.max(-1, pointerX - step);
		else if (event.key === "ArrowRight") pointerX = Math.min(1, pointerX + step);
		else if (event.key === "ArrowUp") pointerY = Math.max(-1, pointerY - step);
		else if (event.key === "ArrowDown") pointerY = Math.min(1, pointerY + step);
		else if (event.key === "Home") leave();
		else return;
		event.preventDefault();
	};
	canvas.addEventListener("pointermove", move);
	canvas.addEventListener("pointerleave", leave);
	canvas.addEventListener("keydown", key);
	document.addEventListener("visibilitychange", visibility);

	const dispose = () => {
		if (disposed) return;
		disposed = true;
		abort.abort();
		photoRequest++;
		portraitBitmap?.close();
		portraitBitmap = undefined;
		artworkBitmap?.close();
		loop?.stop();
		loop = undefined;
		unsubscribeResize?.();
		unsubscribeError?.();
		unsubscribeDeviceError?.();
		canvas.removeEventListener("pointermove", move);
		canvas.removeEventListener("pointerleave", leave);
		canvas.removeEventListener("keydown", key);
		document.removeEventListener("visibilitychange", visibility);
		screen?.dispose();
		gpu?.dispose();
	};

	async function loadCurrentPortrait() {
		const url = content.portraitUrl;
		if (pendingPhoto && pendingPhoto.url !== url) {
			pendingPhoto.abort.abort();
			pendingPhoto = undefined;
		}
		if (portraitUrl === url) return;
		if (!pendingPhoto) {
			const cancellation = new AbortController();
			const pending = {
				url,
				abort: cancellation,
				promise: loadPortrait(url, AbortSignal.any([abort.signal, cancellation.signal]))
					.then((image) => {
						if (disposed || cancellation.signal.aborted) {
							image.close();
							throw new DOMException("Aborted", "AbortError");
						}
						portraitBitmap?.close();
						portraitBitmap = image;
						portraitUrl = url;
					})
					.finally(() => {
						if (pendingPhoto === pending) pendingPhoto = undefined;
					}),
			};
			pendingPhoto = pending;
		}
		await pendingPhoto.promise;
	}

	async function refreshContent() {
		const request = photoRequest;
		await loadCurrentPortrait();
		const nextArtworkKey = content.document ? (content.artworkUrl ?? "") : "";
		if (nextArtworkKey !== artworkKey) {
			const image = await loadDesignArtwork(content, abort.signal);
			if (disposed || request !== photoRequest) {
				image?.close();
				throw new DOMException("Aborted", "AbortError");
			}
			artworkBitmap?.close();
			artworkBitmap = image;
			artworkKey = nextArtworkKey;
		}
		if (disposed || request !== photoRequest) throw new DOMException("Aborted", "AbortError");
		if (!gpu || !material || !foilTexture || !backTexture || !portraitBitmap) return;
		upload(portraitBitmap);
		if (designEffects)
			gpu.gpu.queue.writeTexture(
				{ texture: designEffects.gpu },
				designMaterialData(content.document).bytes,
				{ bytesPerRow: 256 },
				[64, 48],
			);
		if (designMask && content.document)
			gpu.gpu.queue.copyExternalImageToTexture(
				{ source: createDesignMask(content) },
				{ texture: designMask.gpu },
				[1024, 1536],
			);
		gpu.gpu.queue.copyExternalImageToTexture(
			{ source: createBack(content, layout, portraitBitmap, artworkBitmap) },
			{ texture: backTexture.gpu },
			[1024, 1536],
		);
		gpu.gpu.queue.copyExternalImageToTexture(
			{ source: createFoil(content, layout) },
			{ texture: foilTexture.gpu },
			[1024, 1536],
		);
		material.set({
			params: {
				topographic:
					content.design === "andes" || content.document?.material.effect === "topographic" ? 1 : 0,
				designMode: designMaterialData(content.document).mode,
				coating: fieldCoating(layout.recipe?.field),
				faceRegion: [layout.face.x, layout.face.y, layout.face.radius, 0],
				spectral: layout.recipe ? layout.recipe.material.iridescence / 0.5 : options.spectral,
				surfaceKind: ["prism", "satin", "chrome"].indexOf(layout.surface ?? "prism"),
				customMaterial: layout.recipe
					? [
							layout.recipe.material.roughness,
							layout.recipe.material.iridescence,
							1,
							content.edition?.layout === "ribbon" ||
							content.document?.material.effect === "ribbons"
								? 1
								: 0,
						]
					: [0, 0, 0, 0],
				thermal: layout.filter === "thermal" ? 1 : 0,
				signature: materialSignature(content.signature).values,
			},
		});
		fieldMaterial?.set({
			field: {
				...fieldUniforms(layout.recipe?.field),
				seed: materialSignature(content.signature).values,
			},
		});
		blurX?.set({
			blur: {
				threshold: content.design === "andes" || content.edition || content.document ? 1.1 : 0.42,
			},
		});
		frame(gpu, render);
	}

	async function settleContent() {
		while (!disposed) {
			const request = photoRequest;
			try {
				await refreshContent();
				return;
			} catch (error) {
				if (request === photoRequest) throw error;
			}
		}
	}

	void (async () => {
		try {
			gpu = await init();
			if (disposed) return gpu.dispose();
			unsubscribeError = gpu.onError(fail);
			const device = gpu.gpu;
			const deviceError = (event: GPUUncapturedErrorEvent) => {
				event.preventDefault();
				fail(new Error(event.error.message));
			};
			device.addEventListener("uncapturederror", deviceError);
			unsubscribeDeviceError = () => device.removeEventListener("uncapturederror", deviceError);
			void device.lost.then((info) => {
				if (!disposed) fail(new Error(info.message || "Se perdió la conexión con el vidrio."));
			});
			let loadedUrl = content.portraitUrl;
			let image = await loadPortrait(loadedUrl, abort.signal);
			while (!disposed && loadedUrl !== content.portraitUrl) {
				image.close();
				loadedUrl = content.portraitUrl;
				image = await loadPortrait(loadedUrl, abort.signal);
			}
			if (disposed) {
				image.close();
				return;
			}
			portraitBitmap = image;
			artworkBitmap = await loadDesignArtwork(content, abort.signal);
			artworkKey = content.document ? (content.artworkUrl ?? "") : "";
			if (disposed) {
				artworkBitmap?.close();
				return;
			}
			portraitUrl = loadedUrl;
			upload(image);
			designMask = gpu.device.createTexture({
				size: [1024, 1536],
				format: "rgba8unorm",
				usage: ["texture_binding", "copy_dst", "render_attachment"],
				label: "design-motion-mask",
			});
			if (content.document)
				gpu.gpu.queue.copyExternalImageToTexture(
					{ source: createDesignMask(content) },
					{ texture: designMask.gpu },
					[1024, 1536],
				);
			designEffects = gpu.device.createTexture({
				size: [64, 48],
				format: "rgba8unorm",
				usage: ["texture_binding", "copy_dst"],
				label: "design-effects",
			});
			gpu.gpu.queue.writeTexture(
				{ texture: designEffects.gpu },
				designMaterialData(content.document).bytes,
				{ bytesPerRow: 256 },
				[64, 48],
			);
			foilTexture = gpu.device.createTexture({
				size: [1024, 1536],
				format: "rgba8unorm",
				usage: ["texture_binding", "copy_dst", "render_attachment"],
				label: "nacre-foil",
			});
			gpu.gpu.queue.copyExternalImageToTexture(
				{ source: createFoil(content, layout) },
				{ texture: foilTexture.gpu },
				[1024, 1536],
			);
			backTexture = gpu.device.createTexture({
				size: [1024, 1536],
				format: "rgba8unorm",
				usage: ["texture_binding", "copy_dst", "render_attachment"],
				label: "prism-reverse",
			});
			gpu.gpu.queue.copyExternalImageToTexture(
				{ source: createBack(content, layout, portraitBitmap, artworkBitmap) },
				{ texture: backTexture.gpu },
				[1024, 1536],
			);
			const atlasResponse = await fetch(`${assetsBaseUrl.replace(/\/$/, "")}/facets.bin.gz`, {
				signal: abort.signal,
			});
			if (!atlasResponse.ok || !atlasResponse.body)
				throw new Error("No se pudo cargar el cristal.");
			const atlasBytes = await new Response(
				atlasResponse.body.pipeThrough(new DecompressionStream("gzip")),
			).arrayBuffer();
			if (disposed) return;
			if (atlasBytes.byteLength !== 1024 * 1536 * 4)
				throw new Error("El mapa del cristal está incompleto.");
			const atlas = gpu.device.createTexture({
				size: [1024, 1536],
				format: "rgba8unorm",
				usage: ["texture_binding", "copy_dst"],
				label: "prism-facet-optics",
			});
			gpu.gpu.queue.writeTexture(
				{ texture: atlas.gpu },
				atlasBytes,
				{ bytesPerRow: 4096 },
				[1024, 1536],
			);
			screen = surface(gpu, canvas, {
				...(fixedSize
					? { size: [1080, 1440] as const, autoResize: false, dpr: 1 }
					: { dpr: [1.5, 2] as const }),
				alphaMode: "premultiplied",
			});
			fieldMap = target(gpu, {
				size: [384, 576],
				format: "rgba16float",
				label: "procedural-material-field",
			});
			let selectedFieldShader = fieldShader;
			if (layout.recipe?.shader) {
				try {
					await validateShader(layout.recipe, abort.signal);
					if (disposed) return;
					selectedFieldShader = laboratorySource(layout.recipe.shader.code);
					canvas.dataset.labStatus = "ready";
				} catch {
					if (disposed) return;
					canvas.dataset.labStatus = "fallback";
				}
			} else {
				delete canvas.dataset.labStatus;
			}
			fieldMaterial = effect(gpu, selectedFieldShader, {
				set: {
					field: {
						time: 0,
						pointer: [0, 0],
						seed: materialSignature(content.signature).values,
						...fieldUniforms(layout.recipe?.field),
					},
				},
			});
			material = effect(gpu, shader, {
				label: "prism-glass",
				set: {
					params: {
						topographic:
							content.design === "andes" || content.document?.material.effect === "topographic"
								? 1
								: 0,
						designMode: designMaterialData(content.document).mode,
						resolution: screen.size,
						coating: fieldCoating(layout.recipe?.field),
						angles: [0, initial.side === "back" ? Math.PI : fixedSize ? 0 : -0.075],
						roll: 0,
						heat0: [0, 0, 0, 0],
						heat1: [0, 0, 0, 0],
						heat2: [0, 0, 0, 0],
						heat3: [0, 0, 0, 0],
						faceRegion: [layout.face.x, layout.face.y, layout.face.radius, 0],
						surfaceKind: ["prism", "satin", "chrome"].indexOf(layout.surface ?? "prism"),
						customMaterial: layout.recipe
							? [
									layout.recipe.material.roughness,
									layout.recipe.material.iridescence,
									1,
									content.edition?.layout === "ribbon" ||
									content.document?.material.effect === "ribbons"
										? 1
										: 0,
								]
							: [0, 0, 0, 0],
						thermal: layout.filter === "thermal" ? 1 : 0,
						signature: materialSignature(content.signature).values,
						pointer: [0, 0],
						light: [0, 0],
						spectral: layout.recipe ? layout.recipe.material.iridescence / 0.5 : options.spectral,
						finish: options.finish,
						time: 0,
						lift: 0,
						activity: 0,
						fluidity,
					},
					designMask,
					designEffects,
					portrait: texture,
					foil: foilTexture,
					reversePrint: backTexture,
					materialField: fieldMap,
					opticalAtlas: atlas,
					printSampler: sampler(gpu, {
						minFilter: "linear",
						magFilter: "linear",
					}),
				},
			});
			const glowSize = (width: number, height: number): [number, number] => [
				Math.max(1, Math.round(width / 4)),
				Math.max(1, Math.round(height / 4)),
			];
			const sampling = sampler(gpu, {
				minFilter: "linear",
				magFilter: "linear",
				addressModeU: "clamp-to-edge",
				addressModeV: "clamp-to-edge",
			});
			scene = target(gpu, {
				size: screen.size,
				format: "rgba16float",
				label: "prism-hdr",
			});
			glowX = target(gpu, {
				size: glowSize(...screen.size),
				format: "rgba16float",
				label: "prism-glow-x",
			});
			glowY = target(gpu, {
				size: glowX.size,
				format: "rgba16float",
				label: "prism-glow-y",
			});
			blurX = effect(gpu, bloomShader, {
				set: {
					blur: {
						direction: [1 / glowX.size[0], 0],
						extract: 1,
						threshold:
							content.design === "andes" || content.edition || content.document ? 1.1 : 0.42,
					},
					source: scene,
					linearSampler: sampling,
				},
			});
			blurY = effect(gpu, bloomShader, {
				set: {
					blur: { direction: [0, 1 / glowY.size[1]], extract: 0, threshold: 0.42 },
					source: glowX,
					linearSampler: sampling,
				},
			});
			presentation = effect(gpu, presentShader, {
				set: { scene, glow: glowY, linearSampler: sampling },
			});
			unsubscribeResize = screen.onResize(({ width, height }) => {
				material?.set({ params: { resolution: [width, height] } });
				scene?.resize([width, height]);
				glowX?.resize(glowSize(width, height));
				glowY?.resize(glowSize(width, height));
				if (glowX && glowY) {
					blurX?.set({ blur: { direction: [1 / glowX.size[0], 0] } });
					blurY?.set({ blur: { direction: [0, 1 / glowY.size[1]] } });
				}
			});
			await Promise.all([
				fieldMaterial.compile({ colors: ["rgba16float"] }),
				material.compile({ colors: ["rgba16float"] }),
				blurX.compile({ colors: ["rgba16float"] }),
				blurY.compile({ colors: ["rgba16float"] }),
				presentation.compile({ colors: [screen.format] }),
			]);
			await gpu.settled();
			await settleContent();
			if (disposed) return;
			frame(gpu, render);
			canvas.dataset.ready = "true";
			onReady();
			resume();
		} catch (error) {
			if (!disposed) fail(error);
		}
	})();

	return {
		setOptions(next) {
			if (disposed) return;
			options = next;
			material?.set({
				params: {
					finish: next.finish,
					spectral: layout.recipe ? layout.recipe.material.iridescence / 0.5 : next.spectral,
				},
			});
		},
		async setContent(nextData, nextAppearance) {
			if (disposed) throw new DOMException("Aborted", "AbortError");
			content = nextData;
			layout = nextAppearance;
			photoRequest++;
			if (!material || !gpu || !foilTexture) return;
			await refreshContent();
		},
		async exportImage() {
			if (!gpu || !screen || !material || disposed) throw new Error("El badge no está listo.");
			frame(gpu, render);
			const [width, height] = screen.size;
			const backgroundColor =
				content.design === "andes" || content.edition || content.document
					? "#050406"
					: layout.surface && layout.surface !== "prism"
						? "#efeeea"
						: ["#efeeea", "#ece8f0", "#0e0f12"][options.finish];
			const pixels = await screen.read();
			if (disposed) throw new Error("El badge se cerró.");
			const output = document.createElement("canvas");
			output.width = width;
			output.height = height;
			const ctx = output.getContext("2d");
			if (!ctx) throw new Error("No se pudo guardar la imagen.");
			const rgba = new Uint8ClampedArray(pixels);
			for (let i = 0; i < rgba.length; i += 4) {
				const alpha = rgba[i + 3] / 255;
				if (alpha > 0 && alpha < 1) {
					rgba[i] /= alpha;
					rgba[i + 1] /= alpha;
					rgba[i + 2] /= alpha;
				}
			}
			const image = new ImageData(rgba, output.width, output.height);
			const transparent = document.createElement("canvas");
			transparent.width = output.width;
			transparent.height = output.height;
			transparent.getContext("2d")?.putImageData(image, 0, 0);
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, output.width, output.height);
			ctx.drawImage(transparent, 0, 0);
			const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve));
			if (!blob || disposed) throw new Error("No se pudo exportar el badge.");
			return blob;
		},
		dispose,
	};
}
