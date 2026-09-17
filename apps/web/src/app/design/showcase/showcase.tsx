"use client";

import { ArrowLeft, ArrowUpRight, ArrowsClockwise } from "@phosphor-icons/react";
import { useState } from "react";

const directions = [
	{
		id: "herbario-azul",
		name: "Herbario azul",
		note: "Botánica · cianotipia · archivo",
		color: "#8eaaba",
		idea: "Una credencial botánica de museo: cianotipia sobre papel marfil envejecido, helechos, retrato en arco y tipografía serif editorial.",
	},
	{
		id: "frecuencia-acida",
		name: "Frecuencia ácida",
		note: "Club · órbitas · tinta neón",
		color: "#d4ff00",
		idea: "Un pase de club de artes electrónicas: negro y chartreuse, letras condensadas enormes, órbitas finas, retrato monocromo y un reverso técnico.",
	},
	{
		id: "terracota-postal",
		name: "Terracota postal",
		note: "Collage · papel rasgado · residencia",
		color: "#d98d67",
		idea: "Una residencia artística mediterránea: collage de papel rasgado, terracota y crema, fotografía cálida inclinada, serif cursiva y reverso de postal.",
	},
	{
		id: "opalo-lunar",
		name: "Ópalo lunar",
		note: "Cine · vidrio · luz refractada",
		color: "#c9bfdf",
		idea: "Un festival de cine y arte lumínico: vidrio opalino, luz lavanda refractada, retrato etéreo, serif monumental y una placa de exposición al reverso.",
	},
	{
		id: "radio-risografica",
		name: "Radio risográfica",
		note: "Radio · geometría · risografía",
		color: "#e98162",
		idea: "Un festival de radio comunitaria: impresión risográfica crema, ciruela y naranja, círculos, diagonales, recorte fotográfico redondo y un reverso ON AIR.",
	},
];

export function DesignShowcase() {
	const [flipped, setFlipped] = useState<string[]>([]);
	const [idea, setIdea] = useState<string>();
	const allBack = flipped.length === directions.length;
	return (
		<main className="badge-showcase" lang="es">
			<header className="showcase-nav">
				<a href="/design">
					Badge <span>/ studio</span>
				</a>
				<a href="/design">
					<ArrowLeft aria-hidden="true" /> Volver al editor
				</a>
			</header>
			<section className="showcase-heading">
				<div>
					<p className="showcase-eyebrow">EXPLORACIONES 001 / 005</p>
					<h1>Una foto. Cinco mundos.</h1>
					<p>Creados con el estudio. Elige uno y hazlo tuyo.</p>
				</div>
				<button
					type="button"
					onClick={() => setFlipped(allBack ? [] : directions.map((d) => d.id))}
				>
					<ArrowsClockwise aria-hidden="true" /> {allBack ? "Ver los frentes" : "Voltear todos"}
				</button>
			</section>
			<section className="showcase-grid" aria-label="Cinco direcciones originales">
				{directions.map((direction, index) => {
					const back = flipped.includes(direction.id);
					return (
						<article className="showcase-item" key={direction.id}>
							<div className="showcase-index">
								<span>0{index + 1}</span>
								<span style={{ color: direction.color }}>{back ? "REVERSO" : "FRENTE"}</span>
							</div>
							<button
								type="button"
								className="showcase-flip"
								aria-label={`Voltear ${direction.name}`}
								aria-pressed={back}
								onClick={() =>
									setFlipped((current) =>
										back ? current.filter((id) => id !== direction.id) : [...current, direction.id],
									)
								}
							>
								<span className="showcase-card" data-back={back}>
									<img
										className="showcase-front"
										src={`/prism/showcase/previews/${direction.id}-front.webp`}
										width={512}
										height={768}
										alt={`${direction.name}, frente con retrato de Railly Hugo`}
									/>
									<img
										className="showcase-back"
										src={`/prism/showcase/previews/${direction.id}-back.webp`}
										width={512}
										height={768}
										alt={`${direction.name}, reverso con rol y QR`}
									/>
								</span>
								<span className="showcase-flip-hint">
									<ArrowsClockwise aria-hidden="true" /> Voltear
								</span>
							</button>
							<h2>{direction.name}</h2>
							<p className="showcase-note">{direction.note}</p>
							<div className="showcase-item-actions">
								<a href={`/design?style=${direction.id}`}>
									Ver en vivo y editar <ArrowUpRight aria-hidden="true" />
								</a>
								<button
									type="button"
									aria-expanded={idea === direction.id}
									onClick={() => setIdea(idea === direction.id ? undefined : direction.id)}
								>
									Idea inicial
								</button>
							</div>
							{idea === direction.id ? <p className="showcase-idea">{direction.idea}</p> : null}
						</article>
					);
				})}
			</section>
			<footer className="showcase-footer">
				<p>Tu foto, tu nombre, tu evento. Cada dirección es un punto de partida.</p>
				<a href="/design">
					Crear mi propia dirección <ArrowUpRight aria-hidden="true" />
				</a>
			</footer>
		</main>
	);
}
