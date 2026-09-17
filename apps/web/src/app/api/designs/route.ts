import { handleDesignRequest } from "@/lib/design-http";
export const runtime = "nodejs";
export const maxDuration = 180;
export const GET = (request: Request) => handleDesignRequest(request);
export const POST = GET;
