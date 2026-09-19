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
			{profile.uploading ? "Preparing…" : profile.portraitUrl ? "Change photo" : "Upload my photo"}
		</Button>
	);

	return (
		<section
			className={welcome ? "design-welcome" : "design-profile"}
			aria-label="Your profile for every badge"
		>
			<input
				ref={input}
				id="participant-photo"
				type="file"
				accept="image/png,image/jpeg,image/webp"
				aria-label="Your photo for every style"
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
						<p className="design-welcome-eyebrow">One photo. Every version of you.</p>
						<h1>Start with you.</h1>
						<p className="design-welcome-description">
							Your photo in {designPresets.length} styles with personality. Upload one, find yours
							and make it unique.
						</p>
						<Field>
							<FieldLabel htmlFor="participant-name">
								Your name <span className="design-help">optional</span>
							</FieldLabel>
							<Input
								id="participant-name"
								autoComplete="name"
								placeholder="How you will appear on the badges"
								maxLength={80}
								value={profile.identity.name}
								onChange={(event) => profile.updateIdentity({ name: event.target.value })}
							/>
						</Field>
						<div className="design-welcome-upload">
							{upload}
							<span>or drag your photo here</span>
						</div>
						<Button
							className="design-example-photo"
							variant="outline"
							disabled={profile.uploading}
							onClick={() => void profile.useExamplePhoto()}
						>
							<img src={sampleParticipant.portraitUrl} alt="" width={28} height={28} />
							Try with a sample photo
						</Button>
						<p className="design-welcome-privacy">
							JPG, PNG or WebP · up to 8 MB
							<br />
							Your photo stays in this browser.
						</p>
						<Button
							className="design-welcome-skip"
							variant="ghost"
							size="sm"
							disabled={profile.uploading}
							onClick={() => profile.updateIdentity({ started: true })}
						>
							Explore without a photo
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
						<p>The same person. One identity in every style.</p>
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
								Your name on every badge
							</label>
							<Input
								id="participant-name"
								autoComplete="name"
								placeholder="Your name"
								maxLength={80}
								value={profile.identity.name}
								onChange={(event) => profile.updateIdentity({ name: event.target.value })}
							/>
							<span>Your profile in {designPresets.length} styles</span>
						</div>
						<p className="design-profile-saved" aria-live="polite">
							{profile.saving ? (
								<>
									<Spinner /> Saving in this browser…
								</>
							) : profile.warning ? (
								"Available for this session"
							) : (
								<>
									<Check /> Saved in this browser
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
									Use sample
								</Button>
							) : null}
							{profile.portraitUrl ? (
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Remove my photo from every badge"
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
					<strong>Drop your photo.</strong>
					<span>It will be applied to all your badges.</span>
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
