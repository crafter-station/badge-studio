"use client";

import { ArrowLeft, ArrowRight, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { orbitObjects } from "./directions";
import { LiveBadge } from "./live-badge";
import { orbitLiveIndices, orbitPosition, settleVelocity, tickIndex } from "./orbit-math";
import { createOrbitSound } from "./orbit-sound";

export function StudioOrbit() {
	const stage = useRef<HTMLFieldSetElement>(null);
	const objects = useRef<(HTMLButtonElement | null)[]>([]);
	const control = useRef({ nudge: (_direction: number) => {}, mute: (_muted: boolean) => {} });
	const [sound, setSound] = useState(true);
	const [liveIndices, setLiveIndices] = useState<number[]>([]);

	useEffect(() => {
		const element = stage.current;
		if (!element) return;
		const media = matchMedia("(prefers-reduced-motion: reduce)");
		const compact = matchMedia("(max-width: 639px), (max-height: 639px), (pointer: coarse)");
		let phase = -0.2;
		let velocity = 0;
		let target: number | undefined;
		let dragging = false;
		let pointer: number | undefined;
		let dragged = false;
		let auto = !media.matches;
		let muted = false;
		let width = element.clientWidth;
		let frameId = 0;
		let lastTime = 0;
		let lastX = 0;
		let lastMove = 0;
		let travel = 0;
		let visible = true;
		let previousTick = tickIndex(phase);
		let liveKey = "";
		let liveCompact: boolean | undefined;
		const soundEngine = createOrbitSound();
		function paint() {
			const degrees = ((phase * 180) / Math.PI + 36000) % 360;
			element?.style.setProperty("--orbit-angle", `${degrees}deg`);
			element?.setAttribute("data-ready", "true");
			objects.current.forEach((object, index) => {
				if (!object) return;
				const position = orbitPosition(phase, index, orbitObjects.length, width);
				object.style.transform = `translate3d(${position.x}px,${position.y}px,0) scale(${position.scale}) rotateZ(${position.rotation}deg) rotateY(${position.yaw}deg)`;
				object.style.filter = `brightness(${position.brightness})`;
				object.style.zIndex = String(position.z);
				object.style.setProperty("--light-x", `${50 - position.yaw * 1.2}%`);
			});
			if (
				compact.matches !== liveCompact ||
				(compact.matches && !dragging && Math.abs(velocity) < 0.5)
			) {
				liveCompact = compact.matches;
				const next = orbitLiveIndices(phase, orbitObjects.length, compact.matches);
				const key = next.join(",");
				if (key !== liveKey) {
					liveKey = key;
					setLiveIndices(next);
				}
			}
			const tick = tickIndex(phase);
			if (tick !== previousTick && !muted && !auto) soundEngine.tick(Math.abs(velocity));
			previousTick = tick;
		}
		function schedule() {
			if (!frameId && visible && !document.hidden) frameId = requestAnimationFrame(frame);
		}
		function frame(now: number) {
			frameId = 0;
			const seconds = Math.min((now - (lastTime || now)) / 1000, 0.04);
			lastTime = now;
			if (!dragging) {
				if (target !== undefined) {
					velocity += (target - phase) * 40 * seconds;
					velocity *= Math.exp(-9 * seconds);
					phase += velocity * seconds;
					if (Math.abs(target - phase) < 0.0003 && Math.abs(velocity) < 0.004) {
						phase = target;
						target = undefined;
						velocity = 0;
					}
				} else {
					phase += (auto ? 0.055 : velocity) * seconds;
					velocity = settleVelocity(velocity, seconds);
				}
			}
			paint();
			if (auto || dragging || target !== undefined || Math.abs(velocity) > 0.001) schedule();
		}
		function start(event: PointerEvent) {
			if (event.button !== 0 || pointer !== undefined) return;
			pointer = event.pointerId;
			dragging = true;
			dragged = false;
			travel = 0;
			auto = false;
			target = undefined;
			velocity = 0;
			lastX = event.clientX;
			lastMove = performance.now();
			element?.setAttribute("data-dragging", "true");
			if (!muted) void soundEngine.unlock().catch(() => setSound(false));
			schedule();
		}
		function move(event: PointerEvent) {
			if (!dragging || event.pointerId !== pointer) return;
			const now = performance.now();
			const delta = event.clientX - lastX;
			travel += Math.abs(delta);
			if (travel > 5) {
				dragged = true;
				element?.setPointerCapture(event.pointerId);
			}
			const gain = width < 600 ? 0.008 : 0.0045;
			phase += delta * gain;
			velocity = Math.max(
				-5,
				Math.min(5, (delta * gain) / Math.max((now - lastMove) / 1000, 0.008)),
			);
			lastX = event.clientX;
			lastMove = now;
			paint();
		}
		function end(event: PointerEvent) {
			if (!dragging || event.pointerId !== pointer) return;
			dragging = false;
			pointer = undefined;
			if (performance.now() - lastMove > 100 || media.matches) velocity = 0;
			element?.removeAttribute("data-dragging");
			if (element?.hasPointerCapture(event.pointerId))
				element.releasePointerCapture(event.pointerId);
			schedule();
		}
		function guardClick(event: MouseEvent) {
			if (dragged && event.detail !== 0) {
				event.preventDefault();
				event.stopPropagation();
				dragged = false;
			}
		}
		function nudge(direction: number) {
			auto = false;
			dragged = false;
			if (!muted) void soundEngine.unlock().catch(() => setSound(false));
			target = (target ?? phase) + direction * ((Math.PI * 2) / orbitObjects.length);
			if (media.matches) {
				phase = target;
				target = undefined;
				paint();
			}
			schedule();
		}
		function key(event: KeyboardEvent) {
			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();
				nudge(event.key === "ArrowLeft" ? -1 : 1);
			}
		}
		function visibility() {
			lastTime = 0;
			if (!document.hidden) schedule();
		}
		function reducedMotion() {
			auto = false;
			velocity = 0;
			schedule();
		}
		const resize = new ResizeObserver(() => {
			width = element.clientWidth;
			paint();
		});
		const intersection = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			lastTime = 0;
			if (visible) schedule();
		});
		resize.observe(element);
		intersection.observe(element);
		element.addEventListener("pointerdown", start);
		element.addEventListener("pointermove", move);
		window.addEventListener("pointerup", end);
		element.addEventListener("pointercancel", end);
		element.addEventListener("lostpointercapture", end);
		element.addEventListener("click", guardClick, true);
		element.addEventListener("keydown", key);
		document.addEventListener("visibilitychange", visibility);
		media.addEventListener("change", reducedMotion);
		compact.addEventListener("change", paint);
		control.current = {
			nudge,
			mute: (value) => {
				muted = value;
			},
		};
		paint();
		schedule();
		return () => {
			cancelAnimationFrame(frameId);
			resize.disconnect();
			intersection.disconnect();
			soundEngine.dispose();
			element.removeEventListener("pointerdown", start);
			element.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", end);
			element.removeEventListener("pointercancel", end);
			element.removeEventListener("lostpointercapture", end);
			element.removeEventListener("click", guardClick, true);
			element.removeEventListener("keydown", key);
			document.removeEventListener("visibilitychange", visibility);
			media.removeEventListener("change", reducedMotion);
			compact.removeEventListener("change", paint);
		};
	}, []);

	return (
		<section className="orbit-section" aria-label="Interactive collection">
			<fieldset
				ref={stage}
				className="orbit-stage"
				aria-label="Rotate the collection"
				aria-describedby="orbit-hint"
			>
				<div className="orbit-center">
					{orbitObjects.map((object, index) => (
						<button
							type="button"
							key={object.id}
							ref={(node) => {
								objects.current[index] = node;
							}}
							className="orbit-object object-badge"
							data-physical={object.physical}
							aria-label={`${object.label} · open in editor`}
							onClick={() => {
								location.href = `/design?style=${object.id}`;
							}}
						>
							<LiveBadge source={object.id} enabled={liveIndices.includes(index)} />
						</button>
					))}
				</div>
			</fieldset>
			<div className="orbit-controls">
				<div className="orbit-arrows">
					<button type="button" aria-label="Rotate left" onClick={() => control.current.nudge(-1)}>
						<ArrowLeft />
					</button>
					<button type="button" aria-label="Rotate right" onClick={() => control.current.nudge(1)}>
						<ArrowRight />
					</button>
				</div>
				<p id="orbit-hint">
					Give it a spin <span aria-hidden="true">↔</span>
					<span className="sr-only">Drag horizontally or use the left and right arrow keys.</span>
				</p>
				<button
					type="button"
					className="orbit-audio"
					aria-label={sound ? "Mute mechanical ticks" : "Enable mechanical ticks"}
					aria-pressed={sound}
					onClick={() => {
						control.current.mute(sound);
						setSound(!sound);
					}}
				>
					{sound ? <SpeakerHigh /> : <SpeakerSlash />} <span>Sound {sound ? "on" : "off"}</span>
				</button>
			</div>
		</section>
	);
}
