import type { PrismBadgeData } from "@crafter-station/badge-studio-renderer";

export type ParticipantIdentity = {
	version: 1;
	name: string;
	role: string;
	organization: string;
	number: number;
	started: boolean;
};

export const emptyIdentity: ParticipantIdentity = {
	version: 1,
	name: "",
	role: "",
	organization: "",
	number: 1,
	started: false,
};

export const placeholderPortrait = "/prism/portrait-placeholder.png";

export function validIdentity(value: unknown): value is ParticipantIdentity {
	if (!value || typeof value !== "object") return false;
	const item = value as ParticipantIdentity;
	return (
		item.version === 1 &&
		typeof item.name === "string" &&
		item.name.length <= 80 &&
		typeof item.role === "string" &&
		item.role.length <= 100 &&
		typeof item.organization === "string" &&
		item.organization.length <= 100 &&
		Number.isSafeInteger(item.number) &&
		item.number > 0 &&
		item.number <= 999999 &&
		typeof item.started === "boolean"
	);
}

export function applyParticipantIdentity<T extends PrismBadgeData>(
	person: T,
	identity: ParticipantIdentity,
	portraitUrl: string,
): T {
	const role = identity.role.trim() || "Participante";
	return {
		...person,
		name: identity.name.trim() || "Tu nombre",
		role,
		organization: identity.organization.trim(),
		number: identity.number,
		portraitUrl: portraitUrl || placeholderPortrait,
		...(person.metadata ? { metadata: { ...person.metadata, roleLabel: role } } : {}),
	};
}
