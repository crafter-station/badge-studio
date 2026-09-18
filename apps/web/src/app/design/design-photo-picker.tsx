"use client";

import { Button } from "@/components/ui/button";
import { Image } from "@phosphor-icons/react";
import { useId, useRef } from "react";

export function DesignPhotoPicker({
	src,
	disabled,
	onChange,
	artwork = false,
}: {
	src?: string;
	disabled: boolean;
	onChange: (file: File) => Promise<unknown>;
	artwork?: boolean;
}) {
	const input = useRef<HTMLInputElement>(null);
	const id = useId();
	const label = artwork ? "Cambiar ilustración" : "Cambiar foto";
	return (
		<div className="design-photo-picker">
			{src ? <img src={src} alt={artwork ? "Ilustración actual" : "Foto actual"} /> : null}
			<div>
				<Button
					variant="outline"
					size="sm"
					disabled={disabled}
					onClick={() => input.current?.click()}
				>
					<Image data-icon="inline-start" /> {label}
				</Button>
				<p className="design-help">
					{artwork
						? "Se reemplaza en las capas de ilustración."
						: "Se actualiza en todos los retratos."}
				</p>
			</div>
			<input
				id={id}
				ref={input}
				type="file"
				className="sr-only"
				aria-label={label}
				accept="image/png,image/jpeg,image/webp"
				disabled={disabled}
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void onChange(file);
					event.target.value = "";
				}}
			/>
		</div>
	);
}
