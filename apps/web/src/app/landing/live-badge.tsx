"use client";

import type { demoBadgeForDesign } from "@/lib/studio-participant";
import { Suspense, lazy, useEffect, useRef, useState } from "react";

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
		if (!entered || !enabled || data?.document?.source === source) return;
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
	}, [entered, source, enabled, data?.document?.source]);

	return (
		<span ref={element} className="live-badge" data-badge-source={source}>
			{data?.document?.source === source && visible && enabled ? (
				<Suspense fallback={<img src={fallbackUrl} alt="" draggable={false} />}>
					<Material data={data} active={visible} fallbackUrl={fallbackUrl} side={side} />
				</Suspense>
			) : (
				<img src={fallbackUrl} alt="" draggable={false} loading="lazy" />
			)}
		</span>
	);
}
