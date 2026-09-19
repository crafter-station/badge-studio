import { cliActor, cliConfiguration, cliPublicationStatus, cliPublish } from "@/lib/community-cli";
import { communityResponse } from "@/lib/community-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
	return communityResponse(
		request,
		async () => {
			const query = new URL(request.url).searchParams;
			const operationId = query.get("operationId");
			if (operationId) return cliPublicationStatus(request, operationId);
			if (query.has("account") || request.headers.has("authorization")) {
				const actor = await cliActor(request);
				return { id: actor.ownerId, name: actor.authorName };
			}
			return cliConfiguration();
		},
		false,
	);
}

export async function POST(request: Request) {
	return communityResponse(request, () => cliPublish(request), false);
}
