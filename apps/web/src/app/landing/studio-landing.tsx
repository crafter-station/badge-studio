"use client";

import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { AgentSetup } from "../../components/agent-setup";
import { Button } from "../../components/ui/button";
import { agentFirstPrompt } from "../../lib/agent-setup";
import { directions } from "./directions";
import { LiveBadge } from "./live-badge";
import { StudioOrbit } from "./studio-orbit";

export function StudioLanding() {
	const [category, setCategory] = useState("All styles");
	const filtered = directions.filter(
		(direction) => category === "All styles" || direction.category === category,
	);
	return (
		<main className="studio-landing">
			<a className="skip-link" href="#intro">
				Skip to introduction
			</a>
			<div className="landing-hero">
				<StudioOrbit />
				<section id="intro" className="landing-intro">
					<p className="intro-note">
						<span /> A playground for things that feel like you.
					</p>
					<h1>
						Make something
						<br />
						<em>worth keeping.</em>
					</h1>
					<p className="intro-description">
						A badge can be so much more than a name.
						<br />
						Find your direction. Make it yours. Let it move.
					</p>
					<div className="intro-actions">
						<Button variant="default" nativeButton={false} render={<Link href="#workflow" />}>
							Create with your agent <ArrowDown data-icon="inline-end" />
						</Button>
						<Button variant="outline" nativeButton={false} render={<Link href="/design" />}>
							Open the editor <ArrowUpRight data-icon="inline-end" />
						</Button>
						<Button variant="ghost" nativeButton={false} render={<Link href="#gallery" />}>
							Find a little inspiration <ArrowDown data-icon="inline-end" />
						</Button>
					</div>
					<div className="hero-footnote">
						<span>Made for people.</span>
						<span>Open to possibilities.</span>
					</div>
				</section>
			</div>
			<section id="gallery" className="landing-gallery">
				<div className="section-heading">
					<div>
						<span className="section-kicker">The starting points</span>
						<h2>Which one feels like you?</h2>
					</div>
					<p>
						Real designs from the studio.
						<br />
						Every layer is yours to change.
					</p>
				</div>
				<fieldset className="gallery-filters" aria-label="Filter styles">
					{["All styles", "Materials", "Editorial", "Retro", "Experimental"].map((value) => (
						<button
							type="button"
							key={value}
							aria-pressed={category === value}
							onClick={() => setCategory(value)}
						>
							{value}
							{value === "All styles" ? (
								<span>{String(directions.length).padStart(2, "0")}</span>
							) : null}
						</button>
					))}
				</fieldset>
				<div key={category} className="direction-grid">
					{filtered.map((direction, index) => (
						<a key={direction.id} href={`/design?style=${direction.id}`} className="direction-tile">
							<div className="direction-art">
								<span className="direction-index">
									{String(directions.indexOf(direction) + 1).padStart(2, "0")}
								</span>
								<div
									className="direction-material"
									style={{ "--rest-angle": `${index % 2 ? 4 : -4}deg` } as React.CSSProperties}
								>
									<LiveBadge source={direction.id} />
								</div>
								<span className="direction-open">
									<ArrowUpRight />
								</span>
							</div>
							<div className="direction-caption">
								<h3>{direction.name}</h3>
								<p>{direction.note}</p>
							</div>
						</a>
					))}
				</div>
				<p className="gallery-endnote">A style is a starting point, never a finish line.</p>
			</section>
			<section id="workflow" className="landing-workflow">
				<div>
					<span className="section-kicker">Beyond the canvas</span>
					<h2>
						Your style.
						<br />
						<em>Your workflow.</em>
					</h2>
					<p>
						Install the CLI and skill. Give your agent a photo and an idea. Keep refining your badge
						in the same conversation, with a live canvas right beside you.
					</p>
					<a href="/docs" className="text-link">
						Meet the design toolkit <ArrowUpRight />
					</a>
				</div>
				<div className="agent-workflow">
					<AgentSetup />
					<p className="agent-first-prompt">{agentFirstPrompt}</p>
				</div>
			</section>
			<footer className="landing-footer">
				<a className="studio-wordmark" href="/">
					<span className="studio-mark" aria-hidden="true">
						✳
					</span>{" "}
					Badge Studio.
				</a>
				<a href="/design">Find your direction ↗</a>
				<a href="https://crafter.run">
					By Crafter Station <ArrowUpRight />
				</a>
			</footer>
		</main>
	);
}
