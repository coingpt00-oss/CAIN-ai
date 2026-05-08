// src/app/airdrops/[id]/page.tsx
import AirdropDetailClient from "./AirdropDetailClient";

export const dynamic = "force-dynamic";

// Next 16: params가 Promise일 수 있으니 안전하게 처리
type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function AirdropDetailPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);
  return <AirdropDetailClient id={id} />;
}
