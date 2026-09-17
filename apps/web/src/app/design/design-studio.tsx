"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { designPresets as badgeDesignExamples } from "@/lib/design-presets";
import { badgeDesignSchema } from "@crafter-station/badge-studio-design/badge-design";
import {
	PrismBadge,
	type PrismBadgeHandle,
	type PrismSide,
	type PrismStatus,
	designAppearance,
} from "@crafter-station/badge-studio-renderer";
import {
	ArrowClockwise,
	ArrowLeft,
	ArrowUpRight,
	Check,
	DownloadSimple,
	FloppyDisk,
	Image,
	MagicWand,
	Pause,
	Play,
	Stack,
	X,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { designAssetUrl, downloadFile } from "./design-client";
import { DesignInspector } from "./design-inspector";
import { DesignPreview } from "./design-preview";
import { useDesignStudio } from "./use-design-studio";

export function DesignStudio() {
	const studio = useDesignStudio();
	const [prompt, setPrompt] = useState("");
	const [refinement, setRefinement] = useState("");
	const [side, setSide] = useState<PrismSide>("front");
	const [moving, setMoving] = useState(true);
	const [status, setStatus] = useState<PrismStatus>("loading");
	const [mobilePanel, setMobilePanel] = useState("preview");
	const [exporting, setExporting] = useState(false);
	const badge = useRef<PrismBadgeHandle>(null);
	const referenceInput = useRef<HTMLInputElement>(null);
	const documentInput = useRef<HTMLInputElement>(null);
	const pending = Boolean(studio.phase);
	const appearance = {
		...designAppearance(studio.design),
		motion: moving ? ("living" as const) : ("paused" as const),
	};
	const data = {
		...studio.participant,
		document: studio.design,
		artworkUrl: studio.design.artwork?.assetId
			? designAssetUrl(studio.design.artwork.assetId)
			: undefined,
	};
	const artworkLocked = (["front", "back"] as const).some((face) =>
		studio.design[face].layers.some(
			(layer) => layer.kind === "image" && studio.locks[face].includes(layer.id),
		),
	);
	const examples = [
		"Editorial magenta y cyan, cintas fluidas, retrato monocromo y reverso numerado.",
		"Pétalos de rosa, papel marfil, tipografía elegante y bordes orgánicos.",
		"Credencial de exploración polar: azul tinta, topografía y números grandes.",
	];

	async function exportPng() {
		if (!badge.current || exporting || status === "loading") return;
		setExporting(true);
		studio.setError("");
		try {
			const blob = await badge.current.exportPng(side);
			downloadFile(blob, `${studio.design.name}-${studio.participant.number}-${side}.png`);
		} catch (error) {
			studio.setError((error as Error).message);
		} finally {
			setExporting(false);
		}
	}

	async function importDesign(file: File) {
		studio.setError("");
		try {
			if (file.size > 2 * 1024 * 1024) throw new Error("El JSON debe pesar menos de 2 MB.");
			const parsed = badgeDesignSchema.safeParse(JSON.parse(await file.text()));
			if (!parsed.success) throw new Error(`Diseño inválido: ${parsed.error.issues[0]?.message}`);
			studio.select(parsed.data);
		} catch (error) {
			studio.setError((error as Error).message);
		}
	}

	return (
		<main className="design-studio" lang="es" data-mobile-panel={mobilePanel}>
			<header className="design-header">
				<a href="/" className="design-brand">
					<Stack weight="duotone" aria-hidden="true" /> Badge <span>/ studio</span>
				</a>
				<nav aria-label="Navegación del estudio" className="design-top-nav">
					<a href="/design/showcase" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						Exploraciones
					</a>
					<a href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						<ArrowLeft data-icon="inline-start" /> Colección
					</a>
					<a href="/docs" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						Toolkit
					</a>
				</nav>
				<div className="design-header-actions">
					<input
						ref={documentInput}
						type="file"
						accept=".json,application/json"
						hidden
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file) void importDesign(file);
						}}
					/>
					<Button
						size="sm"
						variant="ghost"
						disabled={pending}
						onClick={() => documentInput.current?.click()}
					>
						Importar JSON
					</Button>
					<span className="design-save-state">
						{studio.saved && !studio.dirty ? (
							<>
								<Check aria-hidden="true" /> v{studio.saved.version} guardada
							</>
						) : studio.saved ? (
							"Cambios sin guardar"
						) : (
							"Nueva dirección"
						)}
					</span>
					<Button
						size="sm"
						disabled={pending || !studio.library || (!studio.dirty && Boolean(studio.saved))}
						onClick={() => void studio.save()}
					>
						<FloppyDisk data-icon="inline-start" /> Guardar
					</Button>
				</div>
			</header>
			<div className="design-mobile-tabs">
				<ToggleGroup
					value={[mobilePanel]}
					onValueChange={(values) => {
						if (values[0]) setMobilePanel(values[0]);
					}}
					size="sm"
					variant="outline"
					spacing={0}
					aria-label="Vista del estudio"
				>
					<ToggleGroupItem value="create">Crear</ToggleGroupItem>
					<ToggleGroupItem value="preview">Badge</ToggleGroupItem>
					<ToggleGroupItem value="edit">Editar</ToggleGroupItem>
				</ToggleGroup>
			</div>
			<div className="design-workspace">
				<aside className="design-director" aria-label="Crear una dirección">
					<div className="design-section-heading">
						<h2>Tu dirección, en palabras.</h2>
						<Badge variant="outline">Beta</Badge>
					</div>
					<p className="design-intro">Una referencia. Una idea. Un badge que se sienta tuyo.</p>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="design-event">Evento</FieldLabel>
							<Input
								id="design-event"
								value={studio.participant.eventName}
								maxLength={80}
								disabled={pending}
								onChange={(event) => studio.setEvent(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="design-brief">¿Cómo debería sentirse?</FieldLabel>
							<Textarea
								id="design-brief"
								rows={4}
								maxLength={1500}
								value={prompt}
								disabled={pending}
								placeholder="Una credencial de papel con pétalos, fotografía editorial y un toque de metal…"
								onChange={(event) => setPrompt(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="design-reference">
								Referencia visual <span className="design-help">opcional</span>
							</FieldLabel>
							<Input
								ref={referenceInput}
								id="design-reference"
								type="file"
								className="sr-only"
								accept="image/png,image/jpeg,image/webp"
								disabled={pending}
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) void studio.uploadReference(file);
									event.target.value = "";
								}}
							/>
							{studio.reference ? (
								<div className="design-reference">
									<img
										src={studio.reference.url}
										alt="Referencia para la dirección de arte"
										width={60}
										height={60}
									/>
									<span>{studio.reference.name}</span>
									<Button
										size="icon-xs"
										variant="ghost"
										aria-label="Quitar referencia"
										disabled={pending}
										onClick={studio.clearReference}
									>
										<X />
									</Button>
								</div>
							) : (
								<Button
									variant="outline"
									disabled={pending || !studio.library}
									onClick={() => referenceInput.current?.click()}
								>
									<Image data-icon="inline-start" /> Añadir póster o imagen
								</Button>
							)}
						</Field>
					</FieldGroup>
					<label className="design-help design-lock-note" htmlFor="use-current-design">
						<Checkbox
							id="use-current-design"
							checked={studio.useBase}
							onCheckedChange={(value) => studio.setUseBase(Boolean(value))}
							disabled={pending}
						/>
						Partir de {studio.design.name}
					</label>
					<label className="design-help design-lock-note" htmlFor="auto-artwork">
						<Checkbox
							id="auto-artwork"
							checked={studio.autoArtwork}
							onCheckedChange={(value) => studio.setAutoArtwork(Boolean(value))}
							disabled={pending}
						/>
						Generar ilustración si la dirección la necesita
					</label>
					<Button
						disabled={pending || !prompt.trim() || !studio.library?.generationAvailable}
						onClick={() => void studio.generate(prompt, false)}
						aria-busy={pending}
					>
						{pending ? (
							<Spinner data-icon="inline-start" />
						) : (
							<MagicWand data-icon="inline-start" />
						)}
						Crear 3 direcciones
					</Button>
					{pending ? (
						<Button size="sm" variant="ghost" onClick={studio.cancel}>
							Cancelar
						</Button>
					) : null}
					<div className="design-director-feedback" aria-live="polite">
						{studio.error ? (
							<Alert variant="destructive">
								<AlertDescription>{studio.error}</AlertDescription>
							</Alert>
						) : (
							<p className="design-help">{studio.phase || studio.notice}</p>
						)}
					</div>
					{!studio.library?.generationAvailable && studio.library ? (
						<p className="design-help">
							La generación todavía no está configurada. Puedes explorar y editar los diseños base.
						</p>
					) : null}
					<details className="design-disclosure">
						<summary>Ideas para empezar</summary>
						<div className="design-prompt-examples">
							{examples.map((example) => (
								<button
									type="button"
									key={example}
									disabled={pending}
									onClick={() => setPrompt(example)}
								>
									{example}
									<ArrowUpRight aria-hidden="true" />
								</button>
							))}
						</div>
					</details>
					<section className="design-refinement" aria-label="Refinar la dirección">
						<div className="design-section-heading">
							<h2>Quédate con lo bueno.</h2>
						</div>
						<p className="design-help">
							Pide un cambio. Conservaremos los elementos que bloqueaste.
						</p>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="design-refinement" className="sr-only">
									Cambio que quieres hacer
								</FieldLabel>
								<Textarea
									id="design-refinement"
									rows={2}
									value={refinement}
									maxLength={1500}
									disabled={pending}
									placeholder="El fondo más suave. Nombre más grande. Conserva mi retrato."
									onChange={(event) => setRefinement(event.target.value)}
								/>
							</Field>
						</FieldGroup>
						<Button
							variant="outline"
							disabled={pending || !refinement.trim() || !studio.library?.generationAvailable}
							onClick={() => void studio.generate(refinement, true)}
						>
							<MagicWand data-icon="inline-start" /> Crear variante
						</Button>
						<Button
							variant="ghost"
							size="sm"
							disabled={pending || artworkLocked || !studio.library?.artworkAvailable}
							onClick={() => void studio.generateArtwork()}
						>
							<Image data-icon="inline-start" />{" "}
							{studio.design.artwork?.assetId ? "Regenerar ilustración" : "Generar ilustración"}
						</Button>
						<p className="design-help">
							Añade arte a la dirección seleccionada. La foto y los textos siguen separados.
						</p>
					</section>
					<details className="design-disclosure" open={!studio.proposals.length}>
						<summary>La colección · {badgeDesignExamples.length} direcciones editables</summary>
						<div className="design-seeds">
							{badgeDesignExamples.map((design) => (
								<Button
									key={design.name}
									variant={design.name === studio.design.name ? "secondary" : "ghost"}
									size="sm"
									disabled={pending}
									onClick={() => studio.select(design)}
									data-design-source={design.source}
								>
									{design.name}
								</Button>
							))}
						</div>
					</details>
					{studio.library?.designs.length ? (
						<details className="design-disclosure">
							<summary>
								Direcciones guardadas <span>{studio.library.designs.length}</span>
							</summary>
							<div className="design-saved-list">
								{studio.library.designs.map((entry) => (
									<Button
										key={entry.id}
										variant="ghost"
										size="sm"
										disabled={pending}
										onClick={() => void studio.load(entry.id)}
									>
										{entry.design.name}
										<span>v{entry.version}</span>
									</Button>
								))}
							</div>
						</details>
					) : null}
				</aside>
				<section className="design-viewer" aria-label="Vista previa del badge">
					<div className="design-viewer-title">
						<div>
							<span className="design-overline">
								{studio.proposals.length ? "Tu exploración" : "Diseño por capas"}
							</span>
							<h1>{studio.design.name}</h1>
						</div>
						<Badge variant="outline">
							{studio.design.front.layers.length + studio.design.back.layers.length} capas
						</Badge>
					</div>
					<div className="design-stage" data-status={status} data-design-id={studio.design.name}>
						{studio.fontsReady ? (
							<PrismBadge
								ref={badge}
								data={data}
								appearance={appearance}
								side={side}
								onSideChange={setSide}
								onStatus={setStatus}
							/>
						) : (
							<span className="design-loading">Preparando el lienzo…</span>
						)}
					</div>
					<p className="design-caption">{studio.design.description}</p>
					<div className="design-toolbar">
						<ToggleGroup
							value={[side]}
							onValueChange={(values) => {
								const value = values[0];
								if (value === "front" || value === "back") setSide(value);
							}}
							size="sm"
							variant="outline"
							spacing={0}
							aria-label="Cara del badge"
						>
							<ToggleGroupItem value="front">Frente</ToggleGroupItem>
							<ToggleGroupItem value="back">Reverso</ToggleGroupItem>
						</ToggleGroup>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Girar badge"
							onClick={() => setSide(side === "front" ? "back" : "front")}
						>
							<ArrowClockwise />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={moving ? "Pausar movimiento" : "Activar movimiento"}
							aria-pressed={!moving}
							onClick={() => setMoving(!moving)}
						>
							{moving ? <Pause /> : <Play />}
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={exporting || status === "loading"}
							onClick={() => void exportPng()}
						>
							<DownloadSimple data-icon="inline-start" /> PNG
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								downloadFile(
									new Blob([JSON.stringify(studio.design, null, 2)], { type: "application/json" }),
									`${studio.design.name}.json`,
								)
							}
						>
							JSON
						</Button>
					</div>
					{studio.proposals.length ? (
						<ToggleGroup
							className="design-proposals"
							value={[
								String(
									studio.proposals.findIndex(
										(item) => JSON.stringify(item) === JSON.stringify(studio.design),
									),
								),
							]}
							aria-label="Direcciones generadas"
							disabled={pending}
							onValueChange={(values) => {
								const proposal = studio.proposals[Number(values[0])];
								if (proposal) studio.select(proposal);
							}}
						>
							{studio.proposals.map((design, index) => (
								<ToggleGroupItem key={`${index}:${design.name}`} value={String(index)}>
									<DesignPreview design={design} data={studio.participant} />
									<span className="design-proposal-caption">
										<span>0{index + 1}</span>
										{design.name}
									</span>
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					) : null}
					<div className="design-feedback" aria-live="polite">
						{studio.error ? (
							<Alert variant="destructive">
								<AlertDescription>{studio.error}</AlertDescription>
							</Alert>
						) : studio.phase ? (
							<p>
								<Spinner /> {studio.phase}
							</p>
						) : studio.notice ? (
							<p>
								<Check aria-hidden="true" /> {studio.notice}
							</p>
						) : (
							<p>
								{status === "fallback"
									? "Vista estática en este dispositivo."
									: "Mueve la luz. Toca el badge para girarlo."}
							</p>
						)}
					</div>
				</section>
				<DesignInspector studio={studio} side={side} />
			</div>
		</main>
	);
}
