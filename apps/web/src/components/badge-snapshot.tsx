"use client";

import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData, PrismSide } from "@crafter-station/badge-studio-renderer";
import { useEffect, useRef, useState } from "react";

let drawing: Promise<void> = Promise.resolve();

export function BadgeSnapshot({
	data,
	side = "front",
	active = true,
}: {
	data: PrismBadgeData & { document: BadgeDesign };
	side?: PrismSide;
	active?: boolean;
}) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [visible, setVisible] = useState(false);
	const [rendered, setRendered] = useState("");
	const key = JSON.stringify([data, side]);
	useEffect(() => {
		const element = canvas.current;
		if (!element) return;
		const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!active || !visible) return;
		const controller = new AbortController();
		const timer = setTimeout(() => {
			drawing = drawing
				.catch(() => {})
				.then(async () => {
					if (controller.signal.aborted) return;
					const { drawBadgeFace, designAppearance } = await import(
						"@crafter-station/badge-studio-renderer"
					);
					if (controller.signal.aborted) return;
					const [person, face] = JSON.parse(key) as [
						PrismBadgeData & { document: BadgeDesign },
						PrismSide,
					];
					const buffer = document.createElement("canvas");
					await drawBadgeFace(
						buffer,
						person,
						designAppearance(person.document),
						face,
						controller.signal,
					);
					if (controller.signal.aborted || !canvas.current) return;
					const context = canvas.current.getContext("2d");
					if (!context) return;
					canvas.current.width = 384;
					canvas.current.height = 576;
					context.save();
					context.beginPath();
					context.roundRect(0, 0, 384, 576, 24);
					context.clip();
					context.drawImage(buffer, 0, 0, 384, 576);
					context.globalCompositeOperation = "destination-out";
					context.beginPath();
					context.roundRect(151, 21, 82, 13, 7);
					context.fill();
					context.restore();
					setRendered(key);
				})
				.catch(() => {});
		}, 100);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [key, active, visible]);

	return (
		<canvas
			ref={canvas}
			className="badge-snapshot"
			width={384}
			height={576}
			role="img"
			aria-label={`${data.document.name}, ${data.name}`}
			data-preview-ready={rendered === key}
			style={{ opacity: rendered === key ? 1 : 0 }}
		/>
	);
}
