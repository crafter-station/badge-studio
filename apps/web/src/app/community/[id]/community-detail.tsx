"use client";

import { CommunityBadge } from "@/components/community-badge";
import { buttonVariants } from "@/components/ui/button";
import type { CommunityPublication } from "@/lib/community-contract";
import Link from "next/link";
import { useEffect, useState } from "react";
import { communityRequest } from "../../design/community-client";

export function CommunityDetail({ id }: { id: string }) {
	const [publication, setPublication] = useState<CommunityPublication>();
	const [error, setError] = useState("");
	useEffect(() => {
		const controller = new AbortController();
		void communityRequest<CommunityPublication>(`/${id}`, undefined, undefined, controller.signal)
			.then(setPublication)
			.catch((reason) => {
				if (!controller.signal.aborted) setError((reason as Error).message);
			});
		return () => controller.abort();
	}, [id]);
	return (
		<main className="community-page">
			<Link href="/community" className="community-caption">
				← Community
			</Link>
			{publication ? (
				<>
					<div className="community-heading">
						<p className="community-eyebrow">
							By {publication.authorName} · Version {publication.version}
						</p>
						<h1>{publication.snapshot.design.name}</h1>
						<p>{publication.snapshot.design.description}</p>
					</div>
					<div className="community-faces">
						<CommunityBadge publication={publication} />
						<CommunityBadge publication={publication} side="back" />
					</div>
					<p className="community-caption">
						{publication.snapshot.participant.name} · {publication.snapshot.design.event}
					</p>
					<div className="community-actions">
						<Link href="/#workflow" className={buttonVariants({ size: "sm" })}>
							Create with your agent
						</Link>
						<Link
							href={`/design?remix=${publication.id}`}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							Use this design
						</Link>
					</div>
					<p className="community-caption">
						Use the layout with your own photo and name. The original stays here.
					</p>
				</>
			) : error ? (
				<p className="community-error" role="alert">
					{error}
				</p>
			) : (
				<output>Loading badge…</output>
			)}
		</main>
	);
}
