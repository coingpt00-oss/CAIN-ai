// src/app/community/new/page.tsx
import NewPostClient from "./NewPostClient";

export const dynamic = "force-dynamic";

export default function NewCommunityPostPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10">
      <NewPostClient />
    </main>
  );
}