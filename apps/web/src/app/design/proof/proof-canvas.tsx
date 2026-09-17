"use client";

import { designPresets } from "@/lib/design-presets";
import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import { designAppearance, drawBadgeFace } from "@crafter-station/badge-studio-renderer";
import { useEffect, useRef, useState } from "react";
import { designAssetUrl } from "../design-client";

const fonts = [
	'700 100px "Andes Brand"',
	'700 100px "Andes Display"',
	'400 24px "Andes Mono"',
	'400 60px "Next Craft Script"',
	'700 72px "Next Craft Mono"',
	'400 30px "Next Craft Pixel"',
];

function Faces({ design, second }: { design: BadgeDesign; second: boolean }) {
	const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
	const [ready, setReady] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		const abort = new AbortController();
		setReady(false);
		const data = {
			name: second ? "Alejandra Montenegro" : "Railly Hugo",
			role: second ? "speaker" : "attendee",
			organization: second ? "Estudio independiente" : "Vercel",
			number: second ? 257 : 1,
			eventName: design.event,
			portraitUrl: "/api/demo-portrait",
			publicUrl: `https://example.com/events/${design.source}`,
			signature: { version: 1 as const, seed: design.material.recipe?.seed ?? 42091 },
			metadata: {
				roleLabel: second ? "Speaker" : "Builder",
				eventName: design.event,
				eventDate: "Edición 2026",
				location: "Encuentro creativo",
				website: "",
				bio: "",
			},
			document: design,
			artworkUrl: design.artwork ? designAssetUrl(design.artwork.assetId) : undefined,
		};
		void Promise.all(fonts.map((font) => document.fonts.load(font)))
			.then(() =>
				Promise.all(
					(["front", "back"] as const).map((side, index) => {
						const canvas = canvases.current[index];
						if (!canvas) throw new Error("Falta el canvas");
						return drawBadgeFace(canvas, data, designAppearance(design), side, abort.signal);
					}),
				),
			)
			.then(() => {
				if (!abort.signal.aborted) setReady(true);
			})
			.catch((reason) => {
				if (!abort.signal.aborted) setError(String(reason));
			});
		return () => abort.abort();
	}, [design, second]);
	return (
		<article data-design={design.source} data-ready={ready} style={{ marginBottom: 48 }}>
			<h2>{design.name}</h2>
			<p>{design.description}</p>
			{error ? <p role="alert">{error}</p> : null}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 1000 }}>
				{["front", "back"].map((side, index) => (
					<canvas
						key={side}
						data-face={side}
						width={1024}
						height={1536}
						ref={(node) => {
							canvases.current[index] = node;
						}}
						style={{ width: "100%", height: "auto" }}
					/>
				))}
			</div>
			<a href={`/design?style=${design.source}`}>Abrir en el editor</a>
		</article>
	);
}

export function DesignProof() {
	const [source, setSource] = useState("");
	const [second, setSecond] = useState(false);
	useEffect(() => {
		setSource(new URLSearchParams(location.search).get("style") || "");
	}, []);
	const designs = source
		? designPresets.filter((design) => design.source === source)
		: designPresets;
	return (
		<main style={{ padding: 32, background: "#111", color: "#fff", minHeight: "100dvh" }}>
			<h1>Direcciones editables · impresión real</h1>
			<label>
				<input
					type="checkbox"
					checked={second}
					onChange={(event) => setSecond(event.target.checked)}
				/>{" "}
				Segundo participante
			</label>
			{designs.map((design) => (
				<Faces key={design.source} design={design} second={second} />
			))}
		</main>
	);
}
