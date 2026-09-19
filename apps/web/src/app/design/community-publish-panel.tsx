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
		<section className="community-publish" aria-label="Publish to the collection">
			<div className="community-publish-heading">
				<div>
					<strong>A badge worth sharing.</strong>
					<p>Your agent can publish it too. You decide when.</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					disabled={pending}
					onClick={() => (prepared ? setOpen(!open) : void act(() => publishing.prepare()))}
				>
					{pending ? "Preparing…" : receipt ? "View publication" : "Publish badge"}
				</Button>
			</div>
			{open || prepared?.consented ? (
				<div className="community-publish-body">
					{receipt ? (
						<>
							<output>
								{receipt.state === "published"
									? `Published · version ${receipt.version}`
									: "The publication was withdrawn."}
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
											View in the gallery
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
											Publish changes
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={pending}
											onClick={() =>
												void act(() => publishing.prepareWithdrawal(receipt.id, receipt.version))
											}
										>
											Withdraw publication
										</Button>
									</>
								) : null}
								<Button
									size="sm"
									variant="ghost"
									disabled={pending}
									onClick={() => void act(() => publishing.prepare())}
								>
									Prepare another publication
								</Button>
							</div>
						</>
					) : prepared ? (
						<>
							<p>
								<strong>{prepared.intent.title}</strong> · {prepared.intent.participantName}
							</p>
							<p>
								Your photo, name, details and both faces with their editable layers will be shared.
								Anyone will be able to see them and use the design. Later changes stay local until
								you publish an update.
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
											? "I want to withdraw this badge from the gallery."
											: "I want to share this badge publicly."}
									</label>
									<Button
										size="sm"
										disabled={!consent || pending}
										onClick={() =>
											void act(() => publishing.submit(prepared.intent.snapshotHash, true))
										}
									>
										Continue
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
											? "Confirm preview"
											: "Verify account and publish"}
									</a>
									<Button
										size="sm"
										variant="ghost"
										disabled={pending}
										onClick={() => void act(() => publishing.advance())}
									>
										Check status
									</Button>
								</div>
							)}
							<output className="community-caption">
								{publishing.phase === "uploading"
									? "Preparing your images…"
									: publishing.phase === "review"
										? "Preview ready. Confirm it in the publication tab."
										: "Your design stays open here while you sign in."}
							</output>
							<Button
								size="sm"
								variant="ghost"
								disabled={pending}
								onClick={() => void act(() => publishing.clear())}
							>
								Cancel publication
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
