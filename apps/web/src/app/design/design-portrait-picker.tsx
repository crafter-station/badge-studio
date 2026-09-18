"use client";

import { Button } from "@/components/ui/button";
import { demoPortraitUrl, portraitStudyFor } from "@/lib/portrait-studies";
import { DesignPhotoPicker } from "./design-photo-picker";
import type { useDesignStudio } from "./use-design-studio";

export function DesignPortraitPicker({ studio }: { studio: ReturnType<typeof useDesignStudio> }) {
	const study = portraitStudyFor(studio.design.source);
	const pending = Boolean(studio.phase);
	return (
		<div className="design-portrait-picker">
			<DesignPhotoPicker
				src={studio.participant.portraitUrl}
				disabled={pending}
				onChange={studio.changePhoto}
			/>
			{studio.demoPortrait && study ? (
				<fieldset className="design-portrait-options" disabled={pending}>
					<legend>Retrato de muestra · Railly</legend>
					<div>
						{(
							[
								{ mode: "photo", url: demoPortraitUrl, label: "Foto base" },
								{ mode: "event", url: study.url, label: study.label },
							] as const
						).map((option) => (
							<label key={option.mode} data-selected={studio.portraitMode === option.mode}>
								<input
									type="radio"
									name="portrait-treatment"
									value={option.mode}
									checked={studio.portraitMode === option.mode}
									onChange={() => studio.changePortraitMode(option.mode)}
								/>
								<img src={option.url} alt="" loading="lazy" width={100} height={100} />
								<span>{option.label}</span>
							</label>
						))}
					</div>
					<p className="design-help">{study.description}</p>
					<p className="design-help">
						Creado con GPT Image 2 a partir de la foto de Railly y el badge original. Cambiar esta
						opción no genera otra imagen.
					</p>
				</fieldset>
			) : !studio.demoPortrait ? (
				<div>
					<p className="design-help">
						Tu foto se mantiene al cambiar de evento. Las versiones de muestra pertenecen a Railly.
					</p>
					<Button variant="ghost" size="sm" disabled={pending} onClick={studio.restoreDemoPortrait}>
						Volver al retrato de muestra
					</Button>
				</div>
			) : studio.design.source === "she-ships" ? (
				<p className="design-help">
					She Ships usa tu foto original. El filtro magenta, el recorte de ojos y los gráficos se
					componen en el editor.
				</p>
			) : null}
		</div>
	);
}
