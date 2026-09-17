"use client";

import { preparePhoto } from "@/app/badge/prepare-photo";
import { badgeEditions } from "@/app/collection/editions";
import { designPresets as badgeDesignExamples } from "@/lib/design-presets";
import {
	type BadgeDesign,
	type BadgeLayer,
	type DesignSide,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";
import { useEffect, useRef, useState } from "react";
import {
	type DesignLibrary,
	type DesignReference,
	type SavedDesign,
	designAssetUrl,
	designRequest,
	parseDesigns,
	requestJson,
} from "./design-client";
import {
	type DesignEditorState,
	replaceDesign,
	undoDesign,
	updateDesignLayer,
} from "./design-state";

const defaultDesign =
	badgeDesignExamples.find((design) => design.source === "gtm") ?? badgeDesignExamples[0];

const demoParticipant: PrismBadgeData = {
	name: "Railly Hugo",
	role: "Builder",
	organization: "Vercel",
	number: 1,
	eventName: "The GTM Hackathon",
	portraitUrl: "/api/demo-portrait",
	publicUrl: "https://crafters.chat/",
	signature: { seed: 42091, version: 1 },
};

function participantForDesign(person: PrismBadgeData, design: BadgeDesign): PrismBadgeData {
	const edition = badgeEditions.find((item) => item.id === design.source);
	return {
		...person,
		design: undefined,
		edition: undefined,
		document: undefined,
		eventName: design.event,
		signature: {
			seed:
				design.material.recipe?.seed ??
				edition?.data.signature?.seed ??
				person.signature?.seed ??
				1,
			version: 1,
		},
		...(edition
			? {
					publicUrl: edition.data.publicUrl,
					metadata: {
						...(edition.data.metadata ?? {
							roleLabel: "",
							eventName: edition.name,
							eventDate: "",
							location: "",
							website: "",
							bio: "",
						}),
						roleLabel: person.metadata?.roleLabel || person.role,
						eventName: design.event,
					},
				}
			: {
					publicUrl: `https://example.com/events/${design.source || "your-event"}`,
					metadata: {
						roleLabel: person.metadata?.roleLabel || person.role,
						eventName: design.event,
						eventDate: "Edición 2026",
						location: "Encuentro creativo",
						website: "",
						bio: "",
					},
				}),
	};
}

export function useDesignStudio() {
	const [editor, setEditor] = useState<DesignEditorState>(() => ({
		design: defaultDesign,
		locks: { front: [], back: [], material: false },
		past: [],
	}));
	const [participant, setParticipant] = useState<PrismBadgeData>(demoParticipant);
	const [reference, setReference] = useState<DesignReference>();
	const [proposals, setProposals] = useState<BadgeDesign[]>([]);
	const [library, setLibrary] = useState<DesignLibrary>();
	const [saved, setSaved] = useState<SavedDesign>();
	const [savedFingerprint, setSavedFingerprint] = useState("");
	const [phase, setPhase] = useState("");
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [fontsReady, setFontsReady] = useState(false);
	const [useBase, setUseBase] = useState(true);
	const [autoArtwork, setAutoArtwork] = useState(true);
	const active = useRef<AbortController | null>(null);
	const mounted = useRef(true);
	const photoUrl = useRef<string | undefined>(undefined);
	const photoRevision = useRef(0);
	const retry = useRef<{ fingerprint: string; requestId: string } | undefined>(undefined);
	const dirty = savedFingerprint !== JSON.stringify(editor.design);

	useEffect(() => {
		const controller = new AbortController();
		mounted.current = true;
		const source = new URLSearchParams(window.location.search).get("style");
		const base = badgeDesignExamples.find((design) => design.source === source) ?? defaultDesign;
		const edition = badgeEditions.find((item) => item.id === base.source);
		setEditor({ design: base, locks: { front: [], back: [], material: false }, past: [] });
		setParticipant(participantForDesign(edition?.data ?? demoParticipant, base));
		void designRequest<DesignLibrary>("", { signal: controller.signal })
			.then((result) => {
				if (controller.signal.aborted) return;
				setLibrary(result);
				const selectedId = new URLSearchParams(window.location.search).get("design");
				const entry = result.designs.find((design) => design.id === selectedId);
				if (entry) {
					const design = badgeDesignSchema.parse(entry.design);
					setEditor({ design, locks: { front: [], back: [], material: false }, past: [] });
					setSaved(entry);
					setSavedFingerprint(JSON.stringify(design));
					setParticipant((person) => participantForDesign(person, design));
				}
			})
			.catch((reason) => {
				if (!controller.signal.aborted) setError((reason as Error).message);
			});
		void Promise.all([
			document.fonts.load('700 100px "Andes Brand"'),
			document.fonts.load('700 100px "Andes Display"'),
			document.fonts.load('400 24px "Andes Mono"'),
			document.fonts.load('400 60px "Next Craft Script"'),
			document.fonts.load('700 72px "Next Craft Mono"'),
			document.fonts.load('400 30px "Next Craft Pixel"'),
		])
			.catch(() => {})
			.finally(() => {
				if (!controller.signal.aborted) setFontsReady(true);
			});
		return () => {
			mounted.current = false;
			controller.abort();
			active.current?.abort();
			photoRevision.current++;
			if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
		};
	}, []);

	async function perform(label: string, operation: (signal: AbortSignal) => Promise<() => void>) {
		if (active.current) return;
		const controller = new AbortController();
		active.current = controller;
		setError("");
		setNotice("");
		setPhase(label);
		try {
			const commit = await operation(controller.signal);
			if (!controller.signal.aborted && mounted.current && active.current === controller) commit();
		} catch (reason) {
			if (!controller.signal.aborted && mounted.current)
				setError(
					(reason as Error).name === "TimeoutError"
						? "La operación tardó demasiado. Tu diseño está intacto; puedes reintentarlo."
						: (reason as Error).message,
				);
		} finally {
			if (active.current === controller) {
				active.current = null;
				if (mounted.current) setPhase("");
			}
		}
	}

	function requestId(input: unknown) {
		const fingerprint = JSON.stringify(input);
		if (retry.current?.fingerprint !== fingerprint)
			retry.current = { fingerprint, requestId: crypto.randomUUID() };
		return retry.current.requestId;
	}

	function select(design: BadgeDesign, sameDirection = false) {
		if (active.current) return;
		setEditor((state) => replaceDesign(state, design, sameDirection));
		setParticipant((person) => participantForDesign(person, design));
		if (!sameDirection) {
			setSaved(undefined);
			setSavedFingerprint("");
			history.replaceState(
				history.state,
				"",
				design.source ? `/design?style=${encodeURIComponent(design.source)}` : "/design",
			);
		}
		setError("");
		setNotice("");
	}

	async function generate(prompt: string, refine: boolean) {
		const input = {
			prompt: prompt.trim(),
			...(reference ? { referenceId: reference.id } : {}),
			event: participant.eventName,
			...(refine ? { current: editor.design, locks: editor.locks } : {}),
			...(!refine && useBase ? { base: editor.design } : {}),
		};
		if (!input.prompt) return;
		await perform(
			refine ? "Refinando tu dirección…" : "Diseñando tres propuestas…",
			async (signal) => {
				const result = await designRequest<{ designs: unknown }>(
					"/generate",
					requestJson(
						{
							...input,
							requestId: requestId({ kind: "generate", ...input }),
						},
						signal,
					),
				);
				const next = parseDesigns(result.designs, refine ? 1 : 3);
				let artworkError = "";
				if (
					autoArtwork &&
					!next[0].artwork &&
					next[0].artPrompt &&
					[...next[0].front.layers, ...next[0].back.layers].some((layer) => layer.kind === "image")
				) {
					setPhase("Composición lista. Generando el arte de la primera propuesta…");
					try {
						const illustrated = await designRequest<{ design: unknown }>(
							"/artwork",
							requestJson(
								{
									design: next[0],
									locks: refine ? editor.locks : { front: [], back: [], material: false },
									...(reference ? { referenceId: reference.id } : {}),
									requestId: requestId({ kind: "auto-artwork", design: next[0] }),
								},
								signal,
							),
						);
						next[0] = badgeDesignSchema.parse(illustrated.design);
					} catch (reason) {
						signal.throwIfAborted();
						artworkError = `La composición está lista; la ilustración necesita otro intento. ${(reason as Error).message}`;
					}
				}
				return () => {
					setProposals(next);
					setEditor((state) => replaceDesign(state, next[0], refine));
					if (!refine) {
						setSaved(undefined);
						setSavedFingerprint("");
					}
					retry.current = undefined;
					if (artworkError) setError(artworkError);
					setNotice(
						refine
							? "Variante lista. Los elementos bloqueados se conservaron."
							: "Tres direcciones listas. Explora ambas caras y elige una.",
					);
				};
			},
		);
	}

	async function uploadReference(file: File) {
		await perform("Preparando la referencia…", async (signal) => {
			const image = await preparePhoto(file);
			signal.throwIfAborted();
			const form = new FormData();
			form.set("reference", image, file.name);
			const result = await designRequest<{ id: string }>("/reference", {
				method: "POST",
				body: form,
				signal,
			});
			return () => {
				setReference({ id: result.id, url: designAssetUrl(result.id), name: file.name });
				setNotice("Referencia lista. La próxima exploración partirá de su dirección visual.");
			};
		});
	}

	async function generateArtwork() {
		const input = {
			design: editor.design,
			locks: editor.locks,
			...(reference ? { referenceId: reference.id } : {}),
		};
		await perform("Generando la ilustración…", async (signal) => {
			const result = await designRequest<{ design: unknown }>(
				"/artwork",
				requestJson(
					{
						...input,
						requestId: requestId({ kind: "artwork", ...input }),
					},
					signal,
				),
			);
			const next = badgeDesignSchema.parse(result.design);
			return () => {
				setEditor((state) => replaceDesign(state, next));
				setProposals([]);
				retry.current = undefined;
				setNotice("Ilustración lista. Tu retrato y los datos siguen siendo editables.");
			};
		});
	}

	async function changeArtwork(file: File) {
		if (
			(["front", "back"] as const).some((side) =>
				editor.design[side].layers.some(
					(layer) => layer.kind === "image" && editor.locks[side].includes(layer.id),
				),
			)
		) {
			setError("Desbloquea las capas de ilustración para cambiar su imagen.");
			return;
		}
		const current = editor.design;
		await perform("Cambiando la ilustración…", async (signal) => {
			const image = await preparePhoto(file);
			signal.throwIfAborted();
			const form = new FormData();
			form.set("reference", image, file.name);
			const result = await designRequest<{ id: string }>("/reference", {
				method: "POST",
				body: form,
				signal,
			});
			const next = badgeDesignSchema.parse({ ...current, artwork: { assetId: result.id } });
			return () => {
				setEditor((state) => replaceDesign(state, next));
				setNotice("Ilustración actualizada en las capas que la usan.");
			};
		});
	}

	async function save() {
		const design = editor.design;
		await perform("Guardando la dirección…", async (signal) => {
			const result = await designRequest<SavedDesign>(
				"",
				requestJson(
					{
						design,
						...(saved ? { designId: saved.id, expectedVersion: saved.version } : {}),
					},
					signal,
				),
			);
			badgeDesignSchema.parse(result.design);
			return () => {
				setSaved(result);
				history.replaceState(history.state, "", `/design?design=${encodeURIComponent(result.id)}`);
				setSavedFingerprint(JSON.stringify(design));
				setLibrary((state) =>
					state
						? {
								...state,
								designs: [result, ...state.designs.filter((entry) => entry.id !== result.id)],
							}
						: state,
				);
				setNotice(`Dirección guardada · versión ${result.version}. Ya puedes reutilizarla.`);
			};
		});
	}

	async function load(id: string) {
		await perform("Abriendo la dirección…", async (signal) => {
			const result = await designRequest<SavedDesign>(`/${encodeURIComponent(id)}`, { signal });
			const design = badgeDesignSchema.parse(result.design);
			return () => {
				setEditor((state) => replaceDesign(state, design, false));
				setParticipant((person) => participantForDesign(person, design));
				setSaved(result);
				history.replaceState(history.state, "", `/design?design=${encodeURIComponent(result.id)}`);
				setSavedFingerprint(JSON.stringify(design));
				setProposals([]);
				setNotice(`Versión ${result.version} cargada.`);
			};
		});
	}

	async function changePhoto(file: File) {
		if (active.current) return;
		const revision = ++photoRevision.current;
		setError("");
		try {
			const image = await preparePhoto(file);
			if (!mounted.current || revision !== photoRevision.current) return;
			const next = URL.createObjectURL(image);
			const previous = photoUrl.current;
			photoUrl.current = next;
			setParticipant((data) => ({ ...data, portraitUrl: next }));
			if (previous) URL.revokeObjectURL(previous);
		} catch (reason) {
			if (mounted.current && revision === photoRevision.current)
				setError((reason as Error).message);
		}
	}

	function toggleLock(side: DesignSide, id: string) {
		if (active.current) return;
		setEditor((state) => ({
			...state,
			locks: {
				...state.locks,
				[side]: state.locks[side].includes(id)
					? state.locks[side].filter((value) => value !== id)
					: [...state.locks[side], id],
			},
		}));
	}

	function updateLayer(side: DesignSide, id: string, patch: Partial<BadgeLayer>) {
		if (active.current) return;
		const next = updateDesignLayer(editor, side, id, patch);
		setEditor(next);
		setError(next === editor ? "Ese cambio no cabe en el badge o invade el espacio del QR." : "");
	}

	function toggleVisibility(side: DesignSide, id: string) {
		const layer = editor.design[side].layers.find((value) => value.id === id);
		if (layer) updateLayer(side, id, { visible: layer.visible === false });
	}

	function changeLayers(
		side: DesignSide,
		action: "add" | "delete" | "up" | "down" | "duplicate",
		id: string,
	) {
		if (active.current || (action !== "add" && editor.locks[side].includes(id))) return;
		const layers = structuredClone(editor.design[side].layers);
		const index = layers.findIndex((layer) => layer.id === id);
		const unique = `${action === "add" ? id : "copy"}-${crypto.randomUUID().slice(0, 8)}`;
		if (action === "add") {
			const base = { id: unique, x: 84, y: 700, w: 450, h: 90 };
			let layer: BadgeLayer;
			if (id === "text")
				layer = {
					...base,
					kind: "text",
					text: "Tu texto",
					binding: "none",
					font: "sans",
					color: "#888888",
					size: 48,
					weight: "700",
					align: "left",
				};
			else if (id === "portrait")
				layer = { ...base, kind: "portrait", w: 320, h: 320, radius: 0, filter: "original" };
			else if (id === "image")
				layer = { ...base, kind: "image", asset: "art", w: 500, h: 500, radius: 0, opacity: 1 };
			else if (id === "gradient")
				layer = {
					...base,
					kind: "gradient",
					direction: "vertical",
					stops: [
						{ at: 0, color: "#ffffff00" },
						{ at: 1, color: "#ffffff" },
					],
				};
			else if (id === "graphic")
				layer = {
					...base,
					kind: "graphic",
					pattern: "window",
					w: 600,
					h: 500,
					color: "#dedede",
					accent: "#1807c7",
					density: 1,
					seed: 1,
				};
			else if (id === "effect")
				layer = {
					...base,
					kind: "effect",
					effect: "chromatic-flow",
					x: 0,
					y: 0,
					w: 1024,
					h: 1536,
					colors: ["#f8eff3", "#f563fc", "#91f5fa"],
					scale: 1,
					opacity: 1,
				};
			else
				layer = {
					...base,
					kind: "shape",
					shape: "rectangle",
					color: "#888888",
					opacity: 1,
					radius: 0,
					stroke: 2,
				};
			layers.splice(
				layer.kind === "effect"
					? 0
					: Math.max(
							0,
							layers.findIndex((l) => l.kind === "qr"),
						),
				0,
				layer,
			);
		} else if (index >= 0) {
			if (action === "delete") layers.splice(index, 1);
			else if (action === "duplicate")
				layers.splice(index + 1, 0, { ...layers[index], id: unique });
			else {
				const target = index + (action === "up" ? 1 : -1);
				if (target < 0 || target >= layers.length || editor.locks[side].includes(layers[target].id))
					return;
				[layers[index], layers[target]] = [layers[target], layers[index]];
			}
		}
		const checked = badgeDesignSchema.safeParse({
			...editor.design,
			[side]: { ...editor.design[side], layers },
		});
		if (checked.success) {
			setEditor((state) => replaceDesign(state, checked.data));
			setError("");
		} else
			setError(
				"Ese cambio quitaría datos necesarios o taparía el QR. Mueve los elementos primero.",
			);
	}

	function setEvent(event: string) {
		setParticipant((person) => ({ ...person, eventName: event }));
		if (event.trim() && event.length <= 80 && !active.current)
			setEditor((state) => ({ ...state, design: { ...state.design, event } }));
	}

	function setBackground(side: DesignSide, background: string) {
		if (!active.current)
			setEditor((state) =>
				replaceDesign(state, {
					...state.design,
					[side]: { ...state.design[side], background },
				}),
			);
	}

	function setMaterial(surface: BadgeDesign["material"]["surface"]) {
		updateMaterial({
			surface,
			roughness: surface === "chrome" ? 0.2 : surface === "prism" ? 0.35 : 0.78,
			iridescence: surface === "prism" ? 0.45 : 0.04,
		});
	}

	function updateMaterial(patch: Partial<BadgeDesign["material"]>) {
		if (!active.current && !editor.locks.material)
			setEditor((state) => {
				const checked = badgeDesignSchema.safeParse({
					...state.design,
					material: { ...state.design.material, ...patch },
				});
				return checked.success ? replaceDesign(state, checked.data) : state;
			});
	}

	function toggleMaterialLock() {
		if (!active.current)
			setEditor((state) => ({
				...state,
				locks: { ...state.locks, material: !state.locks.material },
			}));
	}

	return {
		...editor,
		participant,
		setParticipant,
		reference,
		proposals,
		library,
		saved,
		dirty,
		phase,
		error,
		notice,
		fontsReady,
		setError,
		useBase,
		setUseBase,
		autoArtwork,
		setAutoArtwork,
		changeLayers,
		generate,
		select,
		uploadReference,
		generateArtwork,
		save,
		load,
		changePhoto,
		changeArtwork,
		toggleLock,
		toggleVisibility,
		updateLayer,
		setEvent,
		setBackground,
		setMaterial,
		updateMaterial,
		toggleMaterialLock,
		clearReference: () => {
			if (!active.current) setReference(undefined);
		},
		undo: () => {
			if (!active.current) setEditor(undoDesign);
		},
		cancel: () => {
			active.current?.abort();
			active.current = null;
			setPhase("");
			setNotice("Operación cancelada. Conservamos tu último diseño.");
		},
	};
}
