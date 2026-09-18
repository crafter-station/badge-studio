import { COMMUNITY_IMAGE_LIMIT } from "@/lib/community-contract";
import { publicCommunityImage, uploadCommunityImage } from "@/lib/community-media";
import { activeRequestGrant, boundedBody, communityResponse } from "@/lib/community-server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
	return communityResponse(request, async () => {
		const { userId } = await auth();
		return publicCommunityImage(
			z
				.string()
				.uuid()
				.parse((await context.params).id),
			userId ?? undefined,
		);
	});
}

export async function POST(request: Request, context: Context) {
	return communityResponse(request, async () => {
		const { secret } = await activeRequestGrant(request);
		const slot = z.enum(["portrait", "artwork"]).parse((await context.params).id);
		const bytes = await boundedBody(request, COMMUNITY_IMAGE_LIMIT);
		return uploadCommunityImage(secret, slot, bytes);
	});
}
