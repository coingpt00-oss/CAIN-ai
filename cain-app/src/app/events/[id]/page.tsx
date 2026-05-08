// src/app/events/[id]/page.tsx
import EventDetailClient from "./EventDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  // ✅ Next 16 + Turbopack: params가 Promise로 들어올 수 있음
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params; // ✅ 여기서 반드시 await

  return <EventDetailClient id={id} />;
}
