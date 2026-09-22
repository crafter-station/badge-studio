import { redirect } from "next/navigation";

export const metadata = {
	title: "Community",
	description: "Badges made with imagination. Discover original creations and make them yours.",
};

export default function CommunityPage() {
	redirect("/gallery?filter=community");
}
