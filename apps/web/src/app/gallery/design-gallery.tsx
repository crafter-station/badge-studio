"use client";

import { useParticipantProfile } from "@/components/participant-profile-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";
import { LiveBadge } from "../landing/live-badge";

type Direction = {
	id: string;
	name: string;
	description: string;
	category: string;
	custom: boolean;
};

export function DesignGallery({ directions }: { directions: Direction[] }) {
	const profile = useParticipantProfile();
	const [category, setCategory] = useState("All");
	const [flipped, setFlipped] = useState<string[]>([]);
	const shown = directions.filter((item) => category === "All" || item.category === category);
	const allBack = shown.every((item) => flipped.includes(item.id));

	return (
		<main className="badge-gallery">
			<section className="gallery-heading">
				<p className="gallery-eyebrow">The collection · {directions.length} art directions</p>
				<h1>
					{profile.identity.started ? "Your photo. Every possibility." : "Find your kind of badge."}
				</h1>
				<p>
					{profile.identity.started
						? "One profile across the collection. Choose your favorite, or update your photo in the studio."
						: "From real gatherings to new possibilities. Pick a starting point and make it yours."}
				</p>
			</section>
			<div className="gallery-controls">
				<Link href="/community" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
					Made by the community ↗
				</Link>
				<ToggleGroup
					aria-label="Filter gallery"
					value={[category]}
					onValueChange={(values) => {
						if (values[0]) setCategory(values[0]);
					}}
					variant="outline"
					size="sm"
					spacing={0}
				>
					{["All", "Events", "Materials", "Studies"].map((value) => (
						<ToggleGroupItem key={value} value={value}>
							{value}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<Button
					size="sm"
					variant="ghost"
					onClick={() =>
						setFlipped((current) =>
							allBack
								? current.filter((id) => !shown.some((item) => item.id === id))
								: [...new Set([...current, ...shown.map((item) => item.id)])],
						)
					}
				>
					<ArrowsClockwise data-icon="inline-start" />
					{allBack ? "Show fronts" : "Flip all"}
				</Button>
			</div>
			<section className="gallery-grid" aria-label={`${shown.length} badge styles`}>
				{shown.map((direction) => {
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
