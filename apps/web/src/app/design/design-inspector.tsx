"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BadgeLayer } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismSide } from "@crafter-station/badge-studio-renderer";
import { ArrowCounterClockwise, LockSimple, Stack } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { DesignLayerActions } from "./design-layer-actions";
import { DesignSelectedLayer } from "./design-selected-layer";
import type { useDesignStudio } from "./use-design-studio";

export function layerLabel(layer: BadgeLayer) {
	const kinds = {
		text: "Text",
		portrait: "Portrait",
		shape: "Shape",
		qr: "QR code",
		image: "Artwork",
		effect: "Effect",
		graphic: "Graphic",
		gradient: "Gradient",
	};
	if (layer.kind === "text" && "binding" in layer && layer.binding) {
		const labels: Record<string, string> = {
			name: "Name",
			role: "Role",
			organization: "Organization",
			number: "Number",
			event: "Event",
			roleOrganization: "Role and organization",
			admissionRole: "Access",
			location: "Location",
			date: "Date",
			website: "Website",
			bio: "Bio",
			signature: "Signature",
			roleCode: "Role code",
		};
		return labels[String(layer.binding)] || layer.text?.slice(0, 26) || kinds.text;
	}
	if (layer.kind === "graphic") {
		const labels: Record<string, string> = {
			sky: "Sky and meadow",
			window: "Window",
			grain: "Grain",
			path: "Path",
			paper: "Paper",
			"chromatic-paper": "Chromatic ribbons",
			checkerboard: "Checkerboard",
			terrain: "Topography",
			seal: "Seal",
			stamp: "Stamp",
			grid: "Grid",
			scanlines: "Scanlines",
		};
		return labels[layer.pattern] || kinds.graphic;
	}
	return kinds[layer.kind];
}

