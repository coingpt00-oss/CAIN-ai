// src/app/community/[id]/edit/page.tsx
import EditPostClient from "./EditPostClient";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export const dynamic = "force-dynamic";

export default async function EditCommunityPostPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const id = String(resolved?.id || "");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <EditPostClient id={id} />
    </main>
  );
}
