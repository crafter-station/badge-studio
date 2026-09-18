import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { gzipSync } from "node:zlib";
import { recipeFixture } from "../../design/src/prism-style.fixture";
import { type PrismAppearance, type PrismBadgeData, defaultPrismAppearance } from "./types";

function deferred<T>() {
	const { promise, resolve, reject } = Promise.withResolvers<T>();
	return { promise, resolve, reject };
}

const photos = new Map<string, ReturnType<typeof deferred<ImageBitmap>>>();
const loads: { url: string; signal: AbortSignal }[] = [];
const copies: unknown[] = [];
const uniforms: { params?: Record<string, unknown>; field?: Record<string, unknown> }[] = [];
const disposed = mock(() => {});
const surfaceDisposed = mock(() => {});
const loopStarted = mock(() => {});
const loopStopped = mock(() => {});
let compiled = false;
let atlas = deferred<Response>();
let initialize: () => Promise<typeof gpu>;
let labCompile: () => Promise<void>;
let labRead: () => Promise<Float32Array>;
const passes: string[] = [];
const labReads = mock(() => {});
let advanceFrame: (() => void) | undefined;
const gpu = {
	dispose: disposed,
	onError: () => () => {},
	settled: async () => {
		compiled = true;
	},
	device: { createTexture: () => ({ gpu: {} }) },
	gpu: {
		addEventListener: () => {},
		removeEventListener: () => {},
		lost: new Promise(() => {}),
		queue: {
			copyExternalImageToTexture: ({ source }: { source: unknown }) => copies.push(source),
			writeTexture: () => {},
			onSubmittedWorkDone: async () => {},
		},
	},
};
mock.module("vgpu", () => ({
	init: () => initialize(),
	effect: (
		_gpu: unknown,
		shader: string,
		options: { set?: { params?: Record<string, unknown> } },
	) => {
		if (options.set) uniforms.push(options.set);
		return {
			shader,
			set: (values: { params?: Record<string, unknown> }) => uniforms.push(values),
			compile: () => (shader.includes("fn invented") ? labCompile() : Promise.resolve()),
		};
	},
	frame: (_gpu: unknown, render: (frame: unknown) => void) =>
		render({ pass: (_target: unknown, effect: { shader: string }) => passes.push(effect.shader) }),
	frameLoop: (
		_gpu: unknown,
		render: (frame: { pass: (_target: unknown, effect: { shader: string }) => void }) => void,
	) => {
		loopStarted();
		advanceFrame = () => render({ pass: (_target, effect) => passes.push(effect.shader) });
		return { stop: loopStopped };
	},
	sampler: () => ({}),
	surface: () => ({
		size: [1080, 1440],
		format: "rgba8unorm",
		onResize: () => () => {},
		dispose: surfaceDisposed,
	}),
	target: () => ({
		size: [1080, 1440],
		readFloats: () => {
			labReads();
			return labRead();
		},
	}),
}));
const actualPrint = await import("./print");
mock.module("./print", () => ({
	...actualPrint,
	createPrint: (image: ImageBitmap) => image,
	createFoil: (data: unknown) => data,
	createBack: (data: unknown) => ({ reverse: data }),
	loadPortrait: (url: string, signal: AbortSignal) => {
		loads.push({ url, signal });
		const photo = photos.get(url);
		if (!photo) throw new Error(`Unexpected portrait: ${url}`);
		return photo.promise;
	},
}));
for (const shader of ["./prism.wgsl", "./bloom.wgsl", "./present.wgsl"])
	mock.module(shader, () => ({ default: "" }));
mock.module("./material-field.wgsl", () => ({
	default: `fn _noise_perlin2d() {}
fn _noise_voronoi2d() {}
@fragment fn fs_main() {
}`,
}));
const { startPrism } = await import("./renderer");
const { validateShader } = await import("./shader-lab");
const originals = {
	window: globalThis.window,
	document: globalThis.document,
	fetch: globalThis.fetch,
};
const controllers: ReturnType<typeof startPrism>[] = [];