export function DesignInspector({
	studio,
	side,
}: { studio: ReturnType<typeof useDesignStudio>; side: PrismSide }) {
	const [tab, setTab] = useState("layers");
	const inspector = useRef<HTMLElement>(null);
	const [selection, setSelection] = useState<{ scope: string; id: string }>();
	const scope = `${studio.design.source ?? studio.design.name}:${side}`;
	const [urlDraft, setUrlDraft] = useState(studio.participant.publicUrl ?? "");
	const [urlError, setUrlError] = useState("");
	const layers = studio.design[side].layers;
	const selected =
		selection?.scope === scope ? layers.find((layer) => layer.id === selection.id) : undefined;
	function openLayer(id?: string) {
		setSelection(id ? { scope, id } : undefined);
		inspector.current?.scrollTo({ top: 0 });
	}
	const pending = Boolean(studio.phase);
	return (
		<aside ref={inspector} className="design-inspector" aria-label="Elements and participant">
			{studio.error ? (
				<p className="design-inspector-error" role="alert">
					{studio.error}
				</p>
			) : null}
			<ToggleGroup
				value={[tab]}
				onValueChange={(values) => {
					if (values[0]) setTab(values[0]);
				}}
				size="sm"
				variant="outline"
				spacing={0}
				aria-label="Editing panel"
			>
				<ToggleGroupItem value="layers">Elements</ToggleGroupItem>
				<ToggleGroupItem value="person">Participant</ToggleGroupItem>
			</ToggleGroup>
			{tab === "layers" && selected ? (
				<DesignSelectedLayer
					studio={studio}
					layer={selected}
					label={layerLabel(selected)}
					side={side}
					onBack={() => openLayer()}
					onParticipant={() => {
						setTab("person");
						inspector.current?.scrollTo({ top: 0 });
					}}
				/>
			) : tab === "layers" ? (
				<>
					<div className="design-section-heading">
						<h2>{side === "front" ? "Front" : "Back"}</h2>
						<span>{layers.length} layers</span>
					</div>
					<p className="design-help">
						Select a layer to edit it. The eye shows or hides; the lock protects.
					</p>
					<select
						className="design-select"
						aria-label="Add element"
						value=""
						disabled={pending}
						onChange={(event) => studio.changeLayers(side, "add", event.target.value)}
					>
						<option value="" disabled>
							Add element…
						</option>
						<option value="text">Text</option>
						<option value="shape">Shape</option>
						<option value="portrait">Photo detail</option>
						<option value="graphic">Graphic</option>
						<option value="effect">Live effect</option>
						<option value="gradient">Gradient</option>
						<option value="image">Artwork</option>
					</select>
					<details className="design-disclosure">
						<summary>Background and material</summary>
						<FieldGroup className="design-layer-details">
							<Field>
								<FieldLabel htmlFor="design-background">
									{side === "front" ? "Front" : "Back"} background
								</FieldLabel>
								<Input
									id="design-background"
									type="color"
									value={studio.design[side].background}
									disabled={pending}
									onChange={(event) => studio.setBackground(side, event.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="design-material">Material</FieldLabel>
								<select
									id="design-material"
									className="design-select"
									value={studio.design.material.surface}
									disabled={pending || studio.locks.material}
									onChange={(event) =>
										studio.setMaterial(event.target.value as "satin" | "prism" | "chrome")
									}
								>
									<option value="satin">Satin paper</option>
									<option value="prism">Prism</option>
									<option value="chrome">Chrome</option>
								</select>
							</Field>
							{(
								[
									["roughness", "Roughness", 1],
									["iridescence", "Iridescence", 0.65],
									["speed", "Speed", 1],
								] as const
							).map(([key, label, max]) => (
								<Field key={key}>
									<FieldLabel htmlFor={`material-${key}`}>{label}</FieldLabel>
									<Input
										id={`material-${key}`}
										type="range"
										min={0}
										max={max}
										step={0.01}
										value={studio.design.material[key]}
										disabled={pending || studio.locks.material}
										onChange={(event) =>
											studio.updateMaterial({ [key]: event.target.valueAsNumber })
										}
									/>
								</Field>
							))}
							<label className="design-help design-lock-note" htmlFor="material-lock">
								<Checkbox
									id="material-lock"
									checked={studio.locks.material}
									disabled={pending}
									onCheckedChange={studio.toggleMaterialLock}
								/>{" "}
								Keep material
							</label>
						</FieldGroup>
					</details>
					<div className="design-layer-list">
						{layers.map((layer) => (
							<div
								className="design-layer-row"
								data-layer-id={layer.id}
								data-hidden={layer.visible === false || undefined}
								key={layer.id}
							>
								<Button
									variant="ghost"
									size="sm"
									className="design-layer-select"
									disabled={pending}
									aria-label={`Edit ${layerLabel(layer)} (${layer.id})`}
									onClick={() => openLayer(layer.id)}
								>
									<Stack data-icon="inline-start" />
									<span>{layerLabel(layer)}</span>
								</Button>
								<DesignLayerActions
									label={`${layerLabel(layer)} (${layer.id})`}
									visible={layer.visible !== false}
									locked={studio.locks[side].includes(layer.id)}
									disabled={pending}
									onVisibility={() => studio.toggleVisibility(side, layer.id)}
									onLock={() => studio.toggleLock(side, layer.id)}
								/>
							</div>
						))}
					</div>
					{studio.locks.front.length + studio.locks.back.length ? (
						<p className="design-help design-lock-note">
							<LockSimple aria-hidden="true" />{" "}
							{studio.locks.front.length + studio.locks.back.length} protected elements
						</p>
					) : null}

					<Button
						variant="ghost"
						size="sm"
						disabled={pending || !studio.past.length}
						onClick={studio.undo}
					>
						<ArrowCounterClockwise data-icon="inline-start" /> Undo
					</Button>
				</>
			) : (
				<>
					<div className="design-section-heading">
						<h2>Your details, in every style</h2>
					</div>
					<p className="design-help">
						Photo and name are changed above. Your details are kept while you explore the
						collection.
					</p>
					<FieldGroup>
						{(
							[
								["role", "Role"],
								["organization", "Organization"],
							] as const
						).map(([key, label]) => (
							<Field key={key}>
								<FieldLabel htmlFor={`participant-${key}`}>{label}</FieldLabel>
								<Input
									id={`participant-${key}`}
									value={
										key === "role"
											? studio.participant.metadata?.roleLabel || studio.participant.role
											: (studio.participant[key] ?? "")
									}
									maxLength={100}
									onChange={(event) =>
										studio.setParticipant((person) => ({
											...person,
											[key]: event.target.value,
											...(key === "role" && person.metadata
												? { metadata: { ...person.metadata, roleLabel: event.target.value } }
												: {}),
										}))
									}
								/>
							</Field>
						))}
						<Field>
							<FieldLabel htmlFor="participant-number">Number</FieldLabel>
							<Input
								id="participant-number"
								type="number"
								min={1}
								max={999999}
								value={studio.participant.number}
								onChange={(event) => {
									const number = event.target.valueAsNumber;
									if (Number.isSafeInteger(number) && number > 0 && number <= 999999)
										studio.setParticipant((person) => ({
											...person,
											number,
											signature: {
												seed: studio.design.material.recipe?.seed ?? number * 1777,
												version: 1,
											},
										}));
								}}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="participant-url">QR destination</FieldLabel>
							<Input
								id="participant-url"
								type="url"
								value={urlDraft}
								maxLength={300}
								placeholder="https://your-event.com"
								onChange={(event) => {
									const value = event.target.value;
									setUrlDraft(value);
									try {
										const url = new URL(value);
										if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
											throw new Error();
										setUrlError("");
										studio.setParticipant((person) => ({ ...person, publicUrl: url.href }));
									} catch {
										setUrlError("Use a full URL starting with https://. The previous QR is kept.");
									}
								}}
								aria-invalid={Boolean(urlError)}
								aria-describedby="participant-url-feedback"
							/>
							<p id="participant-url-feedback" className="design-help">
								{urlError}
							</p>
						</Field>
					</FieldGroup>
				</>
			)}
		</aside>
	);
}
