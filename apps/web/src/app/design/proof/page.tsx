import { notFound } from "next/navigation";
import { DesignProof } from "./proof-canvas";

export default function ProofPage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <DesignProof />;
}
