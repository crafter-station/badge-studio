"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BadgeLayer, DesignSide } from "@crafter-station/badge-studio-design/badge-design";
import { ArrowLeft, LockSimple } from "@phosphor-icons/react";
import { designAssetUrl } from "./design-client";
import { DesignLayerActions } from "./design-layer-actions";
import { DesignLayerControls } from "./design-layer-controls";
import { DesignPhotoPicker } from "./design-photo-picker";
import type { useDesignStudio } from "./use-design-studio";

export function DesignSelectedLayer({
	studio,
	layer,
	label,
	side,
	onBack,
	onParticipant,
}: {
	studio: ReturnType<typeof useDesignStudio>;
	layer: BadgeLayer;
	label: string;
	side: DesignSide;
	onBack: () => void;
	onParticipant: () => void;
}) {
	const pending = Boolean(studio.phase);
	const locked = studio.locks[side].includes(layer.id);
	const artworkLocked = (["front", "back"] as const).some((face) =>
		studio.design[face].layers.some(
			(item) => item.kind === "image" && studio.locks[face].includes(item.id),
		),
	);
	return (
		<section
			className="design-selected-layer"
			aria-label={`Edit ${label}`}
			data-layer-id={layer.id}
		>
			<Button variant="ghost" size="sm" onClick={onBack} className="design-layer-back">
				<ArrowLeft data-icon="inline-start" /> All layers
			</Button>
			<div className="design-section-heading">
				<div>
					<h2>{label}</h2>
					<p className="design-help">{layer.id}</p>
				</div>
				<DesignLayerActions
					label={`${label} (${layer.id})`}
					visible={layer.visible !== false}
					locked={locked}
					disabled={pending}
					onVisibility={() => studio.toggleVisibility(side, layer.id)}
					onLock={() => studio.toggleLock(side, layer.id)}
				/>
			</div>
			{locked ? (
				<Button
					variant="outline"
					size="sm"
					disabled={pending}
					onClick={() => studio.toggleLock(side, layer.id)}
				>
					<LockSimple data-icon="inline-start" /> Unlock to edit
				</Button>
			) : null}
			{layer.visible === false ? (
				<p className="design-help">Hidden layer. Toggle the eye to see it.</p>
			) : null}
			{layer.kind === "portrait" ? (
				<p className="design-help">
					Your photo is shared across every style. Adjust this layer's crop and filter here.
				</p>
			) : layer.kind === "image" ? (
				<DesignPhotoPicker
					artwork
					src={studio.design.artwork ? designAssetUrl(studio.design.artwork.assetId) : undefined}
					disabled={pending || artworkLocked}
					onChange={studio.changeArtwork}
				/>
			) : null}
			{layer.kind === "text" && layer.binding !== "none" && layer.binding !== "template" ? (
				<Button variant="outline" size="sm" onClick={onParticipant}>
					Edit participant details
				</Button>
			) : null}
			<DesignLayerControls
				layer={layer}
				disabled={pending || locked}
				update={(patch) => studio.updateLayer(side, layer.id, patch)}
			/>
			<details className="design-disclosure">
				<summary>Position and size</summary>
				<FieldGroup className="design-dimensions design-layer-details">
					{(
						[
							["x", "X position", 0, 1023],
							["y", "Y position", 0, 1535],
							["w", "Width", 1, 1024],
							["h", "Height", 1, 1536],
						] as const
					).map(([key, name, min, max]) => (
						<Field key={key}>
							<FieldLabel htmlFor={`layer-${key}`}>{name}</FieldLabel>
							<Input
								id={`layer-${key}`}
								type="number"
								min={min}
								max={max}
								value={layer[key]}
								disabled={pending || locked}
								onChange={(event) =>
									studio.updateLayer(
										side,
										layer.id,
										layer.kind === "qr" && (key === "w" || key === "h")
											? { w: event.target.valueAsNumber, h: event.target.valueAsNumber }
											: { [key]: event.target.valueAsNumber },
									)
								}
							/>
						</Field>
					))}
				</FieldGroup>
			</details>
			<div className="design-dimensions">
				{(
					[
						["up", "Bring forward"],
						["down", "Send backward"],
						["duplicate", "Duplicate"],
						["delete", "Delete"],
					] as const
				).map(([action, name]) => (
					<Button
						key={action}
						variant="outline"
						size="sm"
						disabled={pending || locked}
						onClick={() => studio.changeLayers(side, action, layer.id)}
					>
						{name}
					</Button>
				))}
			</div>
		</section>
	);
}
