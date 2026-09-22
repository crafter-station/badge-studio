"use client";

import { CommunityBadge } from "@/components/community-badge";
import { useParticipantProfile } from "@/components/participant-profile-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CommunityPublication } from "@/lib/community-contract";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { cn } from "cn";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { communityRequest } from "../design/community-client";
import { designHref } from "../design/design-location";
import { LiveBadge } from "../landing/live-badge";

export type GalleryFilter = "all" | "curated" | "community";

type Direction = {
	id: string;
	name: string;
	description: string;
	category: string;
	custom: boolean;
};

const filters: { value: GalleryFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "curated", label: "Curated" },
	{ value: "community", label: "Community" },
];

export function DesignGallery({
	directions,
	initialFilter = "all",
}: {
	directions: Direction[];
	initialFilter?: GalleryFilter;
}) {
	const profile = useParticipantProfile();
	const router = useRouter();
	const pathname = usePathname();
	const [filter, setFilter] = useState<GalleryFilter>(initialFilter);
	const [flipped, setFlipped] = useState<string[]>([]);
	const [community, setCommunity] = useState<CommunityPublication[]>([]);
	const [loadingCommunity, setLoadingCommunity] = useState(true);
	const [communityError, setCommunityError] = useState("");

	const loadCommunity = useCallback(async () => {
		setLoadingCommunity(true);
		setCommunityError("");
		try {
			const result = await communityRequest<{
				items: CommunityPublication[];
				nextCursor: string | null;
			}>("?limit=24");
			setCommunity(result.items);
		} catch (reason) {
			setCommunityError((reason as Error).message);
		} finally {
			setLoadingCommunity(false);
		}
	}, []);

	useEffect(() => {
		void loadCommunity();
	}, [loadCommunity]);

	useEffect(() => {
		setFilter(initialFilter);
	}, [initialFilter]);

	const showCurated = filter === "all" || filter === "curated";
	const showCommunity = filter === "all" || filter === "community";
	const curatedShown = showCurated ? directions : [];
	const communityShown = showCommunity ? community : [];
	const shownIds = [
		...curatedShown.map((item) => item.id),
		...communityShown.map((item) => `community:${item.id}`),
	];
	const allBack = shownIds.length > 0 && shownIds.every((id) => flipped.includes(id));
	const total = directions.length + community.length;

	const selectFilter = (value: GalleryFilter) => {
		setFilter(value);
		const href = value === "all" ? pathname : `${pathname}?filter=${value}`;
		router.replace(href, { scroll: false });
	};

	return (
		<main className="badge-gallery">
			<section className="gallery-heading">
				<p className="gallery-eyebrow">The collection · {total || directions.length} designs</p>
				<h1>
					{profile.identity.started ? "Your photo. Every possibility." : "Find your kind of badge."}
				</h1>
				<p>
					{profile.identity.started
						? "One profile across curated styles and community creations. Choose a favorite, or update your photo in the studio."
						: "Curated art directions and community badges in one place. Pick a starting point and make it yours."}
				</p>
			</section>
			<div className="gallery-controls">
				<ToggleGroup
					aria-label="Filter gallery"
					value={[filter]}
					onValueChange={(values) => {
						const next = values[0] as GalleryFilter | undefined;
						if (next) selectFilter(next);
					}}
					variant="outline"
					size="sm"
					spacing={0}
				>
					{filters.map((item) => (
						<ToggleGroupItem key={item.value} value={item.value}>
							{item.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<Button
					size="sm"
					variant="ghost"
					onClick={() =>
						setFlipped((current) =>
							allBack
								? current.filter((id) => !shownIds.includes(id))
								: [...new Set([...current, ...shownIds])],
						)
					}
				>
					<ArrowsClockwise data-icon="inline-start" />
					{allBack ? "Show fronts" : "Flip all"}
				</Button>
			</div>
			{showCommunity && communityError ? (
				<div className="gallery-status" role="alert">
					<p>{communityError}</p>
					<Button size="sm" variant="outline" onClick={() => void loadCommunity()}>
						Try again
					</Button>
				</div>
			) : null}
			{showCommunity && loadingCommunity && !community.length ? (
				<output className="gallery-status">Loading community badges…</output>
			) : null}
			{filter === "community" && !loadingCommunity && !communityError && !community.length ? (
				<section className="gallery-empty">
					<h2>The first spark could be yours.</h2>
					<p>Create a badge with your agent, then ask to publish it here.</p>
					<Link href="/#workflow" className={buttonVariants({ size: "sm" })}>
						Create with your agent
					</Link>
				</section>
			) : null}
			<section
				className="gallery-grid"
				aria-label={`${curatedShown.length + communityShown.length} badge styles`}
			>
				{curatedShown.map((direction) => {
					const back = flipped.includes(direction.id);
					return (
						<article className="gallery-item" key={direction.id}>
							<button
								type="button"
								className="gallery-preview"
								aria-label={`Flip ${direction.name}`}
								aria-pressed={back}
								onClick={() =>
									setFlipped((current) =>
										back ? current.filter((id) => id !== direction.id) : [...current, direction.id],
									)
								}
							>
								<LiveBadge
									source={direction.id}
									custom={direction.custom}
									side={back ? "back" : "front"}
								/>
								<span className="gallery-face">{back ? "Back" : "Front"}</span>
							</button>
							<div className="gallery-item-heading">
								<h2>{direction.name}</h2>
								<Link
									href={`/design?style=${direction.id}`}
									className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
									aria-label={`Edit ${direction.name}`}
								>
									Use style
								</Link>
							</div>
							<p>{direction.description}</p>
						</article>
					);
				})}
				{communityShown.map((item) => {
					const flipId = `community:${item.id}`;
					const back = flipped.includes(flipId);
					const name = item.snapshot.design.name;
					const layers =
						item.snapshot.design.front.layers.length + item.snapshot.design.back.layers.length;
					return (
						<article className="gallery-item" key={flipId}>
							<button
								type="button"
								className="gallery-preview"
								aria-label={`Flip ${name}`}
								aria-pressed={back}
								onClick={() =>
									setFlipped((current) =>
										back ? current.filter((id) => id !== flipId) : [...current, flipId],
									)
								}
							>
								<CommunityBadge publication={item} side={back ? "back" : "front"} />
								<span className="gallery-face">{back ? "Back" : "Front"}</span>
							</button>
							<div className="gallery-item-heading">
								<h2>
									<Link href={item.url}>{name}</Link>
								</h2>
								<Link
									href={designHref({ kind: "remix", id: item.id })}
									className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
									aria-label={`Use ${name}`}
								>
									Use design
								</Link>
							</div>
							<p>
								By {item.authorName} · {layers} editable layers
							</p>
						</article>
					);
				})}
			</section>
			<footer className="gallery-footer">
				<p>Your photo. Your event. Every layer is yours.</p>
				<Link href="/design" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
					Open studio
				</Link>
			</footer>
		</main>
	);
}
