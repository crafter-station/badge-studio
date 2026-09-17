"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { drawFallback, toPng } from "./print";
import type { StudioController, StudioOptions } from "./renderer";
import {
	type PrismAppearance,
	type PrismBadgeData,
	type PrismBadgeHandle,
	type PrismSide,
	type PrismStatus,
	normalizeAppearance,
} from "./types";

function options(appearance: PrismAppearance, side: PrismSide = "front"): StudioOptions {
	return {
		side,
		finish: ["crystal", "opal", "obsidian"].indexOf(appearance.finish),
		spectral: 0.66,
		motion: appearance.motion !== "paused",
		fluid: appearance.motion === "fluid",
	};
}

async function exportGpu(
	data: PrismBadgeData,
	appearance: PrismAppearance,
	assets: string,
	signal: AbortSignal,
	side: PrismSide,
) {
	const { startPrism } = await import("./renderer");
	if (signal.aborted) throw new DOMException("Aborted", "AbortError");
	const canvas = document.createElement("canvas");
	return new Promise<Blob>((resolve, reject) => {
		let completed = false;
		function finish(error?: unknown, blob?: Blob) {
			if (completed) return;
			completed = true;
			clearTimeout(timeout);
			signal.removeEventListener("abort", abort);
			controller?.dispose();
			if (error) reject(error);
			else if (blob) resolve(blob);
		}
		const abort = () => finish(new DOMException("Aborted", "AbortError"));
		const timeout = setTimeout(
			() => finish(new Error("La exportación tardó demasiado. Inténtalo otra vez.")),
			30_000,
		);
		signal.addEventListener("abort", abort, { once: true });
		const controller = startPrism(
			canvas,
			options(appearance, side),
			data,
			appearance,
			assets,
			true,
			() => {
				void controller
					?.exportImage()
					.then((blob) => finish(undefined, blob))
					.catch(finish);
			},
			(message) => finish(new Error(message)),
		);
	});
}

export const PrismBadge = forwardRef<
	PrismBadgeHandle,
	{
		data: PrismBadgeData;
		appearance: PrismAppearance;
		fallbackUrl?: string;
		assetsBaseUrl?: string;
		onStatus?: (status: PrismStatus) => void;
		side?: PrismSide;
		onSideChange?: (side: PrismSide) => void;
		reverseFallbackUrl?: string;
	}
