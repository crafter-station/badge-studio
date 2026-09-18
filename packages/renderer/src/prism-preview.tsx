"use client";

import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import { useEffect, useRef, useState } from "react";
import { designAppearance } from "./design";
import type { StudioController, StudioOptions } from "./renderer";
import type { PrismBadgeData, PrismSide, PrismStatus } from "./types";

export function PrismPreview({
	data,
	active,
	fallbackUrl,
	side = "front",
}: {
	data: PrismBadgeData & { document: BadgeDesign };
	active: boolean;
	fallbackUrl: string;
	side?: PrismSide;
}) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const controller = useRef<StudioController | null>(null);
	const visible = useRef(active);
	visible.current = active;
	const [status, setStatus] = useState<PrismStatus>("loading");
	const appearance = designAppearance(data.document);
	const options: StudioOptions = {
		finish: ["crystal", "opal", "obsidian"].indexOf(appearance.finish),
		spectral: 0.66,
		motion: appearance.motion !== "paused",
		fluid: appearance.motion === "fluid",
		side,
		flat: true,
		active,
		dpr: 1.5,
	};
	const current = useRef(options);
	current.current = options;

	useEffect(() => {
		const element = canvas.current;
		if (!element) return;
		let disposed = false;
		let instance: StudioController | undefined;
		setStatus("loading");
		void import("./renderer")
			.then(({ startPrism }) => {
				if (disposed) return;
				instance = startPrism(
					element,
					{ ...current.current, active: visible.current },
					data,
					designAppearance(data.document),
					"/prism",
					false,
					() => {
						if (!disposed) setStatus("ready");
					},
					() => {
						if (!disposed) setStatus("fallback");
					},
				);
				controller.current = instance;
			})
			.catch(() => {
				if (!disposed) setStatus("fallback");
			});
		return () => {
			disposed = true;
			instance?.dispose();
			controller.current = null;
		};
	}, [data]);

	useEffect(() => {
		controller.current?.setOptions({ ...current.current, active, side });
	}, [active, side]);

	return (
		<span data-material-status={status} data-material-active={active}>
			{status !== "ready" ? <img src={fallbackUrl} alt="" draggable={false} /> : null}
			<canvas
				ref={canvas}
				tabIndex={-1}
				aria-hidden="true"
				style={{ opacity: status === "ready" ? 1 : 0 }}
			/>
		</span>
	);
}
