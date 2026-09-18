import { cleanCommunityImages } from "@/lib/community-media";
import { communityResponse } from "@/lib/community-server";
import { CommunityError } from "@/lib/community-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
	return communityResponse(request, async () => {
		if (
			!process.env.CRON_SECRET ||
			request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
		)
			throw new CommunityError("No autorizado.", 401);
		return cleanCommunityImages();
	});
}
