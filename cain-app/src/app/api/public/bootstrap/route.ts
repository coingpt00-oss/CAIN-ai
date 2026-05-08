// 시세 + 글로벌 정보를 한 번에 묶어서 내려주는 엔드포인트다나까
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE =
  process.env.NEXT_PUBLIC_MARKETS_API_BASE ||
  ""; // 예: https://cain-markets-worker.coingpt00.workers.dev

async function safeFetchJSON(path: string) {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const j = await r.json();
  if (!j?.ok) {
    throw new Error(j?.error || "upstream_error");
  }
  return j;
}

export async function GET() {
  try {
    const [marketsRes, globalRes] = await Promise.all([
      safeFetchJSON(
        "/api/markets-list?vs=krw&page=1&per_page=250"
      ),
      safeFetchJSON("/api/markets-global?vs=krw"),
    ]);

    return NextResponse.json({
      ok: true,
      updatedAt: Date.now(),
      markets: marketsRes.items, // 상위 250개
      global: globalRes.data,   // 시총/거래량/BTC 도미넌스
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "bootstrap_error" },
      { status: 500 }
    );
  }
}
