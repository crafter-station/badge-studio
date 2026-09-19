"use client";

import { BadgeSnapshot } from "@/components/badge-snapshot";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { designPresets as badgeDesignExamples } from "@/lib/design-presets";
import { participantForDesign } from "@/lib/studio-participant";
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
	ArrowUpRight,
	Check,
	DownloadSimple,
	FloppyDisk,
	Image,
	MagicWand,
	Pause,
	Play,
	X,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { browserStorageEnabled } from "./browser-design-store";
import { CommunityPublishPanel } from "./community-publish-panel";
import { designAssetUrl, downloadFile } from "./design-client";
import { DesignInspector } from "./design-inspector";
import { DesignPreview } from "./design-preview";
import { DesignProfile } from "./design-profile";
import { useCommunityPublishing } from "./use-community-publishing";
import { useDesignStudio } from "./use-design-studio";
import { useStudioWebMcp } from "./use-studio-webmcp";

export function DesignStudio() {
	const studio = useDesignStudio();
	const publishing = useCommunityPublishing(studio);
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
	const agentConnection = useStudioWebMcp({
		studio,
		side,
		moving,
		status,
		mobilePanel,
		setSide,
		setMoving,
		setMobilePanel,
		badge,
		publishing,
	});
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
		"Editorial magenta and cyan, fluid ribbons, monochrome portrait and a numbered back.",
		"Rose petals, ivory paper, elegant typography and organic edges.",
		"Polar expedition credential: ink blue, topography and large numbers.",
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
			if (file.size > 2 * 1024 * 1024) throw new Error("The JSON must be smaller than 2 MB.");
			const parsed = badgeDesignSchema.safeParse(JSON.parse(await file.text()));
			if (!parsed.success) throw new Error(`Invalid design: ${parsed.error.issues[0]?.message}`);
			studio.select(parsed.data);
		} catch (error) {
			studio.setError((error as Error).message);
		}
	}

	if (!studio.profile.ready || !studio.profile.identity.started) {
		return (
			<main className="design-studio design-studio-welcome" data-webmcp={agentConnection}>
				{studio.profile.ready && studio.fontsReady ? (
					<DesignProfile welcome />
				) : (
					<output className="design-loading">
						<Spinner /> Setting up your space…
					</output>
				)}
			</main>
		);
	}

	return (
		<main className="design-studio" data-mobile-panel={mobilePanel} data-webmcp={agentConnection}>
			<DesignProfile />
			<CommunityPublishPanel publishing={publishing} />
			<div className="design-actions" aria-label="Design actions">
				<a className="design-workspace-label" href="/docs#agents">
					{agentConnection === "ready"
						? "Agent connected · How to use it ↗"
						: "Use my coding agent ↗"}
				</a>
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
						aria-label="Import JSON"
						disabled={pending}
						onClick={() => documentInput.current?.click()}
					>
						Import<span className="design-import-format"> JSON</span>
					</Button>
					<span className="design-save-state">
						{studio.saved && !studio.dirty ? (
							<>
								<Check aria-hidden="true" /> v{studio.saved.version} saved
							</>
						) : studio.saved ? (
							"Unsaved changes"
						) : (
							"New direction"
						)}
					</span>
					<Button
						size="sm"
						disabled={pending || !studio.library || (!studio.dirty && Boolean(studio.saved))}
						onClick={() => void studio.save()}
					>
						<FloppyDisk data-icon="inline-start" /> Save
					</Button>
				</div>
			</div>
			<div className="design-mobile-tabs">
				<ToggleGroup
					value={[mobilePanel]}
					onValueChange={(values) => {
						if (values[0]) setMobilePanel(values[0]);
					}}
					size="sm"
					variant="outline"
					spacing={0}
					aria-label="Studio view"
				>
					<ToggleGroupItem value="create">
						{browserStorageEnabled ? "Styles" : "Create"}
					</ToggleGroupItem>
					<ToggleGroupItem value="preview">Badge</ToggleGroupItem>
					<ToggleGroupItem value="edit">Edit</ToggleGroupItem>
				</ToggleGroup>
			</div>
			<div className="design-workspace">
				<aside className="design-director" aria-label="Create a direction">
					<div className="design-section-heading">
						<h2>{browserStorageEnabled ? "Make it yours." : "Your direction, in words."}</h2>
						<Badge variant="outline">Beta</Badge>
					</div>
					<p className="design-intro">
						{browserStorageEnabled
							? "Your photo is already across the whole collection. Pick a style and change every detail."
							: "A reference. An idea. A badge that feels like yours."}
					</p>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="design-event">Event</FieldLabel>
							<Input
								id="design-event"
								value={studio.participant.eventName}
								maxLength={80}
								disabled={pending}
								onChange={(event) => studio.setEvent(event.target.value)}
							/>
						</Field>
						{!browserStorageEnabled ? (
							<Field>
								<FieldLabel htmlFor="design-brief">How should it feel?</FieldLabel>
								<Textarea
									id="design-brief"
									rows={4}
									maxLength={1500}
									value={prompt}
									disabled={pending}
									placeholder="A paper credential with petals, editorial photography and a touch of metal…"
									onChange={(event) => setPrompt(event.target.value)}
								/>
							</Field>
						) : null}
						{!browserStorageEnabled ? (
							<Field>
								<FieldLabel htmlFor="design-reference">
									Visual reference <span className="design-help">optional</span>
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
											alt="Reference for the art direction"
											width={60}
											height={60}
										/>
										<span>{studio.reference.name}</span>
										<Button
											size="icon-xs"
											variant="ghost"
											aria-label="Remove reference"
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
										<Image data-icon="inline-start" /> Add a poster or image
									</Button>
								)}
							</Field>
						) : null}
					</FieldGroup>
					{!browserStorageEnabled ? (
						<>
							<label className="design-help design-lock-note" htmlFor="use-current-design">
								<Checkbox
									id="use-current-design"
									checked={studio.useBase}
									onCheckedChange={(value) => studio.setUseBase(Boolean(value))}
									disabled={pending}
								/>
								Start from {studio.design.name}
							</label>
							<label className="design-help design-lock-note" htmlFor="auto-artwork">
								<Checkbox
									id="auto-artwork"
									checked={studio.autoArtwork}
									onCheckedChange={(value) => studio.setAutoArtwork(Boolean(value))}
									disabled={pending}
								/>
								Generate artwork if the direction needs it
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
								Create 3 directions
							</Button>
							{pending ? (
								<Button size="sm" variant="ghost" onClick={studio.cancel}>
									Cancel
								</Button>
							) : null}
						</>
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
					{browserStorageEnabled ? (
						<p className="design-help">
							Your designs and artwork are stored only in this browser. Export a copy to keep them.
							Your coding agent can edit the design through WebMCP and bring in external images.
						</p>
					) : !studio.library?.generationAvailable && studio.library ? (
						<p className="design-help">
							Generation is not configured yet. You can explore and edit the base designs.
						</p>
					) : null}
					{!browserStorageEnabled ? (
						<>
							<details className="design-disclosure">
								<summary>Ideas to get started</summary>
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
							<section className="design-refinement" aria-label="Refine the direction">
								<div className="design-section-heading">
									<h2>Keep what works.</h2>
								</div>
								<p className="design-help">
									Ask for a change. The elements you locked will be kept.
								</p>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="design-refinement" className="sr-only">
											Change you want to make
										</FieldLabel>
										<Textarea
											id="design-refinement"
											rows={2}
											value={refinement}
											maxLength={1500}
											disabled={pending}
											placeholder="Softer background. Bigger name. Keep my portrait."
											onChange={(event) => setRefinement(event.target.value)}
										/>
									</Field>
								</FieldGroup>
								<Button
									variant="outline"
									disabled={pending || !refinement.trim() || !studio.library?.generationAvailable}
									onClick={() => void studio.generate(refinement, true)}
								>
									<MagicWand data-icon="inline-start" /> Create variant
								</Button>
								<Button
									variant="ghost"
									size="sm"
									disabled={pending || artworkLocked || !studio.library?.artworkAvailable}
									onClick={() => void studio.generateArtwork()}
								>
									<Image data-icon="inline-start" />{" "}
									{studio.design.artwork?.assetId ? "Regenerate artwork" : "Generate artwork"}
								</Button>
								<p className="design-help">
									Adds art to the selected direction. The photo and text stay separate.
								</p>
							</section>
						</>
					) : null}
					<details className="design-disclosure" open={!studio.proposals.length}>
						<summary>
							The collection · {badgeDesignExamples.length + studio.community.length} editable
							directions
						</summary>
						{studio.community.length ? (
							<>
								<p className="design-collection-label">Community · Made to share</p>
								<div className="design-seeds">
									{studio.community.map((publication) => {
										const selected =
											studio.selection?.kind === "remix" && studio.selection.id === publication.id;
										return (
											<Button
												key={publication.id}
												className="design-seed"
												variant={selected ? "secondary" : "ghost"}
												size="sm"
												disabled={pending}
												onClick={() => void studio.remix(publication.id).catch(() => {})}
												data-community-id={publication.id}
												aria-pressed={selected}
												aria-label={`${publication.snapshot.design.name} · Community`}
											>
												<span className="design-seed-art">
													<BadgeSnapshot
														data={{
															...participantForDesign(
																studio.participant,
																publication.snapshot.design,
															),
															document: publication.snapshot.design,
															artworkUrl: publication.images.artwork ?? undefined,
														}}
													/>
												</span>
												<span className="design-seed-name">{publication.snapshot.design.name}</span>
												<span className="design-seed-author">By {publication.authorName}</span>
											</Button>
										);
									})}
								</div>
							</>
						) : null}
						{studio.communityLoading ? (
							<output className="design-collection-status">
								<Spinner /> Loading Community…
							</output>
						) : null}
						{studio.communityError ? (
							<Alert variant="destructive" className="design-collection-status">
								<AlertDescription>
									{studio.communityError}
									<Button variant="outline" size="sm" onClick={studio.retryCommunity}>
										Try again
									</Button>
								</AlertDescription>
							</Alert>
						) : null}
						<p className="design-collection-label">Studio · The original collection</p>
						<div className="design-seeds">
							{badgeDesignExamples.map((design) => (
								<Button
									key={design.name}
									className="design-seed"
									variant={
										studio.selection?.kind === "style" && studio.selection.id === design.source
											? "secondary"
											: "ghost"
									}
									size="sm"
									disabled={pending}
									onClick={() => studio.select(design)}
									data-design-source={design.source}
									aria-pressed={
										studio.selection?.kind === "style" && studio.selection.id === design.source
									}
									aria-label={design.name}
								>
									<span className="design-seed-art">
										<BadgeSnapshot
											data={{
												...participantForDesign(studio.participant, design),
												document: design,
												artworkUrl: design.artwork?.assetId
													? designAssetUrl(design.artwork.assetId)
													: undefined,
											}}
										/>
									</span>
									<span className="design-seed-name">{design.name}</span>
								</Button>
							))}
						</div>
					</details>
					{studio.library?.designs.length ? (
						<details className="design-disclosure">
							<summary>
								Saved directions <span>{studio.library.designs.length}</span>
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
				<section className="design-viewer" aria-label="Badge preview">
					<div className="design-viewer-title">
						<div>
							<span className="design-overline">
								{studio.proposals.length ? "Your exploration" : "Layered design"}
							</span>
							<h1>{studio.design.name}</h1>
						</div>
						<Badge variant="outline">
							{studio.design.front.layers.length + studio.design.back.layers.length} layers
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
							<span className="design-loading">Preparing the canvas…</span>
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
							aria-label="Badge side"
						>
							<ToggleGroupItem value="front">Front</ToggleGroupItem>
							<ToggleGroupItem value="back">Back</ToggleGroupItem>
						</ToggleGroup>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Flip badge"
							onClick={() => setSide(side === "front" ? "back" : "front")}
						>
							<ArrowClockwise />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={moving ? "Pause motion" : "Enable motion"}
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
							aria-label="Generated directions"
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
									? "Static view on this device."
									: "Move the light. Tap the badge to flip it."}
							</p>
						)}
					</div>
				</section>
				<DesignInspector studio={studio} side={side} />
			</div>
		</main>
	);
}
