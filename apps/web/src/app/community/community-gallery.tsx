"use client";

import { CommunityBadge } from "@/components/community-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CommunityPublication } from "@/lib/community-contract";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { communityRequest } from "../design/community-client";

export function CommunityGallery() {
	const [items, setItems] = useState<CommunityPublication[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [back, setBack] = useState(false);
	const load = useCallback(async (next?: string) => {
		setLoading(true);
		setError("");
		try {
			const result = await communityRequest<{
				items: CommunityPublication[];
				nextCursor: string | null;
			}>(next ? `?cursor=${encodeURIComponent(next)}` : "");
			setItems((current) => (next ? [...current, ...result.items] : result.items));
			setCursor(result.nextCursor);
		} catch (reason) {
			setError((reason as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		void load();
	}, [load]);
	return (
		<main className="community-page">
			<div className="community-heading">
				<p className="community-eyebrow">Made by the community</p>
				<h1>
					Someone imagined it.
					<br />
					You can make it yours.
				</h1>
				<p>Original badges, editable layers and a place for your next idea.</p>
				<div className="community-actions">
					<Link href="/#workflow" className={buttonVariants({ size: "sm" })}>
						Create with your agent
					</Link>
					<Link href="/gallery" className={buttonVariants({ size: "sm", variant: "ghost" })}>
						Explore the collection
					</Link>
					<Button size="sm" variant="outline" onClick={() => setBack(!back)}>
						{back ? "Show fronts" : "Flip all"}
					</Button>
				</div>
			</div>
			{!loading && !error && !items.length ? (
				<section className="community-empty">
					<h2>The first spark could be yours.</h2>
					<p>Create a badge with your agent, then ask to publish it here.</p>
					<Link href="/#workflow" className={buttonVariants({ size: "sm" })}>
						Create with your agent
					</Link>
				</section>
			) : null}
			<div className="community-grid">
				{items.map((item) => (
					<article className="community-item" key={item.id}>
						<Link
							href={item.url}
							className="community-card-preview"
							aria-label={`View ${item.snapshot.design.name}`}
						>
							<CommunityBadge publication={item} side={back ? "back" : "front"} />
						</Link>
						<h2>
							<Link href={item.url}>{item.snapshot.design.name}</Link>
						</h2>
						<p>
							By {item.authorName} ·{" "}
							{item.snapshot.design.front.layers.length + item.snapshot.design.back.layers.length}{" "}
							editable layers
						</p>
					</article>
				))}
			</div>
			{loading ? <output className="community-caption">Loading the community…</output> : null}
			{error ? (
				<div role="alert">
					<p className="community-error">{error}</p>
					<Button size="sm" variant="outline" onClick={() => void load()}>
						Try again
					</Button>
				</div>
			) : null}
			{cursor && !loading ? (
				<div className="community-actions">
					<Button variant="outline" onClick={() => void load(cursor)}>
						Load more
					</Button>
				</div>
			) : null}
		</main>
	);
}
