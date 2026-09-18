import {
	communityJson,
	communityResponse,
	requestSecret,
	verifyGrantSession,
} from "@/lib/community-server";
import { CommunityError, commitPublication, grantForSecret } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
	return communityResponse(request, async () => {
		const secret = requestSecret(request);
		const grant = await grantForSecret(secret);
		if (!grant) throw new CommunityError("AUTHORIZATION_REQUIRED: Verifica tu cuenta.", 401);
		if (!grant.receipt) await verifyGrantSession(grant);
		const { snapshot } = z
			.object({ snapshot: z.unknown().optional() })
			.strict()
			.parse(await communityJson(request));
		return commitPublication(secret, snapshot);
	});
}
