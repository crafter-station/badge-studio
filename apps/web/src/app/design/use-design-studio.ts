"use client";

import { preparePhoto } from "@/app/badge/prepare-photo";
import { useParticipantProfile } from "@/components/participant-profile-provider";
import { loadBadgeFonts } from "@/lib/badge-fonts";
import type { CommunityPublication } from "@/lib/community-contract";
import { designPresets as badgeDesignExamples } from "@/lib/design-presets";
import { applyParticipantIdentity } from "@/lib/participant-profile";
import { demoParticipant, participantForDesign } from "@/lib/studio-participant";
import {
	type BadgeDesign,
	type BadgeLayer,
	type DesignSide,
	badgeDesignSchema,
} from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";
import { useSearchParams } from "next/navigation";
import { type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { communityRequest } from "./community-client";
import { copyCommunityDesign, loadCommunityCollection } from "./community-collection";
import { agentEditSchema, editFromAgent } from "./design-agent";
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
	type DesignLocation,
	designHref,
	designLocationKey,
	readDesignLocation,
} from "./design-location";
import {
	type DesignEditorState,
	replaceDesign,
	undoDesign,
	updateDesignLayer,
} from "./design-state";

const defaultDesign =
	badgeDesignExamples.find((design) => design.source === "gtm") ?? badgeDesignExamples[0];

