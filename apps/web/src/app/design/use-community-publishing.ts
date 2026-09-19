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
			throw new Error("CANCELLED: The editor is no longer active.");
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
					"ALREADY_COMPLETED: The operation already finished. Its receipt was kept; you can withdraw the publication if you wish.",
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
				if (!controller.signal.aborted) updateError("Could not recover a prepared publication.");
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
			throw new Error("BUSY: The publication is still being prepared.");
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
				"The photo, name, details, both faces and the editable layers will be published. Anyone will be able to see them and reuse the design.",
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
					next: "Open this link in the user's browser to sign in and confirm the preview. The editor stays open.",
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
				next: "The images are prepared. Confirm the preview on the publication page.",
			};
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Could not publish.";
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
						next: "Open the publication page in the user's browser. Preparation continues in the background; call status to get the result.",
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
			throw new Error("STALE_SNAPSHOT: Prepare the badge before publishing it.");
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
		if (busy.current || recovering.current)
			throw new Error("BUSY: Wait for the current operation.");
		busy.current = true;
		try {
			const publication = await communityRequest<CommunityPublication>(
				`/${publicationId}`,
				undefined,
				undefined,
				signal,
			);
			if (publication.version !== expectedVersion)
				throw new Error("VERSION_CONFLICT: Check the current version.");
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
		remix: studio.remix,
		clear: async (inputSignal?: AbortSignal) => {
			if (busy.current) throw new Error("The publication is still in progress.");
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
