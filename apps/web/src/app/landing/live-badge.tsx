"use client";

import { BadgeSnapshot } from "@/components/badge-snapshot";
import { useParticipantProfile } from "@/components/participant-profile-provider";
import { applyParticipantIdentity } from "@/lib/participant-profile";
import type { demoBadgeForDesign } from "@/lib/studio-participant";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

const Material = lazy(() =>
	import("@crafter-station/badge-studio-renderer").then((module) => ({
		default: module.PrismPreview,
	})),
);

const fonts = [
	'700 100px "Andes Brand"',
	'700 100px "Andes Display"',
	'400 24px "Andes Mono"',
	'400 60px "Next Craft Script"',
	'700 72px "Next Craft Mono"',
	'400 30px "Next Craft Pixel"',
];

export function LiveBadge({
	source,
	enabled = true,
	side = "front",
	custom = false,
}: {
	source: string;
	enabled?: boolean;
	side?: "front" | "back";
	custom?: boolean;
}) {
	const element = useRef<HTMLSpanElement>(null);
	const profile = useParticipantProfile();
	const [visible, setVisible] = useState(false);
	const [data, setData] = useState<ReturnType<typeof demoBadgeForDesign>>();
	const [entered, setEntered] = useState(false);
	const fallbackUrl = custom
		? `/prism/showcase/previews/${source}-${side}.webp`
		: side === "back"
			? `/prism/collection/previews/${source}-back.webp`
			: `/prism/collection/materials/${source}.webp`;
	useEffect(() => {
		const target = element.current;
		if (!target) return;
		const observer = new IntersectionObserver(([entry]) => {
			setVisible(entry.isIntersecting);
			if (entry.isIntersecting) setEntered(true);
		});
		observer.observe(target);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!entered || (!enabled && !profile.identity.started) || data?.document?.source === source)
			return;
		let disposed = false;
		void Promise.all([
			import("@crafter-station/badge-studio-design/catalog"),
			import("@/lib/studio-participant"),
			Promise.all(fonts.map((font) => document.fonts.load(font))),
		])
			.then(([catalog, { demoBadgeForDesign }]) => {
				const design = catalog.findDesign(source);
				if (!disposed) setData(design ? demoBadgeForDesign(design) : undefined);
			})
			.catch(() => {
				if (!disposed) setData(undefined);
			});
		return () => {
			disposed = true;
		};
	}, [entered, source, enabled, data?.document?.source, profile.identity.started]);

	const personalized = useMemo(
		() =>
			data && profile.identity.started
				? applyParticipantIdentity(data, profile.identity, profile.portraitUrl)
				: data,
		[data, profile.identity, profile.portraitUrl],
	);
	const fallback =
		!profile.ready || (profile.identity.started && !personalized) ? (
			<span className="live-badge-placeholder" />
		) : profile.identity.started && personalized ? (
			<BadgeSnapshot data={personalized} side={side} active={visible} />
		) : (
			<img src={fallbackUrl} alt="" draggable={false} loading="lazy" />
		);

	return (
		<span ref={element} className="live-badge" data-badge-source={source}>
			{profile.ready && personalized?.document?.source === source && visible && enabled ? (
				<Suspense fallback={fallback}>
					<Material
						data={personalized}
						active={visible}
						fallbackUrl={fallbackUrl}
						fallback={fallback}
						side={side}
					/>
				</Suspense>
			) : (
				fallback
			)}
		</span>
	);
}
