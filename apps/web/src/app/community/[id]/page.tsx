import { CommunityDetail } from "./community-detail";
import "../community.css";

export const metadata = { title: "Community badge" };

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
	return <CommunityDetail id={(await params).id} />;
}
