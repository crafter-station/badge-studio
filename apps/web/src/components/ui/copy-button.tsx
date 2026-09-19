"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy } from "@phosphor-icons/react";
import { cn } from "cn";
import { type ComponentProps, useEffect, useRef, useState } from "react";

export function CopyButton({
	value,
	label = "Copy",
	copiedLabel = "Copied",
	variant = "outline",
	size,
}: {
	value: string;
	label?: string;
	copiedLabel?: string;
	variant?: ComponentProps<typeof Button>["variant"];
	size?: ComponentProps<typeof Button>["size"];
}) {
	const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	async function copy() {
		if (timer.current) clearTimeout(timer.current);
		try {
			await navigator.clipboard.writeText(value);
			setStatus("copied");
			timer.current = setTimeout(() => setStatus("idle"), 2000);
		} catch {
			setStatus("error");
		}
	}
	return (
		<div className="inline-flex max-w-full flex-col items-start gap-2">
			<Button type="button" variant={variant} size={size} onClick={copy}>
				{status === "copied" ? (
					<Check data-icon="inline-start" />
				) : (
					<Copy data-icon="inline-start" />
				)}
				<span className="grid">
					<span
						className={cn("col-start-1 row-start-1", status === "copied" && "invisible")}
						aria-hidden={status === "copied"}
					>
						{label}
					</span>
					<span
						className={cn("col-start-1 row-start-1", status !== "copied" && "invisible")}
						aria-hidden={status !== "copied"}
					>
						{copiedLabel}
					</span>
				</span>
			</Button>
			<output className={status === "error" ? "text-xs text-destructive" : "sr-only"}>
				{status === "error"
					? "Could not copy. Select and copy the text manually."
					: status === "copied"
						? copiedLabel
						: ""}
			</output>
			{status === "error" ? (
				<Textarea
					aria-label="Text to copy manually"
					readOnly
					value={value}
					rows={4}
					onFocus={(event) => event.currentTarget.select()}
				/>
			) : null}
		</div>
	);
}
