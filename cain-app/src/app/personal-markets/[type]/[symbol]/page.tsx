//src/app/personal-markets/[type]/page.tsx
import TypedPersonalMarketDetailClient from "../../TypedPersonalMarketDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    type: string;
    symbol: string;
  }>;
};

export default async function TypedPersonalMarketDetailPage({ params }: PageProps) {
  const { type, symbol } = await params;
  const decodedType = decodeURIComponent(type || "spot");
  const decodedSymbol = decodeURIComponent(symbol || "");
  return <TypedPersonalMarketDetailClient type={decodedType} symbol={decodedSymbol} />;
}