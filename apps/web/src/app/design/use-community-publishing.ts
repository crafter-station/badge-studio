"use client";

import {
	type CommunityPublication,
	type CommunityReceipt,
	type CommunityStatus,
	canonicalJson,
	communityDigest,
	createPublicationSecret,
} from "@/lib/community-contract";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { browserDesignRequest } from "./browser-design-store";
import {
	type PreparedPublication,
	authorizationUrl,
	communityRequest,
	preparePublication,
	publicationCheckpoint,
	requirePendingPublication,
} from "./community-client";
import type { useDesignStudio } from "./use-design-studio";

type Studio = ReturnType<typeof useDesignStudio>;
type Phase = CommunityStatus["state"] | "idle" | "prepared" | "uploading" | "error";

export function useCommunityPublishing(studio: Studio) {
	const latest = useRef(studio);
	latest.current = studio;
	const [prepared, setPrepared] = useState<PreparedPublication>();
	const current = useRef<PreparedPublication | undefined>(undefined);
	const [phase, setPhase] = useState<Phase>("idle");
	const [error, setError] = useState("");
	const [url, setUrl] = useState("");
	const busy = useRef(false);
	const mounted = useRef(true);
	const phaseRef = useRef<Phase>("idle");
	const errorRef = useRef("");
	const recovering = useRef(true);
	const lifetime = useRef<AbortController | undefined>(undefined);

	function workSignal(signal?: AbortSignal) {
		if (!mounted.current || !lifetime.current)
			throw new Error("CANCELLED: El editor ya no está activo.");
		return AbortSignal.any([
			lifetime.current.signal,
			AbortSignal.timeout(30_000),
			...(signal ? [signal] : []),
		]);
	}

	const updatePhase = useCallback((value: Phase) => {
		phaseRef.current = value;
		if (mounted.current) setPhase(value);
	}, []);

	const updateError = useCallback((value: string) => {
		errorRef.current = value;
		if (mounted.current) setError(value);
	}, []);

	async function retain(value: PreparedPublication, signal = workSignal()) {
		await publicationCheckpoint(value, indexedDB, signal);
		signal.throwIfAborted();
		current.current = value;
		if (mounted.current) {
			setPrepared(value);
			setUrl(await authorizationUrl(value));
		}
	}

	async function cancelPending(signal?: AbortSignal) {
		const value = current.current;
		if (value?.consented && !value.receipt) {
			const result = await communityRequest<{ receipt?: CommunityReceipt }>(
				"/cancel",
				{},
				value.secret,
				signal,
			);
			if (result.receipt) {
				await retain({ ...value, receipt: result.receipt }, signal);
				updatePhase(result.receipt.state);
				throw new Error(
					"ALREADY_COMPLETED: La operación ya terminó. Conservamos su comprobante; puedes retirar la publicación si lo deseas.",
				);
			}
		}
	}

	useEffect(() => {
		mounted.current = true;
		const controller = new AbortController();
		lifetime.current = controller;
		void publicationCheckpoint(undefined, indexedDB, controller.signal)
			.then(async (value) => {
				if (controller.signal.aborted || !value) return;
				current.current = value;
				setPrepared(value);
				setUrl(await authorizationUrl(value));
				updatePhase(value.receipt?.state ?? "prepared");
			})
			.catch(() => {
				if (!controller.signal.aborted)
					updateError("No pudimos recuperar una publicación preparada.");
			})
			.finally(() => {
				if (!controller.signal.aborted) recovering.current = false;
			});
		return () => {
			mounted.current = false;
			controller.abort();
		};
	}, [updateError, updatePhase]);

	async function prepare(
		target?: { publicationId: string; expectedVersion: number },
		inputSignal?: AbortSignal,
	) {
		const signal = workSignal(inputSignal);
		if (busy.current || recovering.current)
			throw new Error("BUSY: La publicación todavía se está preparando.");
		busy.current = true;
		updateError("");
		try {
			const value = await preparePublication(
				latest.current.design,
				latest.current.participant,
				target,
				signal,
			);
			await cancelPending(signal);
			await retain(value, signal);
			updatePhase("prepared");
			return describe(value, "prepared");
		} finally {
			busy.current = false;
		}
	}

	function describe(value = current.current, state: Phase = phaseRef.current) {
		return {
			state,
			operationId: value?.intent.operationId,
			snapshotHash: value?.intent.snapshotHash,
			action: value?.intent.action,
			title: value?.intent.title,
			participantName: value?.intent.participantName,
			receipt: value?.receipt
				? { ...value.receipt, url: new URL(value.receipt.url, window.location.origin).href }
				: null,
			error: errorRef.current || null,
			disclosure:
				"Se publicarán la foto, el nombre, los datos, ambas caras y las capas editables. Cualquier persona podrá verlos y reutilizar el diseño.",
		};
	}

	async function progress() {
		const value = current.current;
		if (!value?.consented || value.receipt || busy.current) return describe();
		busy.current = true;
		try {
			const signal = workSignal();
			updateError("");
			const status = await communityRequest<CommunityStatus>(
				"/status",
				{
					secret: value.secret,
					operationId: value.intent.operationId,
				},
				undefined,
				signal,
			);
			if (status.receipt) {
				await retain({ ...value, receipt: status.receipt }, signal);
				updatePhase(status.receipt.state);
				return describe(current.current, status.receipt.state);
			}
			if (
				status.state === "needs_authorization" ||
				status.state === "expired" ||
				status.state === "cancelled"
			) {
				updatePhase(status.state);
				return {
					...describe(value, status.state),
					authorizationUrl: await authorizationUrl(value),
					next: "Abre este enlace en el navegador del usuario para iniciar sesión y confirmar la vista previa. El editor permanece abierto.",
				};
			}
			if (value.snapshot && !value.uploaded) {
				updatePhase("uploading");
				await communityRequest("/stage", { snapshot: value.snapshot }, value.secret, signal);
				for (const slot of ["portrait", "artwork"] as const) {
					const image = value.files[slot];
					if (image) await communityRequest(`/media/${slot}`, image, value.secret, signal);
				}
				await retain({ ...value, uploaded: true }, signal);
			}
			if (status.state === "authorized") {
				const receipt = await communityRequest<CommunityReceipt>(
					"/commit",
					{ snapshot: value.snapshot },
					value.secret,
					signal,
				);
				await retain({ ...value, receipt }, signal);
				updatePhase(receipt.state);
				return describe(current.current, receipt.state);
			}
			updatePhase("review");
			return {
				...describe(value, "review"),
				authorizationUrl: await authorizationUrl(value),
				next: "Las imágenes están preparadas. Confirma la vista previa en la página de publicación.",
			};
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "No pudimos publicar.";
			updateError(message);
			updatePhase("error");
			throw reason;
		} finally {
			busy.current = false;
		}
	}

	async function advance() {
		void progress().catch(() => {});
		const value = current.current;
		return {
			...describe(),
			...(value?.consented && !value.receipt
				? {
						authorizationUrl: await authorizationUrl(value),
						next: "Abre la página de publicación en el navegador del usuario. La preparación continúa en segundo plano; consulta status para obtener el resultado.",
					}
				: {}),
		};
	}

	const advanceRef = useRef(advance);
	advanceRef.current = advance;
	useEffect(() => {
		if (
			!prepared?.consented ||
			prepared.receipt ||
			phase === "error" ||
			phase === "expired" ||
			phase === "cancelled"
		)
			return;
		const timer = setInterval(
			() => {
				void advanceRef.current().catch(() => {});
			},
			phase === "review" ? 4000 : 2000,
		);
		return () => clearInterval(timer);
	}, [prepared?.consented, prepared?.receipt, phase]);

	async function submit(snapshotHash: string, consent: boolean, inputSignal?: AbortSignal) {
		const signal = workSignal(inputSignal);
		const value = current.current;
		if (!value || value.intent.snapshotHash !== snapshotHash)
			throw new Error("STALE_SNAPSHOT: Prepara el badge antes de publicarlo.");
		if (!consent) throw new Error("CONSENT_REQUIRED: Pregunta si quiere publicar este badge.");
		if (busy.current) return advance();
		busy.current = true;
		try {
			await retain({ ...value, consented: true }, signal);
		} finally {
			busy.current = false;
		}
		return advance();
	}

	async function prepareWithdrawal(
		publicationId: string,
		expectedVersion: number,
		inputSignal?: AbortSignal,
	) {
		const signal = workSignal(inputSignal);
		if (busy.current || recovering.current) throw new Error("BUSY: Espera a la operación actual.");
		busy.current = true;
		try {
			const publication = await communityRequest<CommunityPublication>(
				`/${publicationId}`,
				undefined,
				undefined,
				signal,
			);
			if (publication.version !== expectedVersion)
				throw new Error("VERSION_CONFLICT: Consulta la versión actual.");
			const value: PreparedPublication = {
				intent: {
					action: "withdraw",
					operationId: crypto.randomUUID(),
					publicationId,
					expectedVersion,
					snapshotHash: await communityDigest(canonicalJson(publication.snapshot)),
					title: publication.snapshot.design.name,
					participantName: publication.snapshot.participant.name,
				},
				secret: createPublicationSecret(),
				files: {},
				createdAt: Date.now(),
			};
			signal.throwIfAborted();
			await cancelPending(signal);
			await retain(value, signal);
			updatePhase("prepared");
			return describe(value, "prepared");
		} finally {
			busy.current = false;
		}
	}

	async function remix(publicationId: string, inputSignal?: AbortSignal) {
		const signal = workSignal(inputSignal);
		if (busy.current) throw new Error("BUSY: Espera a la operación actual.");
		busy.current = true;
		const fingerprint = () =>
			JSON.stringify([latest.current.design, latest.current.locks, latest.current.participant]);
		const before = fingerprint();
		try {
			const publication = await communityRequest<CommunityPublication>(
				`/${publicationId}`,
				undefined,
				undefined,
				signal,
			);
			const design = structuredClone(publication.snapshot.design);
			if (publication.images.artwork) {
				const response = await fetch(publication.images.artwork, { signal });
				if (!response.ok) throw new Error("No pudimos copiar la ilustración.");
				const image = await response.blob();
				const form = new FormData();
				form.set("reference", image, "community.webp");
				const saved = await browserDesignRequest<{ id: string }>("/reference", {
					method: "POST",
					body: form,
					signal,
				});
				design.artwork = { assetId: saved.id };
			}
			signal.throwIfAborted();
			if (fingerprint() !== before)
				throw new Error(
					"STALE_REVISION: El badge cambió mientras se cargaba el diseño. Conservamos tus cambios.",
				);
			flushSync(() => {
				latest.current.select(design);
				latest.current.setParticipant((person) => ({
					...person,
					eventName: publication.snapshot.participant.eventName,
					publicUrl: publication.snapshot.participant.publicUrl,
					signature: publication.snapshot.participant.signature,
					metadata: {
						...publication.snapshot.participant.metadata,
						roleLabel: person.role,
					},
				}));
			});
			return {
				sourceId: publicationId,
				sourceVersion: publication.version,
				identityPreserved: true,
			};
		} finally {
			busy.current = false;
		}
	}

	const remixStarted = useRef(false);
	const remixRef = useRef(remix);
	remixRef.current = remix;
	useEffect(() => {
		if (!studio.profile.ready || !studio.library || remixStarted.current) return;
		const id = new URLSearchParams(window.location.search).get("remix");
		if (!id) return;
		remixStarted.current = true;
		void remixRef.current(id).catch((reason) => updateError((reason as Error).message));
	}, [studio.profile.ready, studio.library, updateError]);

	return {
		prepared,
		phase,
		error,
		url,
		prepare,
		submit,
		advance,
		inspect: describe,
		prepareWithdrawal,
		remix,
		clear: async (inputSignal?: AbortSignal) => {
			if (busy.current) throw new Error("La publicación sigue en curso.");
			const signal = workSignal(inputSignal);
			busy.current = true;
			try {
				requirePendingPublication(current.current);
				await cancelPending(signal);
				await publicationCheckpoint(null, indexedDB, signal);
				current.current = undefined;
				setPrepared(undefined);
				updatePhase("idle");
				updateError("");
				setUrl("");
				return { state: "cancelled" as const };
			} finally {
				busy.current = false;
			}
		},
	};
}
