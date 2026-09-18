import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const clerk = clerkMiddleware();

export default async function middleware(request: NextRequest, context: NextFetchEvent) {
	if (process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
		const response = await clerk(request, context);
		if (
			process.env.NODE_ENV === "development" &&
			response?.headers.get("x-middleware-rewrite") === request.url
		) {
			response.headers.delete("x-middleware-rewrite");
			response.headers.set("x-middleware-next", "1");
		}
		return response;
	}
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/badge/:path*",
		"/studio/:path*",
		"/design/:path*",
		"/badges/:path*",
		"/api/prism/:path*",
		"/api/designs/:path*",
		"/api/community/:path*",
		"/community/:path*",
		"/sign-in/:path*",
		"/sign-up/:path*",
	],
};
