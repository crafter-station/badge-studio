"use client";

import { loadBadgeFonts } from "@/lib/badge-fonts";
import type { CommunityPublication } from "@/lib/community-contract";
import { publicationData } from "@/lib/community-contract";
import { useEffect, useState } from "react";
import { BadgeSnapshot } from "./badge-snapshot";
import { Button } from "./ui/button";

export function CommunityBadge({
	publication,
	side = "front",
	onReady,
}: {
	publication: CommunityPublication;
	side?: "front" | "back";
	onReady?: () => void;
}) {
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		let mounted = true;
		if (attempt) setReady(false);
		void loadBadgeFonts()
			.then(() => {
				if (mounted) setReady(true);
			})
			.catch(() => {
				if (mounted) {
					setReady(false);
					setFailed(true);
				}
			});
		return () => {
			mounted = false;
		};
	}, [attempt]);
	return (
		<span className="community-badge">
			{failed ? (
				<span className="community-loading">
					No pudimos cargar esta cara.
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setFailed(false);
							setAttempt((value) => value + 1);
						}}
					>
						Reintentar
					</Button>
				</span>
			) : ready ? (
				<BadgeSnapshot
					key={attempt}
					data={{ ...publicationData(publication), document: publication.snapshot.design }}
					side={side}
					eager={Boolean(onReady)}
					onReady={onReady}
					onError={() => setFailed(true)}
				/>
			) : (
				<span className="community-loading">Preparando badge…</span>
			)}
		</span>
	);
}
