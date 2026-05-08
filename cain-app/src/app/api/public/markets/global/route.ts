// src/app/api/public/markets/global/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER_BASE =
  process.env.NEXT_PUBLIC_MARKETS_API_BASE ||
  "https://cain-markets-worker.coingpt00.workers.dev";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.search || "";

  // 워커의 /api/markets-global 로 프록시
  const target = `${WORKER_BASE}/api/markets-global${search}`;

  try {
    const res = await fetch(target, { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "x-from": "cain-markets-worker",
      },
    });
  } catch (e) {
    console.error("markets/global proxy error", e);
    return NextResponse.json(
      { ok: false, error: "markets_global_proxy_failed" },
      { status: 500 },
    );
  }
}
