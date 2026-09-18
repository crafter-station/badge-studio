import type { BadgeDesign } from "@crafter-station/badge-studio-design/badge-design";
import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";
import { badgeEditions } from "../app/collection/editions";
import { demoPortraitUrl, resolveStudioPortrait } from "./portrait-studies";

export const demoParticipant: PrismBadgeData = {
	name: "Railly Hugo",
	role: "Builder",
	organization: "Vercel",
	number: 1,
	eventName: "The GTM Hackathon",
	portraitUrl: demoPortraitUrl,
	publicUrl: "https://crafters.chat/",
	signature: { seed: 42091, version: 1 },
};

export function participantForDesign(person: PrismBadgeData, design: BadgeDesign): PrismBadgeData {
	const edition = badgeEditions.find((item) => item.id === design.source);
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
		...(edition
			? {
					publicUrl: edition.data.publicUrl,
					metadata: {
						...(edition.data.metadata ?? {
							roleLabel: "",
							eventName: edition.name,
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
	return participantForDesign(edition?.data ?? demoParticipant, design);
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
