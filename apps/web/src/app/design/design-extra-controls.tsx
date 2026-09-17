"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BadgeLayer } from "@crafter-station/badge-studio-design/badge-design";

export function DesignExtraControls({
	layer,
	disabled,
	update,
}: {
	layer: BadgeLayer;
	disabled: boolean;
	update: (patch: Partial<BadgeLayer>) => void;
}) {
	return (
		<>
			{!["portrait", "image", "effect"].includes(layer.kind) ? (
				<Field>
					<FieldLabel htmlFor="layer-channel">Acabado de capa</FieldLabel>
					<select
						id="layer-channel"
						className="design-select"
						disabled={disabled}
						value={layer.channel ?? (["text", "qr"].includes(layer.kind) ? "ink" : "print")}
						onChange={(event) => update({ channel: event.target.value as "print" | "ink" })}
					>
						<option value="print">Bajo el material</option>
						<option value="ink">Sobre el material</option>
					</select>
				</Field>
			) : null}
			{layer.kind === "text" ? (
				<>
					{(["prefix", "suffix"] as const).map((key) => (
						<Field key={key}>
							<FieldLabel htmlFor={`layer-${key}`}>
								{key === "prefix" ? "Prefijo" : "Sufijo"}
							</FieldLabel>
							<Input
								id={`layer-${key}`}
								value={layer[key] ?? ""}
								maxLength={30}
								disabled={disabled}
								onChange={(event) => update({ [key]: event.target.value })}
							/>
						</Field>
					))}
					{layer.baseline === "alphabetic" ? (
						<Field>
							<FieldLabel htmlFor="layer-baseline-offset">Posición de la línea de base</FieldLabel>
							<Input
								id="layer-baseline-offset"
								type="number"
								min={0}
								max={260}
								value={layer.baselineOffset ?? layer.size}
								disabled={disabled}
								onChange={(event) => update({ baselineOffset: event.target.valueAsNumber })}
							/>
						</Field>
					) : null}
				</>
			) : null}
			{layer.kind === "portrait" && layer.tint ? (
				<Button
					size="sm"
					variant="ghost"
					disabled={disabled}
					onClick={() => update({ tint: undefined, tintMode: undefined, tintOpacity: undefined })}
				>
					Quitar tinte adicional
				</Button>
			) : null}
			{layer.kind === "graphic" && layer.pattern === "paper" ? (
				<>
					<Field>
						<FieldLabel htmlFor="paper-variant">Patrón del papel</FieldLabel>
						<select
							id="paper-variant"
							className="design-select"
							value={layer.variant ?? "plain"}
							disabled={disabled}
							onChange={(event) => update({ variant: event.target.value as typeof layer.variant })}
						>
							{["plain", "technical", "editorial", "postal", "snow", "grid", "waves"].map(
								(value) => (
									<option key={value} value={value}>
										{value}
									</option>
								),
							)}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="paper-ink">Tinta del papel</FieldLabel>
						<Input
							id="paper-ink"
							type="color"
							disabled={disabled}
							value={(layer.ink ?? layer.accent).slice(0, 7)}
							onChange={(event) => update({ ink: event.target.value })}
						/>
					</Field>
				</>
			) : null}
			{layer.kind === "qr"
				? (["foreground", "background"] as const).map((key) => (
						<Field key={key}>
							<FieldLabel htmlFor={`qr-${key}`}>
								{key === "foreground" ? "Tinta del QR" : "Papel del QR"}
							</FieldLabel>
							<Input
								id={`qr-${key}`}
								type="color"
								disabled={disabled}
								value={layer[key]?.slice(0, 7) ?? (key === "foreground" ? "#111111" : "#ffffff")}
								onChange={(event) => update({ [key]: event.target.value })}
							/>
						</Field>
					))
				: null}
		</>
	);
}
