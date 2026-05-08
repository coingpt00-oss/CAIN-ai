// src/app/coin/[id]/page.tsx
import { headers } from "next/headers";
import CoinDetailClient from "./CoinDetailClient";
import { BINANCE_MAP } from "@/lib/binanceMap";

export const dynamic = "force-dynamic";

type SearchParams = { vs?: string };

export default async function CoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  // Next 16: params / searchParams 는 Promise
  const { id } = await params;
  const q = await searchParams;

  const vs = (q?.vs ?? "usd").toLowerCase();

  const hdrs = await headers();
  const host = hdrs.get("host") || "localhost:3000";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = `${proto}://${host}`;

  // 코인 상세 초기값
  let detail: any = null;
  let fallback: boolean | undefined;
  let detailError: string | null = null;

  // ✅ tickers는 SSR에서 제거 (서버부하/TTFB 개선 + 부분 실패 격리)
  const tickers: any[] = [];
  const tickersError: string | null = null;

  // ─────────────────────────────────────
  // 1) 코인 상세 (워커 → 스냅샷/실시간)
  //    GET /api/public/coin/[id]?vs=usd
  // ─────────────────────────────────────
  try {
    const r = await fetch(`${base}/api/public/coin/${encodeURIComponent(id)}?vs=${vs}`, {
      cache: "no-store",
    });
    const j = await r.json();
    if (j?.ok) {
      detail = j;
      fallback = j.fallback;
    } else {
      detailError = j?.error ?? "unknown_error";
    }
  } catch {
    detailError = "fetch_failed";
  }

  const coinSlug = id.toLowerCase();
  const binanceSymbol: string | null = BINANCE_MAP[coinSlug] ?? null;

  return (
    <CoinDetailClient
      coinId={id}
      vs={vs}
      binanceSymbol={binanceSymbol}
      initialSummary={null}
      initialSummaryError={null}
      initialDetail={detail}
      initialFallback={fallback}
      initialError={detailError}
      initialTickers={tickers} // ✅ 빈 배열로 시작
      initialTickersError={tickersError} // ✅ null
    />
  );
}
