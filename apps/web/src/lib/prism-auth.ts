import { randomUUID } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prismSpace } from "./prism-space";

export class BadgeAccessError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

export function hasClerk() {
	return Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export function localDemoEnabled() {
	return process.env.PRISM_DEMO_MODE === "1" && !process.env.VERCEL;
}

export function requireSameOrigin(request: Request) {
	const target = new URL(request.url);
	const origin = request.headers.get("origin");
	const configured = process.env.NEXT_PUBLIC_APP_URL;
	const expectedOrigin = configured ? new URL(configured).origin : target.origin;
	if (!origin || origin !== expectedOrigin) {
		throw new BadgeAccessError("La solicitud no viene de esta página.", 403);
	}
}

export async function resolveBadgeAttendee(request: Request) {
	const space = prismSpace();
	if (localDemoEnabled()) {
		const hostname = new URL(request.url).hostname;
		if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "[::1]") {
			throw new BadgeAccessError("El piloto solo está disponible en este equipo.", 403);
		}
		const jar = await cookies();
		let visitor = jar.get("prism-pilot")?.value;
		if (!visitor || !/^[0-9a-f-]{36}$/.test(visitor)) {
			visitor = randomUUID();
			jar.set("prism-pilot", visitor, {
				httpOnly: true,
				sameSite: "strict",
				path: "/",
				maxAge: 60 * 60 * 24 * 30,
			});
		}
		return {
			ownerId: `pilot:${visitor}`,
			attendeeId: `pilot:${visitor}`,
			eventId: space.id,
			name: "",
			role: "attendee",
			organization: "",
			demo: true,
		};
	}

	if (!hasClerk()) {
		throw new BadgeAccessError("El inicio de sesión todavía no está configurado.", 503);
	}
	const { userId } = await auth();
	if (!userId) throw new BadgeAccessError("Inicia sesión para crear tu badge.", 401);
	const user = await currentUser();
	if (!user) throw new BadgeAccessError("Inicia sesión para crear tu badge.", 401);

	let role = "member";
	let organization = "";
	let attendeeId = userId;
	if (process.env.PRISM_REQUIRE_REGISTRATION === "1") {
		const registrations = user.privateMetadata.eventRegistrations;
		const registration =
			registrations && typeof registrations === "object"
				? (registrations as Record<string, unknown>)[space.id]
				: undefined;
		if (!registration || typeof registration !== "object")
			throw new BadgeAccessError("Necesitas una inscripción confirmada para este espacio.", 403);
		const record = registration as Record<string, unknown>;
		if (record.status !== "approved" || typeof record.role !== "string" || !record.role.trim())
			throw new BadgeAccessError("Tu inscripción todavía no está confirmada.", 403);
		role = record.role;
		organization = typeof record.organization === "string" ? record.organization : "";
		attendeeId = typeof record.attendeeId === "string" ? record.attendeeId : userId;
	}

	return {
		ownerId: userId,
		attendeeId,
		eventId: space.id,
		name: [user.firstName, user.lastName].filter(Boolean).join(" "),
		role,
		organization,
		demo: false,
	};
}
