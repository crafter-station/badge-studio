import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const clerk = clerkMiddleware();

export default function middleware(request: NextRequest, context: NextFetchEvent) {
	if (process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
		return clerk(request, context);
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
		"/sign-in/:path*",
	],
};
