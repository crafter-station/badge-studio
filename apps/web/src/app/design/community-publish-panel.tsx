"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import type { useCommunityPublishing } from "./use-community-publishing";

export function CommunityPublishPanel({
	publishing,
}: {
	publishing: ReturnType<typeof useCommunityPublishing>;
}) {
	const [open, setOpen] = useState(false);
	const [consent, setConsent] = useState(false);
	const [pending, setPending] = useState(false);
	const [localError, setLocalError] = useState("");
	async function act(work: () => Promise<unknown>) {
		setPending(true);
		setLocalError("");
		setConsent(false);
		try {
			await work();
			setOpen(true);
		} catch (reason) {
			setLocalError((reason as Error).message);
		} finally {
			setPending(false);
		}
	}
	const prepared = publishing.prepared;
	const receipt = prepared?.receipt;
	return (
		<section className="community-publish" aria-label="Publicar en la colección">
			<div className="community-publish-heading">
				<div>
					<strong>Un badge para compartir.</strong>
					<p>Tu agente también puede publicarlo. Tú decides cuándo.</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					disabled={pending}
					onClick={() => (prepared ? setOpen(!open) : void act(() => publishing.prepare()))}
				>
					{pending ? "Preparando…" : receipt ? "Ver publicación" : "Publicar badge"}
				</Button>
			</div>
			{open || prepared?.consented ? (
				<div className="community-publish-body">
					{receipt ? (
						<>
							<output>
								{receipt.state === "published"
									? `Publicado · versión ${receipt.version}`
									: "La publicación fue retirada."}
							</output>
							<div className="community-actions">
								{receipt.state === "published" ? (
									<>
										<a
											href={receipt.url}
											target="_blank"
											rel="noreferrer"
											className={buttonVariants({ size: "sm" })}
										>
											Ver en la galería
										</a>
										<Button
											size="sm"
											variant="outline"
											disabled={pending}
											onClick={() =>
												void act(() =>
													publishing.prepare({
														publicationId: receipt.id,
														expectedVersion: receipt.version,
													}),
												)
											}
										>
											Publicar cambios
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={pending}
											onClick={() =>
												void act(() => publishing.prepareWithdrawal(receipt.id, receipt.version))
											}
										>
											Retirar publicación
										</Button>
									</>
								) : null}
								<Button
									size="sm"
									variant="ghost"
									disabled={pending}
									onClick={() => void act(() => publishing.prepare())}
								>
									Preparar otra publicación
								</Button>
							</div>
						</>
					) : prepared ? (
						<>
							<p>
								<strong>{prepared.intent.title}</strong> · {prepared.intent.participantName}
							</p>
							<p>
								Se compartirán tu foto, nombre, datos y ambas caras con sus capas editables.
								Cualquier persona podrá verlos y usar el diseño. Los cambios posteriores seguirán
								siendo locales hasta que publiques una actualización.
							</p>
							{!prepared.consented ? (
								<>
									<label className="community-consent" htmlFor="publication-consent">
										<Checkbox
											id="publication-consent"
											checked={consent}
											onCheckedChange={(value) => setConsent(Boolean(value))}
										/>
										{prepared.intent.action === "withdraw"
											? "Quiero retirar este badge de la galería."
											: "Quiero compartir este badge públicamente."}
									</label>
									<Button
										size="sm"
										disabled={!consent || pending}
										onClick={() =>
											void act(() => publishing.submit(prepared.intent.snapshotHash, true))
										}
									>
										Continuar
									</Button>
								</>
							) : (
								<div className="community-actions">
									<a
										href={publishing.url}
										target="_blank"
										rel="noreferrer"
										className={buttonVariants({ size: "sm" })}
									>
										{publishing.phase === "review"
											? "Confirmar vista previa"
											: "Verificar cuenta y publicar"}
									</a>
									<Button
										size="sm"
										variant="ghost"
										disabled={pending}
										onClick={() => void act(() => publishing.advance())}
									>
										Comprobar estado
									</Button>
								</div>
							)}
							<output className="community-caption">
								{publishing.phase === "uploading"
									? "Preparando tus imágenes…"
									: publishing.phase === "review"
										? "Vista previa lista. Confírmala en la pestaña de publicación."
										: "Tu diseño permanece abierto aquí durante el inicio de sesión."}
							</output>
							<Button
								size="sm"
								variant="ghost"
								disabled={pending}
								onClick={() => void act(() => publishing.clear())}
							>
								Cancelar publicación
							</Button>
						</>
					) : null}
				</div>
			) : null}
			{localError || publishing.error ? (
				<p className="community-error" role="alert">
					{localError || publishing.error}
				</p>
			) : null}
		</section>
	);
}
