import { secretSchema } from "@/lib/community-contract";
import { communityJson, communityResponse, verifyGrantSession } from "@/lib/community-server";
import { communityDb, grantForSecret } from "@/lib/community-store";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
	return communityResponse(request, async () => {
		const { secret, operationId } = z
			.object({ secret: secretSchema, operationId: z.string().uuid() })
			.strict()
			.parse(await communityJson(request, 1024));
		const grant = await grantForSecret(secret);
		if (!grant || grant.operation_id !== operationId) return { state: "needs_authorization" };
		if (grant.receipt) {
			const current = await communityDb().query(
				"SELECT state FROM community_publications WHERE id=$1",
				[grant.receipt.id],
			);
			const state = current.rows[0]?.state ?? "withdrawn";
			return { state, authorName: grant.author_name, receipt: { ...grant.receipt, state } };
		}
		if (grant.revoked_at) return { state: "cancelled" };
		if (new Date(grant.expires_at).getTime() <= Date.now()) return { state: "expired" };
		await verifyGrantSession(grant);
		return {
			state: grant.approved_at ? "authorized" : grant.snapshot ? "review" : "preparing",
			authorName: grant.author_name,
		};
	});
}
