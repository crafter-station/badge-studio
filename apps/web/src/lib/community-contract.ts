import {
	type CommunityPublication,
	communityParticipantSchema,
} from "@crafter-station/badge-studio-design/community";
import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";
export * from "@crafter-station/badge-studio-design/community";

export function publicParticipant(person: PrismBadgeData) {
	return communityParticipantSchema.parse({
		name: person.name,
		role: person.role,
		organization: person.organization ?? "",
		number: person.number,
		eventName: person.eventName,
		publicUrl: person.publicUrl,
		signature: person.signature ?? { seed: 1, version: 1 },
		metadata: person.metadata ?? {},
	});
}

export function publicationData(publication: CommunityPublication): PrismBadgeData {
	return {
		...publication.snapshot.participant,
		document: publication.snapshot.design,
		portraitUrl: publication.images.portrait,
		artworkUrl: publication.images.artwork ?? undefined,
	};
}
