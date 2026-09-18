import { activeRequestGrant, communityJson, communityResponse } from "@/lib/community-server";
import { stagePublication } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
	return communityResponse(request, async () => {
		const { secret } = await activeRequestGrant(request);
		const { snapshot } = z
			.object({ snapshot: z.unknown() })
			.strict()
			.parse(await communityJson(request));
		return stagePublication(secret, snapshot);
	});
}
