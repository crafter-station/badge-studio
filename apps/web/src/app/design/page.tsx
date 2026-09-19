import { Suspense } from "react";
import { DesignStudio } from "./design-studio";
import "./design.css";
import "../community/community.css";

export const metadata = {
	title: "Design a direction",
	description: "Create layered badges from words and visual references.",
	robots: { index: false, follow: false },
};

export default function DesignPage() {
	return (
		<Suspense
			fallback={
				<main className="design-studio">
					<output className="design-loading">Preparing your space…</output>
				</main>
			}
		>
			<DesignStudio />
		</Suspense>
	);
}
