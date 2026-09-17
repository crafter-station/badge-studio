"use client";

import { badgeEditions } from "@/app/collection/editions";
import { designPresets } from "@/lib/design-presets";
import {
	PrismBadge,
	type PrismBadgeData,
	type PrismSide,
	designAppearance,
	drawBadgeFace,
} from "@crafter-station/badge-studio-renderer";
import { useEffect, useRef, useState } from "react";

const fontRequests = [
	'700 100px "Andes Brand"',
	'700 100px "Andes Display"',
	'400 24px "Andes Mono"',
	'400 60px "Next Craft Script"',
	'700 72px "Next Craft Mono"',
	'400 30px "Next Craft Pixel"',
];

function present<T>(value: T | null | undefined): T {
	if (value == null) throw new Error("Missing comparison input");
	return value;
}

function Pair({ id, second }: { id: string; second: boolean }) {
	const edition = present(badgeEditions.find((item) => item.id === id));
	const design = present(designPresets.find((item) => item.source === id));
	const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
	const [ready, setReady] = useState(false);
	const [failure, setFailure] = useState("");
	const data: PrismBadgeData = second
		? {
				...edition.data,
				name: "Alejandra Montenegro",
				number: 257,
				role: "speaker",
				organization: "Independent",
				publicUrl: "https://example.com/participant/257",
				metadata: {
					...(edition.data.metadata ?? {
						roleLabel: "",
						eventName: edition.name,
						eventDate: "",
						location: "",
						website: "",
						bio: "",
					}),
					roleLabel: "Speaker",
				},
			}
		: edition.data;
	const identity = JSON.stringify([data, design]);
	useEffect(() => {
		const abort = new AbortController();
		setReady(false);
		setFailure("");
		const [person, document] = JSON.parse(identity);
		void Promise.all(fontRequests.map((font) => window.document.fonts.load(font)))
			.then(() =>
				Promise.all(
					(["front", "back"] as const).flatMap((side, i) => [
						drawBadgeFace(
							present(canvases.current[i * 2]),
							person,
							edition.appearance,
							side,
							abort.signal,
						),
						drawBadgeFace(
							present(canvases.current[i * 2 + 1]),
							{ ...person, edition: undefined, design: undefined, document },
							designAppearance(document),
							side,
							abort.signal,
						),
					]),
				),
			)
			.then(() => {
				if (!abort.signal.aborted) setReady(true);
			})
			.catch((error) => {
				if (!abort.signal.aborted) setFailure(String(error));
			});
		return () => abort.abort();
	}, [identity, edition]);
	return (
		<article data-comparison={id} data-ready={ready} style={{ marginBottom: 48 }}>
			<h2>{edition.name}</h2>
			{failure ? <p role="alert">{failure}</p> : null}
			{(["front", "back"] as const).map((side, i) => (
				<section
					key={side}
					data-face={side}
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
						gap: 16,
						maxWidth: 720,
						padding: 16,
						background: "#18181b",
						marginBottom: 24,
					}}
				>
					{["Referencia", "Documento editable"].map((label, j) => (
						<figure key={label} style={{ margin: 0 }}>
							<figcaption style={{ paddingBottom: 12 }}>
								{label} · {side}
							</figcaption>
							<canvas
								ref={(element) => {
									canvases.current[i * 2 + j] = element;
								}}
								data-render={j ? "document" : "reference"}
								width={1024}
								height={1536}
								style={{ display: "block", width: "100%", height: "auto" }}
							/>
						</figure>
					))}
				</section>
			))}
		</article>
	);
}

export function ReferenceComparison() {
	const [style, setStyle] = useState("all");
	const [second, setSecond] = useState(false);
	const [gpu, setGpu] = useState(false);
	const [side, setSide] = useState<PrismSide>("front");
	const [moving, setMoving] = useState(false);
	const [fonts, setFonts] = useState(false);
	useEffect(() => {
		const query = new URLSearchParams(location.search);
		setStyle(query.get("style") || "all");
		setGpu(query.get("gpu") === "1");
		void Promise.all(fontRequests.map((font) => document.fonts.load(font))).then(() =>
			setFonts(true),
		);
	}, []);
	const edition = badgeEditions.find((item) => item.id === style) ?? badgeEditions[0];
	const design = present(designPresets.find((item) => item.source === edition.id));
	return (
		<main
			style={{
				background: "#09090b",
				color: "#f4f4f5",
				minHeight: "100dvh",
				padding: 32,
				fontFamily: "Arial, sans-serif",
			}}
		>
			<h1>Colección ↔ documento editable</h1>
			<p>
				Mismo retrato, datos, dimensiones y fuentes. Comparación de impresión; activa GPU para
				comparar la óptica.
			</p>
			<nav style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
				<a href={`/design?style=${edition.id}`}>Abrir editor</a>
				<select aria-label="Dirección" value={style} onChange={(e) => setStyle(e.target.value)}>
					<option value="all">Todas</option>
					{badgeEditions.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
				<label>
					<input type="checkbox" checked={second} onChange={(e) => setSecond(e.target.checked)} />{" "}
					Segundo participante
				</label>
				<label>
					<input type="checkbox" checked={gpu} onChange={(e) => setGpu(e.target.checked)} /> GPU
				</label>
				<button type="button" onClick={() => setSide(side === "front" ? "back" : "front")}>
					Girar
				</button>
				<button type="button" onClick={() => setMoving(!moving)}>
					{moving ? "Pausar" : "Animar"}
				</button>
			</nav>
			{gpu && fonts ? (
				<section style={{ display: "flex", height: 660, gap: 32 }} key={edition.id}>
					{[false, true].map((editable) => (
						<div
							key={String(editable)}
							data-gpu={editable ? "document" : "reference"}
							style={{ width: 470 }}
						>
							<p>{editable ? "Documento editable" : "Referencia"}</p>
							<PrismBadge
								data={
									editable
										? { ...edition.data, edition: undefined, design: undefined, document: design }
										: edition.data
								}
								appearance={{
									...(editable ? designAppearance(design) : edition.appearance),
									motion: moving ? "living" : "paused",
								}}
								side={side}
								onSideChange={setSide}
								onStatus={(status) => {
									const node = window.document.querySelector(
										`[data-gpu="${editable ? "document" : "reference"}"]`,
									);
									if (node) node.setAttribute("data-status", status);
								}}
							/>
						</div>
					))}
				</section>
			) : (
				(style === "all" ? badgeEditions : [edition]).map((item) => (
					<Pair key={item.id} id={item.id} second={second} />
				))
			)}
		</main>
	);
}
