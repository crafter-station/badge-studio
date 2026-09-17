import { DesignShowcase } from "./showcase";
import "./showcase.css";

export const metadata = {
	title: "Cinco mundos · Badge Studio",
	description: "Cinco direcciones originales, creadas y editables en Badge Studio.",
	robots: { index: false, follow: false },
};

export default function ShowcasePage() {
	return <DesignShowcase />;
}
