"use client";

import { Button } from "@/components/ui/button";
import { Eye, EyeSlash, LockSimple, LockSimpleOpen } from "@phosphor-icons/react";

export function DesignLayerActions({
	label,
	visible,
	locked,
	disabled,
	onVisibility,
	onLock,
}: {
	label: string;
	visible: boolean;
	locked: boolean;
	disabled: boolean;
	onVisibility: () => void;
	onLock: () => void;
}) {
	return (
		<div className="design-layer-actions">
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={disabled}
				aria-label={`${visible ? "Hide" : "Show"} ${label}`}
				aria-pressed={visible}
				title={visible ? "Hide layer" : "Show layer"}
				onClick={onVisibility}
			>
				{visible ? <Eye /> : <EyeSlash />}
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={disabled}
				aria-label={`${locked ? "Unlock" : "Lock"} ${label}`}
				aria-pressed={locked}
				title={locked ? "Unlock to edit" : "Protect this layer while editing and generating"}
				onClick={onLock}
			>
				{locked ? <LockSimple weight="fill" /> : <LockSimpleOpen />}
			</Button>
		</div>
	);
}
