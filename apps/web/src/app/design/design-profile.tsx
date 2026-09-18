"use client";

import { BadgeSnapshot } from "@/components/badge-snapshot";
import { useParticipantProfile } from "@/components/participant-profile-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { designPresets } from "@/lib/design-presets";
import { placeholderPortrait } from "@/lib/participant-profile";
import { sampleParticipant } from "@/lib/sample-participant";
import { demoBadgeForDesign } from "@/lib/studio-participant";
import { Check, Image, UploadSimple, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

const welcomeDesigns = ["hackzero-winter", "vibecode", "gtm"]
	.map((source) => designPresets.find((design) => design.source === source))
	.filter((design) => design !== undefined);

export function DesignProfile({ welcome = false }: { welcome?: boolean }) {
	const profile = useParticipantProfile();
	const input = useRef<HTMLInputElement>(null);
	const depth = useRef(0);
	const [dragging, setDragging] = useState(false);

	useEffect(() => {
		const dragEnter = (event: DragEvent) => {
			if (!event.dataTransfer?.types.includes("Files")) return;
			event.preventDefault();
			depth.current++;
			setDragging(true);
		};
		const dragOver = (event: DragEvent) => {
			if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
		};
		const dragLeave = () => {
			depth.current = Math.max(0, depth.current - 1);
			if (!depth.current) setDragging(false);
		};
		const drop = (event: DragEvent) => {
			if (!event.dataTransfer?.types.includes("Files")) return;
			event.preventDefault();
			depth.current = 0;
			setDragging(false);
			const file = event.dataTransfer.files[0];
			if (file) void profile.changePhoto(file);
		};
		const paste = (event: ClipboardEvent) => {
			const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
				item.type.startsWith("image/"),
			);
			if (!file) return;
			event.preventDefault();
			void profile.changePhoto(file);
		};
		window.addEventListener("dragenter", dragEnter);
		window.addEventListener("dragover", dragOver);
		window.addEventListener("dragleave", dragLeave);
		window.addEventListener("drop", drop);
		window.addEventListener("paste", paste);
		return () => {
			window.removeEventListener("dragenter", dragEnter);
			window.removeEventListener("dragover", dragOver);
			window.removeEventListener("dragleave", dragLeave);
			window.removeEventListener("drop", drop);
			window.removeEventListener("paste", paste);
		};
	}, [profile.changePhoto]);

	const upload = (
		<Button
			size={welcome ? "lg" : "sm"}
			variant={welcome || !profile.portraitUrl ? "default" : "outline"}
			disabled={profile.uploading}
			onClick={() => input.current?.click()}
			aria-busy={profile.uploading}
		>
			{profile.uploading ? (
				<Spinner data-icon="inline-start" />
			) : (
				<UploadSimple data-icon="inline-start" />
			)}
			{profile.uploading ? "Preparando…" : profile.portraitUrl ? "Cambiar foto" : "Subir mi foto"}
		</Button>
	);

	return (
		<section
			className={welcome ? "design-welcome" : "design-profile"}
			aria-label="Tu perfil para todos los badges"
		>
			<input
				ref={input}
				id="participant-photo"
				type="file"
				accept="image/png,image/jpeg,image/webp"
				aria-label="Tu foto para todos los estilos"
				hidden
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (file) void profile.changePhoto(file);
				}}
			/>
			{welcome ? (
				<>
					<div className="design-welcome-copy">
						<p className="design-welcome-eyebrow">Una foto. Todas tus versiones.</p>
						<h1>Empieza por ti.</h1>
						<p className="design-welcome-description">
							Tu foto en {designPresets.length} estilos con personalidad. Sube una, encuentra el
							tuyo y hazlo único.
						</p>
						<Field>
							<FieldLabel htmlFor="participant-name">
								Tu nombre <span className="design-help">opcional</span>
							</FieldLabel>
							<Input
								id="participant-name"
								autoComplete="name"
								placeholder="Así aparecerás en los badges"
								maxLength={80}
								value={profile.identity.name}
								onChange={(event) => profile.updateIdentity({ name: event.target.value })}
							/>
						</Field>
						<div className="design-welcome-upload">
							{upload}
							<span>o arrastra tu foto aquí</span>
						</div>
						<Button
							className="design-example-photo"
							variant="outline"
							disabled={profile.uploading}
							onClick={() => void profile.useExamplePhoto()}
						>
							<img src={sampleParticipant.portraitUrl} alt="" width={28} height={28} />
							Probar con foto de ejemplo
						</Button>
						<p className="design-welcome-privacy">
							JPG, PNG o WebP · hasta 8 MB
							<br />
							Tu foto se queda en este navegador.
						</p>
						<Button
							className="design-welcome-skip"
							variant="ghost"
							size="sm"
							disabled={profile.uploading}
							onClick={() => profile.updateIdentity({ started: true })}
						>
							Explorar sin foto
						</Button>
						<ProfileFeedback />
					</div>
					<div className="design-welcome-showcase" aria-hidden="true">
						<div className="design-welcome-fan">
							{welcomeDesigns.map((design) => (
								<div key={design.source} className="design-welcome-card">
									<BadgeSnapshot
										data={{
											...demoBadgeForDesign(design),
											name: profile.identity.name.trim() || sampleParticipant.name,
										}}
									/>
								</div>
							))}
						</div>
						<p>Una misma persona. Una identidad en cada estilo.</p>
					</div>
				</>
			) : (
				<>
					<div className="design-profile-row">
						<img
							src={profile.portraitUrl || placeholderPortrait}
							alt=""
							className="design-profile-avatar"
							width={36}
							height={36}
						/>
						<div className="design-profile-name">
							<label htmlFor="participant-name" className="sr-only">
								Tu nombre en todos los badges
							</label>
							<Input
								id="participant-name"
								autoComplete="name"
								placeholder="Tu nombre"
								maxLength={80}
								value={profile.identity.name}
								onChange={(event) => profile.updateIdentity({ name: event.target.value })}
							/>
							<span>Tu perfil en {designPresets.length} estilos</span>
						</div>
						<p className="design-profile-saved" aria-live="polite">
							{profile.saving ? (
								<>
									<Spinner /> Guardando en este navegador…
								</>
							) : profile.warning ? (
								"Disponible en esta sesión"
							) : (
								<>
									<Check /> Guardado en este navegador
								</>
							)}
						</p>
						<div className="design-profile-actions">
							{upload}
							{!profile.portraitUrl ? (
								<Button
									size="sm"
									variant="outline"
									disabled={profile.uploading}
									onClick={() => void profile.useExamplePhoto()}
								>
									Usar ejemplo
								</Button>
							) : null}
							{profile.portraitUrl ? (
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Quitar mi foto de todos los badges"
									onClick={profile.removePhoto}
								>
									<X />
								</Button>
							) : null}
						</div>
					</div>
					<ProfileFeedback />
				</>
			)}
			{dragging ? (
				<output className="design-photo-drop">
					<Image size={40} />
					<strong>Suelta tu foto.</strong>
					<span>La aplicaremos a todos tus badges.</span>
				</output>
			) : null}
		</section>
	);
}

function ProfileFeedback() {
	const { error, warning } = useParticipantProfile();
	if (!error && !warning) return null;
	return (
		<Alert className="design-profile-feedback" variant={error ? "destructive" : "default"}>
			<AlertDescription>{error || warning}</AlertDescription>
		</Alert>
	);
}
