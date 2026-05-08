import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommunityPostLegacyPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/community/${encodeURIComponent(id)}`);
}
