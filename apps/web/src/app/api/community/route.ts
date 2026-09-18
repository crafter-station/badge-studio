import { communityResponse } from "@/lib/community-server";
import { listPublications } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return communityResponse(request, async () => {
		const query = new URL(request.url).searchParams;
		const limit = z.coerce
			.number()
			.int()
			.min(1)
			.max(24)
			.parse(query.get("limit") ?? 12);
		const cursor = z
			.string()
			.uuid()
			.optional()
			.parse(query.get("cursor") ?? undefined);
		return listPublications(limit, cursor);
	});
}
