"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BadgeLayer } from "@crafter-station/badge-studio-design/badge-design";
import { DesignExtraControls } from "./design-extra-controls";

export function DesignLayerControls({
	layer,
	disabled,
	update,
}: { layer: BadgeLayer; disabled: boolean; update: (patch: Partial<BadgeLayer>) => void }) {
	return (
		<FieldGroup>
			<DesignExtraControls layer={layer} disabled={disabled} update={update} />
			{layer.kind === "text" ? (
				<>
					{layer.binding === "none" || layer.binding === "template" ? (
						<Field>
							<FieldLabel htmlFor="layer-text">Texto</FieldLabel>
							<Textarea
								id="layer-text"
								rows={2}
								maxLength={160}
								disabled={disabled}
								value={layer.text}
								onChange={(event) => update({ text: event.target.value })}
							/>
						</Field>
					) : (
						<p className="design-help">Vinculado a los datos del participante: {layer.binding}.</p>
					)}
					<Field>
						<FieldLabel htmlFor="layer-font">Tipografía</FieldLabel>
						<select
							id="layer-font"
							className="design-select"
							value={layer.font}
							disabled={disabled}
							onChange={(event) => update({ font: event.target.value as typeof layer.font })}
						>
							<option value="sans">Sans</option>
							<option value="serif">Editorial serif</option>
							<option value="mono">Monoespaciada</option>
							<option value="display">Display</option>
							<option value="brand">Grotesca GTM / Andes</option>
							<option value="script">Caligrafía Next Craft</option>
							<option value="archive">Archivo Next Craft</option>
							<option value="pixel">Desktop Vibecode</option>
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="layer-size">Tamaño</FieldLabel>
						<Input
							id="layer-size"
							type="number"
							min={12}
							max={220}
							disabled={disabled}
							value={layer.size}
							onChange={(event) => update({ size: event.target.valueAsNumber })}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="layer-binding">Contenido</FieldLabel>
						<select
							id="layer-binding"
							className="design-select"
							value={layer.binding}
							disabled={disabled}
							onChange={(event) => update({ binding: event.target.value as typeof layer.binding })}
						>
							{[
								"none",
								"name",
								"role",
								"organization",
								"number",
								"event",
								"location",
								"date",
								"bio",
								"roleOrganization",
								"website",
								"roleCode",
								"admissionRole",
								"signature",
								"template",
							].map((value) => (
								<option value={value} key={value}>
									{value === "none" ? "Texto libre" : value}
								</option>
							))}
						</select>
					</Field>
					{(
						[
							["align", "Alineación", ["left", "center", "right"]],
							["weight", "Peso", ["400", "500", "600", "700", "800", "900"]],
							["fit", "Composición", ["wrap", "shrink", "spread"]],
							["transform", "Mayúsculas", ["none", "uppercase", "lowercase"]],
							["segment", "Parte del nombre", ["all", "first", "last"]],
							["baseline", "Línea de base", ["top", "alphabetic"]],
						] as const
					).map(([key, label, options]) => (
						<Field key={key}>
							<FieldLabel htmlFor={`layer-${key}`}>{label}</FieldLabel>
							<select
								id={`layer-${key}`}
								className="design-select"
								value={layer[key] ?? options[0]}
								disabled={disabled}
								onChange={(event) => update({ [key]: event.target.value })}
							>
								{options.map((value) => (
									<option value={value} key={value}>
										{value}
									</option>
								))}
							</select>
						</Field>
					))}
					{(
						[
							["tracking", "Espaciado", -8, 40, 0.5, 0],
							["lineHeight", "Interlineado", 0.7, 2, 0.05, 1.15],
						] as const
					).map(([key, label, min, max, step, fallback]) => (
						<Field key={key}>
							<FieldLabel htmlFor={`layer-${key}`}>{label}</FieldLabel>
							<Input
								id={`layer-${key}`}
								type="number"
								value={layer[key] ?? fallback}
								min={min}
								max={max}
								step={step}
								disabled={disabled}
								onChange={(event) => update({ [key]: event.target.valueAsNumber })}
							/>
						</Field>
					))}
				</>
			) : null}
			{"color" in layer ? (
				<Field>
					<FieldLabel htmlFor="layer-color">Tinta</FieldLabel>
					<Input
						id="layer-color"
						type="color"
						value={layer.color.slice(0, 7)}
						disabled={disabled}
						onChange={(event) => update({ color: event.target.value })}
					/>
				</Field>
			) : null}
			{layer.kind === "portrait" ? (
				<>
					<Field>
						<FieldLabel htmlFor="layer-filter">Tratamiento del retrato</FieldLabel>
						<select
							id="layer-filter"
							className="design-select"
							value={layer.filter}
							disabled={disabled}
							onChange={(event) =>
								update({
									filter: event.target.value as typeof layer.filter,
									tint: undefined,
									tintMode: undefined,
									tintOpacity: undefined,
									saturation: undefined,
								})
							}
						>
							<option value="original">Original</option>
							<option value="mono">Monocromo</option>
							<option value="rose">Rosa editorial</option>
							<option value="blue">Azul tinta</option>
							<option value="warm">Vintage cálido</option>
							<option value="thermal">Térmico original</option>
							<option value="silver">Plata metálica</option>
							<option value="cyanotype">Cianotipo fotográfico</option>
							<option value="vintage">Película vintage</option>
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="portrait-clip">Silueta</FieldLabel>
						<select
							id="portrait-clip"
							className="design-select"
							value={layer.clip ?? "rectangle"}
							disabled={disabled}
							onChange={(event) => update({ clip: event.target.value as typeof layer.clip })}
						>
							<option value="rectangle">Rectángulo</option>
							<option value="arch">Arco</option>
							<option value="ellipse">Elipse</option>
						</select>
					</Field>
					{(["x", "y", "zoom"] as const).map((key) => (
						<Field key={key}>
							<FieldLabel htmlFor={`portrait-crop-${key}`}>Recorte {key}</FieldLabel>
							<Input
								id={`portrait-crop-${key}`}
								type="range"
								min={key === "zoom" ? 1 : 0}
								max={key === "zoom" ? 12 : 1}
								step={0.01}
								value={layer.crop?.[key] ?? (key === "zoom" ? 1 : 0.5)}
								disabled={disabled}
								onChange={(event) =>
									update({
										crop: {
											x: 0.5,
											y: 0.5,
											zoom: 1,
											...layer.crop,
											[key]: event.target.valueAsNumber,
										},
									})
								}
							/>
						</Field>
					))}
					{(["x", "top", "bottom"] as const).map((key) => (
						<Field key={key}>
							<FieldLabel htmlFor={`portrait-fade-${key}`}>
								Difuminado {key === "x" ? "lateral" : key === "top" ? "superior" : "inferior"}
							</FieldLabel>
							<Input
								id={`portrait-fade-${key}`}
								type="range"
								min={0}
								max={0.5}
								step={0.01}
								value={layer.fade?.[key] ?? 0}
								disabled={disabled}
								onChange={(event) =>
									update({
										fade: {
											x: 0,
											top: 0,
											bottom: 0,
											...layer.fade,
											[key]: event.target.valueAsNumber,
										},
									})
								}
							/>
						</Field>
					))}
					{(
						[
							["contrast", "Contraste", 0.5, 2, 0.05, 1.16],
							["brightness", "Luz", 0.3, 1.8, 0.05, 1],
							["blur", "Desenfoque", 0, 24, 1, 0],
							["saturation", "Saturación", 0, 2, 0.05, 1],
							["tintOpacity", "Intensidad del tinte", 0, 1, 0.05, 1],
						] as const
					).map(([key, label, min, max, step, fallback]) => (
						<Field key={key}>
							<FieldLabel htmlFor={`portrait-${key}`}>{label}</FieldLabel>
							<Input
								id={`portrait-${key}`}
								type="range"
								min={min}
								max={max}
								step={step}
								value={layer[key] ?? fallback}
								disabled={disabled}
								onChange={(event) => update({ [key]: event.target.valueAsNumber })}
							/>
						</Field>
					))}
					<Field>
						<FieldLabel htmlFor="portrait-tint">Tinte</FieldLabel>
						<Input
							id="portrait-tint"
							type="color"
							value={layer.tint?.slice(0, 7) ?? "#ffffff"}
							disabled={disabled}
							onChange={(event) => update({ tint: event.target.value })}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="portrait-tint-mode">Mezcla del tinte</FieldLabel>
						<select
							id="portrait-tint-mode"
							className="design-select"
							value={layer.tintMode ?? "multiply"}
							disabled={disabled}
							onChange={(event) =>
								update({ tintMode: event.target.value as typeof layer.tintMode })
							}
						>
							<option value="multiply">Multiplicar</option>
							<option value="color">Color</option>
						</select>
					</Field>
				</>
			) : null}
			{layer.kind === "shape" ? (
				<Field>
					<FieldLabel htmlFor="layer-shape">Forma</FieldLabel>
					<select
						id="layer-shape"
						className="design-select"
						value={layer.shape}
						disabled={disabled}
						onChange={(event) => update({ shape: event.target.value as typeof layer.shape })}
					>
						{["rectangle", "ellipse", "line", "frame", "corners", "arch", "bevel"].map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
				</Field>
			) : null}
			{layer.kind === "graphic" ? (
				<>
					<Field>
						<FieldLabel htmlFor="layer-pattern">Gráfico</FieldLabel>
						<select
							id="layer-pattern"
							className="design-select"
							value={layer.pattern}
							disabled={disabled}
							onChange={(event) => update({ pattern: event.target.value as typeof layer.pattern })}
						>
							{[
								"grid",
								"snow",
								"sky",
								"grain",
								"terrain",
								"seal",
								"cross",
								"window",
								"stamp",
								"scanlines",
								"path",
								"paper",
								"chromatic-paper",
								"checkerboard",
							].map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="layer-accent">Acento</FieldLabel>
						<Input
							id="layer-accent"
							type="color"
							value={layer.accent.slice(0, 7)}
							disabled={disabled}
							onChange={(event) => update({ accent: event.target.value })}
						/>
					</Field>
					{layer.pattern === "path" ? (
						<Field>
							<FieldLabel htmlFor="layer-path">Trazado vectorial</FieldLabel>
							<Textarea
								id="layer-path"
								rows={3}
								value={layer.path ?? ""}
								disabled={disabled}
								maxLength={16000}
								onChange={(event) => update({ path: event.target.value })}
							/>
						</Field>
					) : null}
					<Field>
						<FieldLabel htmlFor="layer-seed">Semilla</FieldLabel>
						<Input
							id="layer-seed"
							type="number"
							min={0}
							max={4294967295}
							value={layer.seed}
							disabled={disabled}
							onChange={(event) => update({ seed: event.target.valueAsNumber })}
						/>
					</Field>
				</>
			) : null}
			{layer.kind === "gradient" ? (
				<>
					<Field>
						<FieldLabel htmlFor="gradient-direction">Dirección</FieldLabel>
						<select
							id="gradient-direction"
							className="design-select"
							value={layer.direction}
							disabled={disabled}
							onChange={(event) =>
								update({ direction: event.target.value as typeof layer.direction })
							}
						>
							<option value="horizontal">Horizontal</option>
							<option value="vertical">Vertical</option>
							<option value="diagonal">Diagonal</option>
						</select>
					</Field>
					{layer.stops.map((stop, index) => (
						<Field key={`${layer.id}-${index}`}>
							<FieldLabel htmlFor={`gradient-stop-${index}`}>Color {index + 1}</FieldLabel>
							<Input
								id={`gradient-stop-${index}`}
								type="color"
								value={stop.color.slice(0, 7)}
								disabled={disabled}
								onChange={(event) =>
									update({
										stops: layer.stops.map((value, i) =>
											i === index
												? { ...value, color: event.target.value + value.color.slice(7) }
												: value,
										),
									})
								}
							/>
							<Input
								type="range"
								aria-label={`Opacidad del color ${index + 1}`}
								min={0}
								max={255}
								step={1}
								value={Number.parseInt(stop.color.slice(7) || "ff", 16)}
								disabled={disabled}
								onChange={(event) =>
									update({
										stops: layer.stops.map((value, i) =>
											i === index
												? {
														...value,
														color:
															value.color.slice(0, 7) +
															event.target.valueAsNumber.toString(16).padStart(2, "0"),
													}
												: value,
										),
									})
								}
							/>
						</Field>
					))}
				</>
			) : null}
			{layer.kind === "effect" ? (
				<>
					<Field>
						<FieldLabel htmlFor="layer-effect">Efecto</FieldLabel>
						<select
							id="layer-effect"
							className="design-select"
							value={layer.effect}
							disabled={disabled}
							onChange={(event) => update({ effect: event.target.value as typeof layer.effect })}
						>
							<option value="ribbons">Cintas fluidas</option>
							<option value="contours">Topografía</option>
							<option value="orbits">Órbitas</option>
							<option value="grain">Grano</option>
							<option value="chromatic-flow">Flujo GTM</option>
						</select>
					</Field>
					<div className="design-effect-colors">
						{layer.colors.map((color, index) => (
							<Field key={`${layer.id}-${index}`}>
								<FieldLabel htmlFor={`effect-color-${index}`}>Color {index + 1}</FieldLabel>
								<Input
									id={`effect-color-${index}`}
									type="color"
									value={color}
									disabled={disabled}
									onChange={(event) =>
										update({
											colors: layer.colors.map((value, i) =>
												i === index ? event.target.value : value,
											),
										})
									}
								/>
							</Field>
						))}
					</div>
				</>
			) : null}
			{"radius" in layer ? (
				<Field>
					<FieldLabel htmlFor="layer-radius">Radio</FieldLabel>
					<Input
						id="layer-radius"
						type="number"
						min={0}
						max={layer.kind === "portrait" ? 400 : 160}
						value={layer.radius}
						disabled={disabled}
						onChange={(event) => update({ radius: event.target.valueAsNumber })}
					/>
				</Field>
			) : null}
			{layer.kind === "shape" || layer.kind === "graphic" ? (
				<Field>
					<FieldLabel htmlFor="layer-stroke">Trazo</FieldLabel>
					<Input
						id="layer-stroke"
						type="number"
						min={0}
						max={20}
						step={0.5}
						value={layer.stroke ?? 2}
						disabled={disabled}
						onChange={(event) => update({ stroke: event.target.valueAsNumber })}
					/>
				</Field>
			) : null}
			{layer.kind !== "qr" ? (
				<Field>
					<FieldLabel htmlFor="layer-rotation">Rotación</FieldLabel>
					<Input
						id="layer-rotation"
						type="number"
						min={-180}
						max={180}
						step={1}
						value={layer.rotation ?? 0}
						disabled={disabled}
						onChange={(event) => update({ rotation: event.target.valueAsNumber })}
					/>
				</Field>
			) : null}
			{
				<Field>
					<FieldLabel htmlFor="layer-opacity">Opacidad</FieldLabel>
					<Input
						id="layer-opacity"
						type="range"
						min={0}
						max={1}
						step={0.05}
						value={layer.opacity ?? 1}
						disabled={disabled || layer.kind === "qr"}
						onChange={(event) => update({ opacity: event.target.valueAsNumber })}
					/>
				</Field>
			}
		</FieldGroup>
	);
}