>(
	(
		{
			data,
			appearance,
			fallbackUrl,
			assetsBaseUrl = "/prism",
			onStatus,
			side: controlledSide,
			onSideChange,
			reverseFallbackUrl,
		},
		ref,
	) => {
		const [localSide, setLocalSide] = useState<PrismSide>("front");
		const side = controlledSide ?? localSide;
		const selectedFallback = side === "back" ? reverseFallbackUrl : fallbackUrl;
		const flip = () => {
			const next = side === "front" ? "back" : "front";
			if (controlledSide === undefined) setLocalSide(next);
			onSideChange?.(next);
		};
		const suppressClick = useRef(false);
		const press = useRef<{ x: number; y: number; id: number } | null>(null);
		const gpuCanvas = useRef<HTMLCanvasElement>(null);
		const fallbackCanvas = useRef<HTMLCanvasElement>(null);
		const controller = useRef<StudioController | null>(null);
		const normalized = normalizeAppearance(appearance);
		const current = useRef({ data, appearance: normalized, onStatus, side });
		current.current = { data, appearance: normalized, onStatus, side };
		const contentKey = JSON.stringify({ data, appearance: normalized });
		const [status, setStatus] = useState<PrismStatus>("loading");
		const [error, setError] = useState("");
		const [labFallback, setLabFallback] = useState(false);
		const shaderKey = normalized.recipe?.shader?.code;
		const contentRevision = useRef(0);
		const exportAborts = useRef(new Set<AbortController>());
		const exporting = useRef(new Map<string, Promise<Blob>>());

		useEffect(() => {
			let active = true;
			let instance: StudioController | undefined;
			const element = gpuCanvas.current;
			if (!element) return;
			setStatus("loading");
			setLabFallback(false);
			current.current.onStatus?.("loading");
			void import("./renderer")
				.then(({ startPrism }) => {
					if (!active || current.current.appearance.recipe?.shader?.code !== shaderKey) return;
					const state = current.current;
					instance = startPrism(
						element,
						options(state.appearance, state.side),
						state.data,
						state.appearance,
						assetsBaseUrl,
						false,
						() => {
							if (active) {
								setStatus("ready");
								setLabFallback(element.dataset.labStatus === "fallback");
							}
						},
						() => {
							if (active) setStatus("fallback");
						},
					);
					controller.current = instance;
				})
				.catch(() => {
					if (active) setStatus("fallback");
				});
			return () => {
				active = false;
				instance?.dispose();
				controller.current = null;
				for (const abort of exportAborts.current) abort.abort();
			};
		}, [assetsBaseUrl, shaderKey]);

		useEffect(() => {
			const revision = ++contentRevision.current;
			const state = JSON.parse(contentKey) as { data: PrismBadgeData; appearance: PrismAppearance };
			const instance = controller.current;
			instance?.setOptions(options(state.appearance, current.current.side));
			if (status !== "ready" || !instance) return;
			current.current.onStatus?.("loading");
			void instance
				.setContent(state.data, state.appearance)
				.then(() => {
					if (revision === contentRevision.current) {
						setError("");
						current.current.onStatus?.("ready");
					}
				})
				.catch((reason) => {
					if (revision === contentRevision.current && (reason as Error).name !== "AbortError") {
						setError("No pudimos cargar este retrato. Prueba con otra foto.");
						setStatus("fallback");
					}
				});
			return () => {
				contentRevision.current++;
			};
		}, [contentKey, status]);

		useEffect(() => {
			controller.current?.setOptions(options(current.current.appearance, side));
		}, [side]);

		useEffect(() => {
			if (status !== "fallback") return;
			const element = fallbackCanvas.current;
			if (!element) return;
			const state = JSON.parse(contentKey) as { data: PrismBadgeData; appearance: PrismAppearance };
			const abort = new AbortController();
			current.current.onStatus?.("loading");
			void drawFallback(element, state.data, state.appearance, abort.signal, side)
				.then(() => {
					if (!abort.signal.aborted) {
						setError("");
						current.current.onStatus?.("fallback");
					}
				})
				.catch(() => {
					if (!abort.signal.aborted)
						setError("No pudimos cargar el retrato. Recarga la página o cambia la foto.");
				});
			return () => abort.abort();
		}, [status, contentKey, side]);

		useImperativeHandle(
			ref,
			() => ({
				exportPng(exportSide: PrismSide = "front") {
					const key = `${exportSide}:${contentKey}:${status}:${assetsBaseUrl}`;
					const pending = exporting.current.get(key);
					if (pending) return pending;
					const snapshot = current.current;
					const abort = new AbortController();
					exportAborts.current.add(abort);
					const operation = async () => {
						if (status === "ready")
							return exportGpu(
								snapshot.data,
								snapshot.appearance,
								assetsBaseUrl,
								abort.signal,
								exportSide,
							);
						const canvas = document.createElement("canvas");
						await drawFallback(
							canvas,
							snapshot.data,
							snapshot.appearance,
							abort.signal,
							exportSide,
						);
						return toPng(canvas, abort.signal);
					};
					const promise = operation().finally(() => {
						exporting.current.delete(key);
						exportAborts.current.delete(abort);
					});
					exporting.current.set(key, promise);
					return promise;
				},
			}),
			[status, assetsBaseUrl, contentKey],
		);

		return (
			<button
				type="button"
				data-prism-status={status}
				data-prism-side={side}
				tabIndex={0}
				aria-label={`${side === "back" ? "Reverso" : "Frente"} del badge de ${data.name}. ${data.metadata?.roleLabel || ""}. ${data.organization || ""}. ${side === "back" ? [data.metadata?.bio, data.metadata?.eventName, data.metadata?.eventDate, data.metadata?.location, ...(data.stamps ?? []).map((stamp) => `${stamp.label} ${stamp.date}`)].filter(Boolean).join(". ") : ""} Pulsa Enter para voltear. Flechas para explorar la luz.`}
				onClick={(event) => {
					if (event.detail === 0 || !suppressClick.current) flip();
					suppressClick.current = false;
				}}
				onKeyDown={(event) => {
					if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) {
						event.preventDefault();
						gpuCanvas.current?.dispatchEvent(new KeyboardEvent("keydown", { key: event.key }));
					}
				}}
				onPointerDown={(event) => {
					suppressClick.current = false;
					if (event.isPrimary && event.button === 0)
						press.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
				}}
				onPointerCancel={() => {
					press.current = null;
					suppressClick.current = true;
				}}
				onPointerUp={(event) => {
					const start = press.current;
					press.current = null;
					suppressClick.current =
						!start ||
						start.id !== event.pointerId ||
						Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 8;
				}}
				style={{
					position: "relative",
					width: "100%",
					height: "100%",
					minHeight: 0,
					border: 0,
					padding: 0,
					background: "transparent",
				}}
			>
				{selectedFallback && status !== "ready" ? (
					<img
						src={selectedFallback}
						alt={`Badge de ${data.name}`}
						width={1080}
						height={1440}
						style={{
							position: "absolute",
							inset: 0,
							width: "100%",
							height: "100%",
							objectFit: "contain",
						}}
					/>
				) : null}
				<canvas
					ref={gpuCanvas}
					aria-hidden={status !== "ready"}
					style={{
						width: "100%",
						height: "100%",
						display: "block",
						opacity: status === "ready" ? 1 : 0,
						touchAction: "pan-y",
					}}
				/>
				<canvas
					ref={fallbackCanvas}
					aria-hidden={status !== "fallback" || Boolean(selectedFallback)}
					role="img"
					aria-label={`${side === "back" ? "Reverso" : "Frente"} del badge de ${data.name}, versión estática`}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "contain",
						opacity: status === "fallback" && !selectedFallback ? 1 : 0,
						pointerEvents: "none",
					}}
				/>
				{status === "loading" && !selectedFallback ? (
					<output
						style={{
							position: "absolute",
							inset: 0,
							display: "grid",
							placeItems: "center",
							fontSize: 12,
							color: "#596769",
						}}
					>
						Preparando la luz
					</output>
				) : null}
				{labFallback || (normalized.recipe?.shader && status === "fallback") ? (
					<output style={{ position: "absolute", left: 20, right: 20, bottom: 0, fontSize: 12 }}>
						Este dispositivo muestra la textura de respaldo.
					</output>
				) : null}
				{error ? (
					<span
						role="alert"
						style={{
							position: "absolute",
							left: 20,
							right: 20,
							bottom: 0,
							fontSize: 12,
							color: "#93332c",
						}}
					>
						{error}
					</span>
				) : null}
			</button>
		);
	},
);

PrismBadge.displayName = "PrismBadge";