export function useDesignStudio() {
	const searchParams = useSearchParams();
	const routeKey = designLocationKey(readDesignLocation(searchParams));
	const appliedRoute = useRef<string | undefined>(undefined);
	const [selection, setSelection] = useState<DesignLocation | null>(null);
	const [community, setCommunity] = useState<CommunityPublication[]>([]);
	const [communityLoading, setCommunityLoading] = useState(true);
	const [communityError, setCommunityError] = useState("");
	const [communityAttempt, setCommunityAttempt] = useState(0);
	const [editor, setEditor] = useState<DesignEditorState>(() => ({
		design: defaultDesign,
		locks: { front: [], back: [], material: false },
		past: [],
	}));
	const profile = useParticipantProfile();
	const [baseParticipant, setBaseParticipant] = useState<PrismBadgeData>(demoParticipant);
	const participant = useMemo(
		() => applyParticipantIdentity(baseParticipant, profile.identity, profile.portraitUrl),
		[baseParticipant, profile.identity, profile.portraitUrl],
	);
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
	const retry = useRef<{ fingerprint: string; requestId: string } | undefined>(undefined);
	const dirty = savedFingerprint !== JSON.stringify(editor.design);

	useEffect(() => {
		const controller = new AbortController();
		mounted.current = true;
		void designRequest<DesignLibrary>("", { signal: controller.signal })
			.then((result) => {
				if (controller.signal.aborted) return;
				setLibrary(result);
			})
			.catch((reason) => {
				if (!controller.signal.aborted) setError((reason as Error).message);
			});
		void loadBadgeFonts()
			.catch(() => {})
			.finally(() => {
				if (!controller.signal.aborted) setFontsReady(true);
			});
		return () => {
			mounted.current = false;
			controller.abort();
			active.current?.abort();
		};
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setCommunityLoading(true);
		setCommunityError("");
		if (!communityAttempt) setCommunity([]);
		void loadCommunityCollection(controller.signal, setCommunity)
			.catch((reason) => {
				if (!controller.signal.aborted) setCommunityError((reason as Error).message);
			})
			.finally(() => {
				if (!controller.signal.aborted) setCommunityLoading(false);
			});
		return () => controller.abort();
	}, [communityAttempt]);

	function markLocation(location: DesignLocation | null, navigate = true, replace = false) {
		appliedRoute.current = designLocationKey(location);
		setSelection(location);
		if (navigate) {
			const href = designHref(location, window.location.href);
			if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
				history[replace ? "replaceState" : "pushState"](null, "", href);
		}
	}

	async function perform(
		label: string,
		operation: (signal: AbortSignal) => Promise<() => void>,
		externalSignal?: AbortSignal,
	) {
		if (active.current || externalSignal?.aborted) return false;
		const controller = new AbortController();
		const abort = () => controller.abort(externalSignal?.reason);
		externalSignal?.addEventListener("abort", abort, { once: true });
		active.current = controller;
		setError("");
		setNotice("");
		setPhase(label);
		try {
			const commit = await operation(controller.signal);
			if (controller.signal.aborted || !mounted.current || active.current !== controller)
				return false;
			commit();
			return true;
		} catch (reason) {
			if (!controller.signal.aborted && mounted.current)
				setError(
					(reason as Error).name === "TimeoutError"
						? "The operation took too long. Your design is intact; you can try again."
						: (reason as Error).message,
				);
			return false;
		} finally {
			externalSignal?.removeEventListener("abort", abort);
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

	function select(
		design: BadgeDesign,
		sameDirection = false,
		location: DesignLocation | null = badgeDesignExamples.includes(design) && design.source
			? { kind: "style", id: design.source }
			: null,
		navigate = true,
	) {
		if (active.current) return;
		setEditor((state) => replaceDesign(state, design, sameDirection));
		setBaseParticipant((person) => participantForDesign(person, design));
		if (!sameDirection) {
			setSaved(undefined);
			setSavedFingerprint("");
			setProposals([]);
			markLocation(location, navigate);
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
			refine ? "Refining your direction…" : "Designing three proposals…",
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
					setPhase("Composition ready. Generating the artwork for the first proposal…");
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
						artworkError = `The composition is ready; the artwork needs another attempt. ${(reason as Error).message}`;
					}
				}
				return () => {
					setProposals(next);
					setEditor((state) => replaceDesign(state, next[0], refine));
					if (!refine) {
						setSaved(undefined);
						setSavedFingerprint("");
						markLocation(null);
					}
					retry.current = undefined;
					if (artworkError) setError(artworkError);
					setNotice(
						refine
							? "Variant ready. Locked elements were kept."
							: "Three directions ready. Explore both faces and pick one.",
					);
				};
			},
		);
	}

	async function uploadReference(file: File) {
		await perform("Preparing the reference…", async (signal) => {
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
				setNotice("Reference ready. The next exploration will start from its visual direction.");
			};
		});
	}

	async function generateArtwork() {
		const input = {
			design: editor.design,
			locks: editor.locks,
			...(reference ? { referenceId: reference.id } : {}),
		};
		await perform("Generating the artwork…", async (signal) => {
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
				setNotice("Artwork ready. Your portrait and details are still editable.");
			};
		});
	}

	async function changeArtwork(file: File, signal?: AbortSignal) {
		if (
			(["front", "back"] as const).some((side) =>
				editor.design[side].layers.some(
					(layer) => layer.kind === "image" && editor.locks[side].includes(layer.id),
				),
			)
		) {
			setError("Unlock the artwork layers to change their image.");
			return false;
		}
		const current = editor.design;
		return perform(
			"Changing the artwork…",
			async (signal) => {
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
					setNotice("Artwork updated in the layers that use it.");
				};
			},
			signal,
		);
	}

	async function save(signal?: AbortSignal) {
		const design = editor.design;
		return perform(
			"Saving the direction…",
			async (signal) => {
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
					markLocation({ kind: "design", id: result.id }, true, true);
					setSavedFingerprint(JSON.stringify(design));
					setLibrary((state) =>
						state
							? {
									...state,
									designs: [result, ...state.designs.filter((entry) => entry.id !== result.id)],
								}
							: state,
					);
					setNotice(`Direction saved · version ${result.version}. You can reuse it now.`);
				};
			},
			signal,
		);
	}

	async function load(id: string, signal?: AbortSignal, navigate = true) {
		return perform(
			"Opening the direction…",
			async (signal) => {
				const result = await designRequest<SavedDesign>(`/${encodeURIComponent(id)}`, { signal });
				const design = badgeDesignSchema.parse(result.design);
				return () => {
					setEditor((state) => replaceDesign(state, design, false));
					setBaseParticipant((person) => participantForDesign(person, design));
					setSaved(result);
					markLocation({ kind: "design", id: result.id }, navigate);
					setSavedFingerprint(JSON.stringify(design));
					setProposals([]);
					setNotice(`Version ${result.version} loaded.`);
				};
			},
			signal,
		);
	}

	async function remix(id: string, signal?: AbortSignal, navigate = true) {
		let result: { sourceId: string; sourceVersion: number; identityPreserved: true } | undefined;
		await perform(
			"Opening the Community design…",
			async (signal) => {
				const publication = await communityRequest<CommunityPublication>(
					`/${encodeURIComponent(id)}`,
					undefined,
					undefined,
					signal,
				);
				const design = await copyCommunityDesign(publication, signal);
				return () => {
					setEditor((state) => replaceDesign(state, design, false));
					setBaseParticipant((person) => ({
						...participantForDesign(person, design),
						eventName: publication.snapshot.participant.eventName,
						publicUrl: publication.snapshot.participant.publicUrl,
						signature: publication.snapshot.participant.signature,
						metadata: {
							...publication.snapshot.participant.metadata,
							roleLabel: person.metadata?.roleLabel || person.role,
						},
					}));
					setSaved(undefined);
					setSavedFingerprint("");
					setProposals([]);
					markLocation({ kind: "remix", id }, navigate);
					setNotice("Community design ready. Your photo and details are preserved.");
					result = { sourceId: id, sourceVersion: publication.version, identityPreserved: true };
				};
			},
			signal,
		);
		if (!result) {
			signal?.throwIfAborted();
			throw new Error("Could not open the Community design. Your badge is unchanged.");
		}
		return result;
	}

	const openLocation = useRef(
		(_location: DesignLocation | null, _signal: AbortSignal): Promise<unknown> | undefined =>
			undefined,
	);
	openLocation.current = (location, signal) => {
		if (location?.kind === "remix") return remix(location.id, signal, false);
		if (location?.kind === "design") return load(location.id, signal, false);
		const design = location
			? badgeDesignExamples.find((value) => value.source === location.id)
			: defaultDesign;
		if (design) {
			select(design, false, location, false);
			if (!location && design.source)
				markLocation({ kind: "style", id: design.source }, true, true);
		} else setError("We could not find that style. Choose a direction from the collection.");
	};
	useEffect(() => {
		if (appliedRoute.current === routeKey) return;
		const controller = new AbortController();
		active.current?.abort();
		active.current = null;
		setPhase("");
		void openLocation
			.current(readDesignLocation(new URLSearchParams(window.location.search)), controller.signal)
			?.catch(() => {});
		return () => controller.abort();
	}, [routeKey]);

	function agentEdit(input: unknown) {
		if (active.current) throw new Error("An editor operation is already running.");
		const edit = agentEditSchema.parse(input);
		const next = editFromAgent(editor, edit);
		setEditor(next);
		setBaseParticipant((person) =>
			edit.action === "select"
				? participantForDesign(person, next.design)
				: {
						...person,
						eventName: next.design.event,
						...(person.metadata
							? { metadata: { ...person.metadata, eventName: next.design.event } }
							: {}),
					},
		);
		if (edit.action === "select") {
			setSaved(undefined);
			setSavedFingerprint("");
			markLocation({ kind: "style", id: edit.source });
		}
		setError("");
		setNotice("Your agent's changes were applied. You can keep editing or undo them.");
	}

	function setParticipant(update: SetStateAction<PrismBadgeData>) {
		const next = typeof update === "function" ? update(participant) : update;
		setBaseParticipant(next);
		const patch = Object.fromEntries(
			(["name", "role", "organization", "number"] as const)
				.filter((key) => next[key] !== participant[key])
				.map((key) => [key, next[key] ?? ""]),
		);
		profile.updateIdentity(patch);
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
		setError(
			next === editor ? "That change does not fit on the badge or overlaps the QR area." : "",
		);
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
					text: "Your text",
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
			setError("That change would remove required data or cover the QR. Move the elements first.");
	}

	function setEvent(event: string) {
		setBaseParticipant((person) => ({ ...person, eventName: event }));
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
		agentEdit,
		participant,
		profile,
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
		selection,
		remix,
		community,
		communityLoading,
		communityError,
		retryCommunity: () => setCommunityAttempt((value) => value + 1),
		uploadReference,
		generateArtwork,
		save,
		load,
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
			setNotice("Operation cancelled. Your latest design was kept.");
		},
	};
}
