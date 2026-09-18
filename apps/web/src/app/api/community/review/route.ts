import { digestSchema } from "@/lib/community-contract";
import { communityActor, communityJson, communityResponse } from "@/lib/community-server";
import { approvePublication, reviewPublication } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: Request) {
	return communityResponse(request, async () => {
		const actor = await communityActor();
		const id = z.string().uuid().parse(new URL(request.url).searchParams.get("operationId"));
		return reviewPublication(actor, id);
	});
}

export async function POST(request: Request) {
	return communityResponse(request, async () => {
		const actor = await communityActor();
		const input = z
			.object({
				operationId: z.string().uuid(),
				snapshotHash: digestSchema,
				consent: z.literal(true),
			})
			.strict()
			.parse(await communityJson(request, 1024));
		return approvePublication(actor, input.operationId, input.snapshotHash);
	});
}
