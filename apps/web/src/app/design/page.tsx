import { DesignStudio } from "./design-studio";
import "./design.css";

export const metadata = {
	title: "Diseña una dirección",
	description: "Crea badges por capas a partir de palabras y referencias visuales.",
	robots: { index: false, follow: false },
};

export default function DesignPage() {
	return <DesignStudio />;
}
