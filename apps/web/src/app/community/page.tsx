import { CommunityGallery } from "./community-gallery";
import "./community.css";

export const metadata = {
	title: "Community",
	description: "Badges made with imagination. Discover original creations and make them yours.",
};

export default function CommunityPage() {
	return <CommunityGallery />;
}
