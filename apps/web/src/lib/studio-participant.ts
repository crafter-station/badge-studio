import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";
import { badgeEditions } from "../app/collection/editions";
import { resolveStudioPortrait } from "./portrait-studies";
import { sampleParticipant } from "./sample-participant";
import studioSamples from "./studio-samples.json";

const samples: Record<string, Partial<PrismBadgeData> | undefined> = studioSamples;

export const demoParticipant: PrismBadgeData = {
	...sampleParticipant,
	number: 1,
	eventName: "The GTM Hackathon",
	publicUrl: "https://crafters.chat/",
	signature: { seed: 42091, version: 1 },
};

export function participantForDesign(person: PrismBadgeData, design: BadgeDesign): PrismBadgeData {
	const edition = badgeEditions.find((item) => item.id === design.source);
	const event = edition?.data ?? samples[design.source ?? ""];
	return {
		...person,
		design: undefined,
		edition: undefined,
		document: undefined,
		eventName: design.event,
		signature: {
			seed:
				design.material.recipe?.seed ??
				edition?.data.signature?.seed ??
				person.signature?.seed ??
				1,
			version: 1,
		},
		...(event
			? {
					publicUrl: event.publicUrl,
					metadata: {
						...(event.metadata ?? {
							roleLabel: "",
							eventName: design.event,
							eventDate: "",
							location: "",
							website: "",
							bio: "",
						}),
						roleLabel: person.metadata?.roleLabel || person.role,
						eventName: design.event,
					},
				}
			: {
					publicUrl: `https://example.com/events/${design.source || "your-event"}`,
					metadata: {
						roleLabel: person.metadata?.roleLabel || person.role,
						eventName: design.event,
						eventDate: "Edición 2026",
						location: "Encuentro creativo",
						website: "",
						bio: "",
					},
				}),
	};
}

export function demoParticipantForDesign(design: BadgeDesign) {
	const edition = badgeEditions.find((item) => item.id === design.source);
	return participantForDesign(
		edition?.data ?? { ...demoParticipant, ...samples[design.source ?? ""] },
		design,
	);
}

export function demoBadgeForDesign(
	design: BadgeDesign,
): PrismBadgeData & { document: BadgeDesign } {
	const person = demoParticipantForDesign(design);
	return {
		...person,
		document: design,
		portraitUrl: resolveStudioPortrait(person.portraitUrl, design.source, "event"),
		artworkUrl: design.artwork ? `/prism/showcase/${design.artwork.assetId}.png` : undefined,
	};
}
