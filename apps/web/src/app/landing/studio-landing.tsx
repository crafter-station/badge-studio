"use client";

import { ArrowDown, ArrowUpRight, Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { directions } from "./directions";
import { LiveBadge } from "./live-badge";
import { StudioOrbit } from "./studio-orbit";

export function StudioLanding() {
	const [category, setCategory] = useState("All styles");
	const [copied, setCopied] = useState(false);
	const command = "bunx badgio design create --style gtm --out badge.json";
	const filtered = directions.filter(
		(direction) => category === "All styles" || direction.category === category,
	);
	async function copy() {
		await navigator.clipboard.writeText(command);
		setCopied(true);
		setTimeout(() => setCopied(false), 1800);
	}
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
						<a href="/design" className="primary-action">
							Make your badge <ArrowUpRight />
						</a>
						<a href="#gallery" className="secondary-action">
							Find a little inspiration <ArrowDown />
						</a>
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
						Start in the editor or hand the design to your agent. The same editable document sits
						underneath every badge.
					</p>
					<a href="/docs" className="text-link">
						Meet the design toolkit <ArrowUpRight />
					</a>
				</div>
				<div className="terminal-example">
					<div className="terminal-header">
						<span>
							<i />
							<i />
							<i />
						</span>
						<span>studio / your next idea</span>
					</div>
					<div className="terminal-body">
						<p className="terminal-comment"># a starting point, ready to make your own</p>
						<code>
							<span>$ </span>
							{command}
						</code>
						<div className="terminal-result">
							<Check /> badge.json · 2 faces · editable layers
						</div>
					</div>
					<button type="button" className="terminal-copy" onClick={() => void copy()}>
						{copied ? <Check /> : <Copy />}
						{copied ? "Copied" : "Copy command"}
					</button>
					<p className="terminal-caption">
						Run badgio from your terminal. Bring the same editable document into the studio.
					</p>
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
