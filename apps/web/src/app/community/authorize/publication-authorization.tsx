"use client";

import { CommunityBadge } from "@/components/community-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
	type CommunityIntent,
	type CommunityReceipt,
	type CommunityReview,
	communityIntentSchema,
	digestSchema,
	publicationKeySchema,
} from "@/lib/community-contract";
import { registerPageTools } from "@/lib/webmcp";
import type { PageModelContext } from "@/lib/webmcp";
import { SignIn, SignUp, UserButton, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { CommunityRequestError, communityRequest } from "../../design/community-client";

const handoffSchema = z
	.object({ secretHash: publicationKeySchema, intent: communityIntentSchema })
	.strict();
type Handoff = { secretHash: string; intent: CommunityIntent };

export function AuthorizePublication({ configured }: { configured: boolean }) {
	if (!configured)
		return (
			<main className="community-page">
				<h1>Publicación en preparación</h1>
				<p>Tu badge permanece en el editor. El inicio de sesión aún no está configurado.</p>
			</main>
		);
	return <Authorization />;
}

function Authorization() {
	const { isLoaded, isSignedIn, user } = useUser();
	const [handoff, setHandoff] = useState<Handoff>();
	const [review, setReview] = useState<CommunityReview>();
	const [receipt, setReceipt] = useState<CommunityReceipt>();
	const [error, setError] = useState("");
	const [consent, setConsent] = useState(false);
	const [pending, setPending] = useState(false);
	const [connected, setConnected] = useState(false);
	const [terminal, setTerminal] = useState(false);
	const signingUp = useSearchParams().get("flow") === "sign-up";
	const [rendered, setRendered] = useState({ front: false, back: false });
	const previousUser = useRef<string | undefined>(undefined);
	const confirming = useRef(false);

	useEffect(() => {
		const refreshRequest = () => {
			if (new URLSearchParams(window.location.hash.slice(1)).has("request"))
				window.location.reload();
		};
		window.addEventListener("hashchange", refreshRequest);
		try {
			const params = new URLSearchParams(window.location.hash.slice(1));
			const raw = params.get("request");
			if (raw) {
				const value = handoffSchema.parse(JSON.parse(raw));
				sessionStorage.setItem("badge-publication-request", JSON.stringify(value));
				history.replaceState(null, "", `/community/authorize${window.location.search}`);
				setHandoff(value);
			} else {
				const saved = sessionStorage.getItem("badge-publication-request");
				if (saved) setHandoff(handoffSchema.parse(JSON.parse(saved)));
				else setError("Prepara tu badge en el editor para publicar.");
			}
		} catch {
			setError("Este enlace no es válido. Vuelve al editor y prepara la publicación otra vez.");
		}
		return () => window.removeEventListener("hashchange", refreshRequest);
	}, []);

	useEffect(() => {
		if (!user?.id || !handoff) {
			setConnected(false);
			return;
		}
		if (previousUser.current && previousUser.current !== user.id) {
			setError("Cambiaste de cuenta. Vuelve al editor y prepara una nueva publicación.");
			setConnected(false);
			setTerminal(true);
			return;
		}
		previousUser.current = user.id;
		let cancelled = false;
		const controller = new AbortController();
		void communityRequest("/authorize", handoff, undefined, controller.signal)
			.then(() => {
				if (!cancelled) setConnected(true);
			})
			.catch((reason) => {
				if (!cancelled) {
					setError((reason as Error).message);
					setTerminal(true);
				}
			});
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [user?.id, handoff]);

	useEffect(() => {
		if (!connected || !handoff || !isSignedIn || receipt || terminal) return;
		let stopped = false;
		let loading = false;
		const controller = new AbortController();
		const read = async () => {
			if (loading) return;
			loading = true;
			try {
				const value = await communityRequest<CommunityReview>(
					`/review?operationId=${handoff.intent.operationId}`,
					undefined,
					undefined,
					controller.signal,
				);
				if (stopped) return;
				setReview(value);
				setError("");
				if (value.receipt) setReceipt(value.receipt);
			} catch (reason) {
				if (!stopped) {
					setError((reason as Error).message);
					if (
						reason instanceof CommunityRequestError &&
						reason.status >= 400 &&
						reason.status < 500 &&
						reason.status !== 429
					)
						setTerminal(true);
				}
			} finally {
				loading = false;
			}
		};
		void read();
		const interval = setInterval(() => void read(), 2500);
		return () => {
			stopped = true;
			controller.abort();
			clearInterval(interval);
		};
	}, [connected, handoff, isSignedIn, receipt, terminal]);

	async function confirm() {
		if (
			!review?.ready ||
			terminal ||
			!handoff ||
			!isSignedIn ||
			confirming.current ||
			(handoff.intent.action !== "withdraw" && (!rendered.front || !rendered.back))
		)
			throw new Error("La vista previa todavía no está lista.");
		confirming.current = true;
		setPending(true);
		setError("");
		try {
			const result = await communityRequest<CommunityReceipt>("/review", {
				operationId: handoff.intent.operationId,
				snapshotHash: handoff.intent.snapshotHash,
				consent: true,
			});
			setReceipt(result);
			return result;
		} catch (reason) {
			setError((reason as Error).message);
			throw reason;
		} finally {
			confirming.current = false;
			setPending(false);
		}
	}
	const latest = useRef({ review, handoff, confirm });
	latest.current = { review, handoff, confirm };
	useEffect(() => {
		const context = (document as Document & { modelContext?: PageModelContext }).modelContext;
		if (!context) return;
		const controller = new AbortController();
		void registerPageTools(
			context,
			[
				{
					name: "badge_publication_confirm",
					description:
						"Confirm the displayed public badge after the user approved publication. Requires a real signed-in Clerk account. Publishes the frozen version or withdraws the displayed target. Read the rendered preview before confirming.",
					inputSchema: {
						type: "object",
						properties: {
							operationId: { type: "string" },
							snapshotHash: { type: "string" },
							consent: { type: "boolean", const: true },
						},
						required: ["operationId", "snapshotHash", "consent"],
						additionalProperties: false,
					},
					annotations: { readOnlyHint: false, untrustedContentHint: true },
					execute: async (input) => {
						try {
							const value = z
								.object({
									operationId: z.string().uuid(),
									snapshotHash: digestSchema,
									consent: z.literal(true),
								})
								.strict()
								.parse(input);
							if (
								value.operationId !== latest.current.handoff?.intent.operationId ||
								value.snapshotHash !== latest.current.handoff.intent.snapshotHash
							)
								throw new Error("La versión preparada cambió.");
							return JSON.stringify({ ok: true, data: await latest.current.confirm() });
						} catch (reason) {
							return JSON.stringify({ ok: false, error: { message: (reason as Error).message } });
						}
					},
				},
			],
			controller.signal,
		).catch(() => {});
		return () => controller.abort();
	}, []);

	if (!isLoaded)
		return (
			<main className="community-page">
				<Spinner /> Preparando tu cuenta…
			</main>
		);
	return (
		<main className="community-page community-authorization">
			<div className="community-heading">
				<p className="community-eyebrow">Badge Studio · Tu colección pública</p>
				<h1>{receipt ? "Listo para compartir." : "Tu badge, para todos."}</h1>
				<p>
					{isSignedIn
						? "Revisa la versión que verá la comunidad."
						: "Inicia sesión para publicar. Tu diseño sigue abierto en el editor."}
				</p>
			</div>
			{!isSignedIn ? (
				signingUp ? (
					<SignUp
						routing="hash"
						forceRedirectUrl="/community/authorize"
						signInUrl="/community/authorize"
					/>
				) : (
					<SignIn
						routing="hash"
						forceRedirectUrl="/community/authorize"
						signUpUrl="/community/authorize?flow=sign-up"
					/>
				)
			) : (
				<>
					<div className="community-account">
						<UserButton />
						<span>{user.fullName || user.primaryEmailAddress?.emailAddress}</span>
					</div>
					{receipt ? (
						<div className="community-success" aria-live="polite">
							<h2>
								{receipt.state === "published"
									? "Tu badge ya está en la galería."
									: "La publicación fue retirada."}
							</h2>
							<p>Puedes volver al editor y seguir creando con tu agente.</p>
							{receipt.state === "published" ? (
								<a href={receipt.url} className={buttonVariants({ size: "sm" })}>
									Ver publicación
								</a>
							) : null}
						</div>
					) : terminal ? (
						<p>
							Vuelve al editor que ya tienes abierto y prepara una nueva publicación. Tu diseño
							sigue guardado.
						</p>
					) : review?.ready && review.publication ? (
						<>
							<div className="community-faces">
								<CommunityBadge
									publication={review.publication}
									onReady={() => setRendered((value) => ({ ...value, front: true }))}
								/>
								<CommunityBadge
									publication={review.publication}
									side="back"
									onReady={() => setRendered((value) => ({ ...value, back: true }))}
								/>
							</div>
							<h2>{review.publication.snapshot.design.name}</h2>
							<p>
								{review.publication.snapshot.participant.name} ·{" "}
								{review.publication.snapshot.design.event}
							</p>
							<p className="community-disclosure">
								{handoff?.intent.action === "withdraw"
									? "El badge dejará de aparecer en la galería y su enlace público dejará de funcionar. Las copias que otros hayan guardado seguirán siendo suyas."
									: "La foto, el nombre, los datos y ambas caras serán públicos. Otras personas podrán verlos y reutilizar las capas del diseño. Podrás actualizar o retirar esta publicación desde tu cuenta."}
							</p>
							<label className="community-consent" htmlFor="publication-review-consent">
								<Checkbox
									id="publication-review-consent"
									checked={consent}
									onCheckedChange={(value) => setConsent(Boolean(value))}
								/>
								{handoff?.intent.action === "withdraw"
									? "Quiero retirar esta publicación."
									: "Quiero compartir esta versión públicamente."}
							</label>
							<Button
								disabled={
									!consent ||
									pending ||
									(handoff?.intent.action !== "withdraw" && (!rendered.front || !rendered.back))
								}
								onClick={() => void confirm().catch(() => {})}
							>
								{pending
									? handoff?.intent.action === "withdraw"
										? "Retirando…"
										: "Publicando…"
									: handoff?.intent.action === "withdraw"
										? "Retirar publicación"
										: handoff?.intent.action === "update"
											? "Publicar actualización"
											: "Publicar badge"}
							</Button>
						</>
					) : (
						<div className="community-wait" aria-live="polite">
							<Spinner />
							<p>
								Tu agente está preparando las imágenes. Mantén abierto el editor; la vista previa
								aparecerá aquí.
							</p>
						</div>
					)}
				</>
			)}
			{error ? (
				<p className="community-error" role="alert">
					{error}
				</p>
			) : null}
		</main>
	);
}
