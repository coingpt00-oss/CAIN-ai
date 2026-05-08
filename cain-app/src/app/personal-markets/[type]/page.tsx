//src/app/personal-markets/[type]/page.tsx
import TypedPersonalMarketsClient from "../TypedPersonalMarketsClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    type: string;
  }>;
};

export default async function TypedPersonalMarketsPage({ params }: PageProps) {
  const { type } = await params;
  const decodedType = decodeURIComponent(type || "spot");
  return <TypedPersonalMarketsClient type={decodedType} />;
}