import { DesignStudio } from "./design-studio";
import "./design.css";
import "../community/community.css";

export const metadata = {
	title: "Design a direction",
	description: "Create layered badges from words and visual references.",
	robots: { index: false, follow: false },
};

export default function DesignPage() {
	return <DesignStudio />;
}