beforeEach(() => {
	photos.clear();
	loads.length = 0;
	copies.length = 0;
	uniforms.length = 0;
	passes.length = 0;
	advanceFrame = undefined;
	labReads.mockClear();
	initialize = async () => gpu;
	labCompile = async () => {};
	labRead = async () => new Float32Array([-0.5, 1, -1, 1, 0.5, 0.5, -0.5, 1]);
	disposed.mockClear();
	surfaceDisposed.mockClear();
	loopStarted.mockClear();
	loopStopped.mockClear();
	compiled = false;
	atlas = deferred<Response>();
	Object.assign(globalThis, {
		window: { matchMedia: () => ({ matches: false }), location: { search: "" } },
		document: {
			addEventListener: () => {},
			removeEventListener: () => {},
			createElement: () => ({
				getContext: () => ({
					createImageData: () => ({ data: new Uint8ClampedArray(384 * 576 * 4) }),
					putImageData: () => {},
				}),
				toDataURL: () => "data:image/png;base64,verified",
			}),
		},
		fetch: () => atlas.promise,
	});
});
afterEach(() => {
	for (const controller of controllers.splice(0)) controller.dispose();
	Object.assign(globalThis, originals);
});

function image() {
	return { width: 80, height: 60, close: mock(() => {}) } as unknown as ImageBitmap;
}
function data(portraitUrl: string) {
	return { name: "Ada", role: "Attendee", eventName: "Prism", number: 1, portraitUrl };
}
function start(
	appearance = defaultPrismAppearance,
	fixedSize = true,
	content: PrismBadgeData = data("original"),
) {
	const ready = mock(() => {});
	const error = mock(() => {});
	const listeners = new Map<string, (event: unknown) => void>();
	const canvas = {
		addEventListener: (name: string, handler: (event: unknown) => void) =>
			listeners.set(name, handler),
		removeEventListener: (name: string) => listeners.delete(name),
		getBoundingClientRect: () => ({ left: 0, top: 0, width: 1080, height: 1440 }),
		dataset: {} as Record<string, string>,
	} as unknown as HTMLCanvasElement;
	const controller = startPrism(
		canvas,
		{ finish: 0, spectral: 0.66, motion: false, fluid: false },
		content,
		appearance,
		"/prism",
		fixedSize,
		ready,
		error,
	);
	controllers.push(controller);
	return { controller, ready, error, canvas, listeners };
}
async function flush() {
	for (let index = 0; index < 20; index++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}
async function until(predicate: () => boolean) {
	for (let index = 0; index < 200 && !predicate(); index++)
		await new Promise((resolve) => setTimeout(resolve, 5));
	expect(predicate()).toBe(true);
}
async function loaded(
	appearance: PrismAppearance = defaultPrismAppearance,
	fixedSize = true,
	content?: PrismBadgeData,
) {
	const original = image();
	photos.set("original", deferred());
	photos.get("original")?.resolve(original);
	const state = start(appearance, fixedSize, content);
	atlas.resolve(new Response(gzipSync(new Uint8Array(1024 * 1536 * 4))));
	await until(() => state.ready.mock.calls.length > 0 || state.error.mock.calls.length > 0);
	expect(state.error).not.toHaveBeenCalled();
	expect(state.ready).toHaveBeenCalledTimes(1);
	return { ...state, original };
}

test("crop changes wait for an in-flight replacement instead of reporting ready on the old bitmap", async () => {
	const { controller, original } = await loaded();
	const replacement = image();
	photos.set("replacement", deferred());
	const first = controller.setContent(data("replacement"), defaultPrismAppearance).catch(() => {});
	let ready = false;
	const second = controller
		.setContent(data("replacement"), {
			...defaultPrismAppearance,
			crop: { x: 0.6, y: 0.5, zoom: 1.1 },
		})
		.then(() => {
			ready = true;
		});
	await flush();
	expect(ready).toBe(false);
	photos.get("replacement")?.resolve(replacement);
	await Promise.all([first, second]);
	expect(copies.filter((copy) => copy === replacement).length).toBeGreaterThan(0);
	expect(original.close).toHaveBeenCalledTimes(1);
});

test("initialization does not announce ready for a portrait changed during atlas loading", async () => {
	const original = image();
	photos.set("original", deferred());
	photos.get("original")?.resolve(original);
	photos.set("replacement", deferred());
	const { controller, ready, error } = start();
	await flush();
	const changed = controller.setContent(data("replacement"), defaultPrismAppearance);
	atlas.resolve(new Response(gzipSync(new Uint8Array(1024 * 1536 * 4))));
	await until(() => compiled);
	await flush();
	expect(ready).not.toHaveBeenCalled();
	const replacement = image();
	photos.get("replacement")?.resolve(replacement);
	await changed;
	await flush();
	expect(ready).toHaveBeenCalledTimes(1);
	expect(error).not.toHaveBeenCalled();
	expect(copies).toContain(replacement);
});

test("disposing during replacement rejects readiness and closes the late bitmap", async () => {
	const { controller, original } = await loaded();
	photos.set("replacement", deferred());
	const pending = controller.setContent(data("replacement"), defaultPrismAppearance);
	controller.dispose();
	const replacement = image();
	photos.get("replacement")?.resolve(replacement);
	await expect(pending).rejects.toMatchObject({ name: "AbortError" });
	expect(replacement.close).toHaveBeenCalledTimes(1);
	expect(original.close).toHaveBeenCalledTimes(1);
	expect(copies).not.toContain(replacement);
	expect(disposed).toHaveBeenCalledTimes(1);
});

test("a slower replaced request never overwrites the newest portrait", async () => {
	const { controller } = await loaded();
	photos.set("slow", deferred());
	photos.set("latest", deferred());
	const slow = controller.setContent(data("slow"), defaultPrismAppearance).catch(() => {});
	const latest = controller.setContent(data("latest"), defaultPrismAppearance);
	const current = image();
	photos.get("latest")?.resolve(current);
	await latest;
	const obsolete = image();
	photos.get("slow")?.resolve(obsolete);
	await slow;
	expect(copies).toContain(current);
	expect(copies).not.toContain(obsolete);
	expect(obsolete.close).toHaveBeenCalledTimes(1);
	expect(loads.find((load) => load.url === "slow")?.signal.aborted).toBe(true);
	controller.dispose();
	expect(current.close).toHaveBeenCalledTimes(1);
});

test("disposal during initialization releases a late decoded bitmap without announcing readiness", async () => {
	photos.set("original", deferred());
	const { controller, ready, error } = start();
	await flush();
	controller.dispose();
	const late = image();
	photos.get("original")?.resolve(late);
	await flush();
	expect(late.close).toHaveBeenCalledTimes(1);
	expect(disposed).toHaveBeenCalledTimes(1);
	expect(ready).not.toHaveBeenCalled();
	expect(error).not.toHaveBeenCalled();
	expect(loads[0].signal.aborted).toBe(true);
	await expect(
		controller.setContent(data("original"), defaultPrismAppearance),
	).rejects.toMatchObject({ name: "AbortError" });
});

test("a failed replacement can retry the same URL without keeping the old portrait", async () => {
	const { controller } = await loaded();
	photos.set("replacement", deferred());
	const failed = controller.setContent(data("replacement"), defaultPrismAppearance);
	photos.get("replacement")?.reject(new Error("Injected photo failure"));
	await expect(failed).rejects.toThrow("Injected photo failure");
	const replacement = image();
	photos.set("replacement", deferred());
	photos.get("replacement")?.resolve(replacement);
	await controller.setContent(data("replacement"), defaultPrismAppearance);
	expect(copies).toContain(replacement);
	expect(loads.filter((load) => load.url === "replacement")).toHaveLength(2);
});

test("a burst of crop updates shares one photo load and only the latest update completes", async () => {
	const { controller } = await loaded();
	photos.set("replacement", deferred());
	const requests = Array.from({ length: 20 }, (_, index) =>
		controller.setContent(data("replacement"), {
			...defaultPrismAppearance,
			crop: { x: 0.5, y: 0.5, zoom: 1 + index / 20 },
		}),
	);
	const finished = Promise.allSettled(requests);
	photos.get("replacement")?.resolve(image());
	const results = await finished;
	expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
	expect(results[19].status).toBe("fulfilled");
	expect(loads.filter((load) => load.url === "replacement")).toHaveLength(1);
});

test("recipe material reaches GPU after selection and presets restore original uniforms", async () => {
	const { controller } = await loaded();
	await controller.setContent(data("original"), {
		...defaultPrismAppearance,
		recipe: recipeFixture,
		surface: recipeFixture.surface,
	});
	const custom = uniforms.findLast((values) => values.params)?.params;
	expect(custom?.customMaterial).toEqual([0.7, 0.12, 1, 0]);
	expect(custom?.spectral).toBe(0.24);
	expect(custom?.surfaceKind).toBe(1);
	expect(custom?.coating).toEqual([0.5, 0.2, 0.4, 0.8]);
	expect(uniforms.findLast((values) => values.field)?.field?.flow0).toEqual([1, 0.12, 1, 0]);
	await controller.setContent(data("original"), defaultPrismAppearance);
	expect(uniforms.findLast((values) => values.params)?.params?.customMaterial).toEqual([
		0, 0, 0, 0,
	]);
	expect(uniforms.findLast((values) => values.params)?.params?.spectral).toBe(0.66);
});

const laboratoryRecipe = {
	...recipeFixture,
	shader: { version: 1 as const, code: "return sin(p.x * 5.0 + t + pointer.x);" },
};

test.each([false, true])(
	"ribbon artwork activates and resets across editions (%s)",
	async (initialRibbon) => {
		const plain = data("original");
		const ribbon: PrismBadgeData = {
			...plain,
			edition: {
				layout: "ribbon",
				title: ["GTM"],
				subtitle: "Execution",
				base: "#f8eff3",
				ink: "#100d20",
				accent: "#e963e8",
				motif: "waves",
				portrait: "mono",
				typeface: "sans",
			},
		};
		const appearance = { ...defaultPrismAppearance, recipe: recipeFixture };
		const { controller } = await loaded(appearance, true, initialRibbon ? ribbon : plain);
		const mode = () =>
			(uniforms.findLast((values) => values.params)?.params?.customMaterial as number[])[3];
		expect(mode()).toBe(initialRibbon ? 1 : 0);
		await controller.setContent(initialRibbon ? plain : ribbon, appearance);
		expect(mode()).toBe(initialRibbon ? 0 : 1);
		await controller.setContent(initialRibbon ? ribbon : plain, appearance);
		expect(mode()).toBe(initialRibbon ? 1 : 0);
	},
);

test.each([false, true])(
	"shader interaction is independent of card wobble and honors reduced motion (%s)",
	async (reduced) => {
		window.matchMedia = (() => ({ matches: reduced })) as typeof window.matchMedia;
		const state = await loaded(
			{
				...defaultPrismAppearance,
				recipe: { ...laboratoryRecipe, motion: { amplitude: 0, speed: 0.3 } },
			},
			false,
		);
		state.controller.setOptions({ finish: 0, spectral: 0.66, motion: true, fluid: false });
		state.listeners.get("pointermove")?.({ clientX: 2000, clientY: -100 });
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(advanceFrame).toBeDefined();
		advanceFrame?.();
		const field = uniforms.at(-1)?.field;
		const [x, y] = field?.pointer as number[];
		if (reduced) {
			expect([x, y, field?.time]).toEqual([0, 0, 0]);
		} else {
			expect(x).toBeGreaterThan(0);
			expect(x).toBeLessThanOrEqual(1);
			expect(y).toBeLessThan(0);
			expect(y).toBeGreaterThanOrEqual(-1);
			expect(field?.time).toBeGreaterThan(0);
		}
	},
);

test("a preview pauses offscreen, resumes once and stays stopped after disposal", async () => {
	const { controller } = await loaded(defaultPrismAppearance, false);
	const options = { finish: 0, spectral: 0.66, motion: true, fluid: false };
	expect(loopStarted).toHaveBeenCalledTimes(1);
	controller.setOptions({ ...options, active: false });
	expect(loopStopped).toHaveBeenCalledTimes(1);
	controller.setOptions({ ...options, active: false });
	expect(loopStopped).toHaveBeenCalledTimes(1);
	controller.setOptions({ ...options, active: true });
	controller.setOptions({ ...options, active: true });
	expect(loopStarted).toHaveBeenCalledTimes(2);
	controller.dispose();
	expect(loopStopped).toHaveBeenCalledTimes(2);
	controller.setOptions({ ...options, active: true });
	expect(loopStarted).toHaveBeenCalledTimes(2);
});

test("a preview hidden while loading paints once without starting an animation loop", async () => {
	photos.set("original", deferred());
	const { controller, ready } = start(defaultPrismAppearance, false);
	const options = { finish: 0, spectral: 0.66, motion: true, fluid: false };
	controller.setOptions({ ...options, active: false });
	photos.get("original")?.resolve(image());
	atlas.resolve(new Response(gzipSync(new Uint8Array(1024 * 1536 * 4))));
	await until(() => ready.mock.calls.length > 0);
	expect(passes.length).toBeGreaterThan(0);
	expect(loopStarted).not.toHaveBeenCalled();
	controller.setOptions({ ...options, active: true });
	expect(loopStarted).toHaveBeenCalledTimes(1);
});

test("flat previews keep their silhouette fixed while the material responds to time and pointer", async () => {
	const { controller, listeners } = await loaded(
		{ ...defaultPrismAppearance, recipe: laboratoryRecipe },
		false,
	);
	controller.setOptions({ finish: 0, spectral: 0.66, motion: true, fluid: false, flat: true });
	listeners.get("pointermove")?.({ clientX: 2000, clientY: -100 });
	await new Promise((resolve) => setTimeout(resolve, 10));
	advanceFrame?.();
	const params = uniforms.findLast((values) => values.params)?.params;
	expect(params?.angles).toEqual([0, 0]);
	expect(params?.roll).toBe(0);
	expect(params?.lift).toBe(0);
	expect(params?.time).toBeGreaterThan(0);
	const field = uniforms.findLast((values) => values.field)?.field;
	expect((field?.pointer as number[])[0]).toBeGreaterThan(0);
	expect((field?.pointer as number[])[1]).toBeLessThan(0);
	expect(field?.time).toBeGreaterThan(0);
});

test("GPU admission probes four states, uses the submitted formula and releases its context", async () => {
	const result = await validateShader(laboratoryRecipe);
	expect(result.preview).toBe("data:image/png;base64,verified");
	expect(result.spread).toBe(1);
	expect(result.milliseconds).toBeGreaterThanOrEqual(0);
	expect(labReads).toHaveBeenCalledTimes(4);
	expect(passes).toHaveLength(4);
	for (const source of passes) {
		expect(source).toContain(laboratoryRecipe.shader.code);
		expect(source).toContain("return _noise_perlin2d(p)");
		expect(source.match(/@fragment/g)).toHaveLength(1);
	}
	expect(
		uniforms.filter((value) => value.field?.pointer).map((value) => value.field?.pointer),
	).toEqual([
		[0, 0],
		[0, 0],
		[0.8, -0.7],
		[-1, 1],
		[0.3, 0.5],
	]);
	expect(disposed).toHaveBeenCalledTimes(1);
});

test("compiler and invalid-pixel failures reject admission, preserve diagnostics and release the GPU", async () => {
	labCompile = async () => {
		throw new Error("private native compiler diagnostics");
	};
	await expect(validateShader(laboratoryRecipe)).rejects.toThrow("No pudimos validar");
	expect(labReads).not.toHaveBeenCalled();
	expect(disposed).toHaveBeenCalledTimes(1);
	labCompile = async () => {};
	labRead = async () => new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]);
	await expect(validateShader(laboratoryRecipe)).rejects.toThrow("plano");
	expect(labReads).toHaveBeenCalledTimes(1);
	expect(disposed).toHaveBeenCalledTimes(2);
});

