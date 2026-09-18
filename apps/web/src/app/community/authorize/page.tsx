import { Suspense } from "react";
import { AuthorizePublication } from "./publication-authorization";
import "../community.css";

export const metadata = {
	title: "Publica tu badge",
	robots: { index: false, follow: false },
	referrer: "no-referrer" as const,
};

export default function AuthorizePage() {
	return (
		<Suspense>
			<AuthorizePublication
				configured={Boolean(
					process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
				)}
			/>
		</Suspense>
	);
}
