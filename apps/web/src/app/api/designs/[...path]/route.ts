import { handleDesignRequest } from "@/lib/design-http";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	return handleDesignRequest(request, (await params).path);
}
export const POST = GET;
