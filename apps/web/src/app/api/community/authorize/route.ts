import { communityIntentSchema, publicationKeySchema } from "@/lib/community-contract";
import { communityActor, communityJson, communityResponse } from "@/lib/community-server";
import { authorizePublication } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
	return communityResponse(request, async () => {
		const actor = await communityActor();
		const value = z
			.object({ secretHash: publicationKeySchema, intent: communityIntentSchema })
			.strict()
			.parse(await communityJson(request, 4096));
		return authorizePublication(actor, value.secretHash, value.intent);
	});
}
