import { communityResponse, requestSecret } from "@/lib/community-server";
import { cancelPublication } from "@/lib/community-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
	return communityResponse(request, () => cancelPublication(requestSecret(request)));
}
