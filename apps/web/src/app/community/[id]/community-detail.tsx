"use client";

import { designHref } from "@/app/design/design-location";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { loadBadgeFonts } from "@/lib/badge-fonts";
import { type CommunityPublication, publicationData } from "@/lib/community-contract";
import {
	PrismBadge,
	type PrismSide,
	type PrismStatus,
	designAppearance,
} from "@crafter-station/badge-studio-renderer";
import { ArrowLeft, ArrowUpRight, Cube, Pause, Play, Stack } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { communityRequest } from "../../design/community-client";

export function CommunityDetail({ id }: { id: string }) {
	const [publication, setPublication] = useState<CommunityPublication>();
	const [error, setError] = useState("");
	const [attempt, setAttempt] = useState(0);
	const [side, setSide] = useState<PrismSide>("front");
	const [status, setStatus] = useState<PrismStatus>("loading");
	const [motion, setMotion] = useState<boolean>();
	const reducedMotion = useReducedMotion();
	const moving = motion ?? !reducedMotion;

	useEffect(() => {
		const controller = new AbortController();
		setError("");
		setPublication(undefined);
		setSide("front");
		setStatus("loading");
		if (!attempt) setMotion(undefined);
		void Promise.all([
			communityRequest<CommunityPublication>(
				`/${encodeURIComponent(id)}`,
				undefined,
				undefined,
				controller.signal,
			),
			loadBadgeFonts(),
		])
			.then(([value]) => {
				if (!controller.signal.aborted) setPublication(value);
			})
			.catch((reason) => {
				if (!controller.signal.aborted) setError((reason as Error).message);
			});
		return () => controller.abort();
	}, [id, attempt]);

	const design = publication?.snapshot.design;
	return (
		<main className="community-detail">
			<div className="community-detail-nav">
				<Link href="/community" className={buttonVariants({ variant: "ghost", size: "sm" })}>
					<ArrowLeft data-icon="inline-start" />
					Community
				</Link>
				<span>Made to be made yours.</span>
			</div>
			{publication && design ? (
				<div className="community-detail-layout">
					<section className="community-live" aria-label="Interactive badge preview">
						<div className="community-live-heading">
							<Badge variant="outline">
								<Cube data-icon="inline-start" />
								{status === "fallback" ? "Static fallback" : "Live preview"}
							</Badge>
							<span>{side === "front" ? "01 / Front" : "02 / Back"}</span>
						</div>
						<div className="community-live-stage" data-status={status}>
							<PrismBadge
								data={publicationData(publication)}
								appearance={{
									...designAppearance(design),
									motion: moving ? "living" : "paused",
								}}
								side={side}
								onSideChange={setSide}
								onStatus={setStatus}
							/>
						</div>
						<div className="community-live-footer">
							<div className="community-live-controls">
								<ToggleGroup
									value={[side]}
									onValueChange={(values) => {
										if (values[0]) setSide(values[0] as PrismSide);
									}}
									variant="outline"
									size="sm"
									spacing={0}
									aria-label="Badge face"
								>
									<ToggleGroupItem value="front">Front</ToggleGroupItem>
									<ToggleGroupItem value="back">Back</ToggleGroupItem>
								</ToggleGroup>
								<Button
									variant="ghost"
									size="sm"
									disabled={status !== "ready"}
									aria-label={moving ? "Pause motion" : "Resume motion"}
									aria-pressed={!moving}
									onClick={() => setMotion(!moving)}
								>
									{moving ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
									{moving ? "Pause" : "Play"}
								</Button>
							</div>
							<p>
								{status === "fallback"
									? "Live light needs WebGPU. Both faces are still available."
									: "Move to explore the light. Click the badge to flip."}
							</p>
						</div>
					</section>
					<section className="community-detail-copy" aria-labelledby="community-title">
						<div className="community-detail-story">
							<p className="community-eyebrow">Community / {design.event}</p>
							<h1 id="community-title">{design.name}</h1>
							<p className="community-detail-description">{design.description}</p>
							<div className="community-detail-author">
								<span>
									Created by <strong>{publication.authorName}</strong>
								</span>
								<Badge variant="secondary">v{publication.version}</Badge>
							</div>
							<div className="community-detail-facts">
								<span>
									<Stack aria-hidden="true" />
									{design.front.layers.length + design.back.layers.length} editable layers
								</span>
								<span>2 sides. Every detail is yours to change.</span>
							</div>
						</div>
						<div className="community-detail-cta">
							<CopyButton
								value={`Instala y usa la skill badge-studio de crafter-station/badge-studio. Crea mi badge usando este diseño: https://badge-studio.crafter.run/community/${publication.id}. Pídeme mi foto, muéstramelo y vamos iterando.`}
								label="Create with your agent"
								copiedLabel="Prompt copied"
								variant="default"
							/>
							<Link
								href={designHref({ kind: "remix", id: publication.id })}
								className={buttonVariants({ variant: "outline" })}
							>
								Use this design
								<ArrowUpRight data-icon="inline-end" />
							</Link>
							<p>
								Your photo, your name, your version.
								<br />
								No account needed to create.
							</p>
						</div>
					</section>
				</div>
			) : (
				<div className="community-detail-state">
					{error ? (
						<>
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
							<Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
								Try again
							</Button>
						</>
					) : (
						<output>
							<Spinner /> Preparing your badge…
						</output>
					)}
				</div>
			)}
		</main>
	);
}