test("cancellation releases a late GPU and never submits an obsolete formula", async () => {
	const late = deferred<typeof gpu>();
	const signal = new AbortController();
	initialize = () => late.promise;
	const pending = validateShader(laboratoryRecipe, signal.signal);
	signal.abort();
	await expect(pending).rejects.toThrow("cancelada");
	expect(disposed).not.toHaveBeenCalled();
	late.resolve(gpu);
	await flush();
	expect(disposed).toHaveBeenCalledTimes(1);
	expect(passes).toHaveLength(0);
	expect(labReads).not.toHaveBeenCalled();
});

test("deadline releases an existing context even when compilation ignores cancellation", async () => {
	const originalTimeout = globalThis.setTimeout;
	const compilation = deferred<void>();
	labCompile = () => compilation.promise;
	globalThis.setTimeout = ((callback: TimerHandler, duration?: number) =>
		originalTimeout(callback, duration === 10_000 ? 0 : duration)) as typeof setTimeout;
	try {
		await expect(validateShader(laboratoryRecipe)).rejects.toThrow("tardó demasiado");
		expect(disposed).toHaveBeenCalledTimes(1);
		compilation.resolve();
		await flush();
		expect(passes).toHaveLength(0);
	} finally {
		globalThis.setTimeout = originalTimeout;
	}
});

