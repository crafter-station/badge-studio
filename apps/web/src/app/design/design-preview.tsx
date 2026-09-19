"use client";

import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import {
	type PrismBadgeData,
	designAppearance,
	drawStylePreview,
} from "@crafter-station/badge-studio-renderer";
import { useEffect, useRef, useState } from "react";
import { designAssetUrl } from "./design-client";

export function DesignPreview({ design, data }: { design: BadgeDesign; data: PrismBadgeData }) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [failed, setFailed] = useState(false);
	const key = JSON.stringify([design, data]);
	useEffect(() => {
		const abort = new AbortController();
		const [document, participant] = JSON.parse(key) as [BadgeDesign, PrismBadgeData];
		setFailed(false);
		if (canvas.current)
			void drawStylePreview(
				canvas.current,
				{
					...participant,
					document,
					artworkUrl: document.artwork?.assetId
						? designAssetUrl(document.artwork.assetId)
						: undefined,
				},
				designAppearance(document),
				abort.signal,
			).catch(() => {
				if (!abort.signal.aborted) setFailed(true);
			});
		return () => abort.abort();
	}, [key]);
	return (
		<span className="design-preview-art">
			<canvas ref={canvas} width={300} height={280} tabIndex={-1} aria-hidden="true" />
			{failed ? <small>Preview unavailable</small> : null}
		</span>
	);
}
