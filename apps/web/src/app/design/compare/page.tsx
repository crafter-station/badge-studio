import { notFound } from "next/navigation";
import { ReferenceComparison } from "./reference-comparison";

export default function ComparePage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <ReferenceComparison />;
}