test("the badge installs a validated formula and uses the stable field after rejection", async () => {
	const appearance = { ...defaultPrismAppearance, recipe: laboratoryRecipe };
	const accepted = await loaded(appearance);
	expect(accepted.canvas.dataset.labStatus).toBe("ready");
	expect(
		passes.filter((source) => source.includes(laboratoryRecipe.shader.code)).length,
	).toBeGreaterThan(4);
	accepted.controller.dispose();
	passes.length = 0;
	atlas = deferred<Response>();
	labCompile = async () => {
		throw new Error("Compiler failure");
	};
	const rejected = await loaded(appearance);
	expect(rejected.canvas.dataset.labStatus).toBe("fallback");
	expect(passes.some((source) => source.includes("fn invented"))).toBe(false);
	expect(copies).toContain(rejected.original);
	expect(rejected.error).not.toHaveBeenCalled();
});

test("disposing the badge during shader admission never announces stale readiness", async () => {
	const compilation = deferred<void>();
	let compiling = false;
	labCompile = () => {
		compiling = true;
		return compilation.promise;
	};
	photos.set("original", deferred());
	photos.get("original")?.resolve(image());
	const state = start({ ...defaultPrismAppearance, recipe: laboratoryRecipe });
	atlas.resolve(new Response(gzipSync(new Uint8Array(1024 * 1536 * 4))));
	await until(() => compiling);
	state.controller.dispose();
	compilation.resolve();
	await flush();
	expect(state.ready).not.toHaveBeenCalled();
	expect(state.error).not.toHaveBeenCalled();
	expect(passes).toHaveLength(0);
	expect(disposed).toHaveBeenCalledTimes(2);
});
