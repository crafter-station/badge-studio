import { cliMediaGrant } from "@/lib/community-cli";
import { COMMUNITY_IMAGE_LIMIT } from "@/lib/community-contract";
import { uploadCommunityImage } from "@/lib/community-media";
import { boundedBody, communityResponse } from "@/lib/community-server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ slot: string }> }) {
	return communityResponse(
		request,
		async () => {
			const slot = z.enum(["portrait", "artwork"]).parse((await context.params).slot);
			const secret = await cliMediaGrant(request);
			return uploadCommunityImage(secret, slot, await boundedBody(request, COMMUNITY_IMAGE_LIMIT));
		},
		false,
	);
}
