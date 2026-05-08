// src/app/community/[id]/page.tsx
import { notFound } from "next/navigation";
import PostDetailClient from "./PostDetailClient";

type PageProps = {
  params: Promise<{ id?: string }> | { id?: string };
};

export default async function CommunityPostPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams?.id || "").trim();

  if (!id || id === "undefined" || id === "null") {
    notFound();
  }

  return <PostDetailClient id={id} />;
}