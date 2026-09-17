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
				aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label}`}
				aria-pressed={visible}
				title={visible ? "Ocultar capa" : "Mostrar capa"}
				onClick={onVisibility}
			>
				{visible ? <Eye /> : <EyeSlash />}
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={disabled}
				aria-label={`${locked ? "Desbloquear" : "Bloquear"} ${label}`}
				aria-pressed={locked}
				title={locked ? "Desbloquear para editar" : "Proteger esta capa al editar y generar"}
				onClick={onLock}
			>
				{locked ? <LockSimple weight="fill" /> : <LockSimpleOpen />}
			</Button>
		</div>
	);
}
