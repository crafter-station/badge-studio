import { communityResponse } from "@/lib/community-server";
import { getPublication } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
	return communityResponse(request, async () =>
		getPublication(
			z
				.string()
				.uuid()
				.parse((await context.params).id),
		),
	);
}
