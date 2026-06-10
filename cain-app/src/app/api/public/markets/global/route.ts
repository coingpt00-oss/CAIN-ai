// src/app/api/public/markets/global/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WORKER_BASE =
  process.env.NEXT_PUBLIC_MARKETS_API_BASE ||
  "https://cain-markets-worker.coingpt00.workers.dev";

const BROWSER_CACHE = "public, max-age=0, must-revalidate";
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

function cachedJson(status: number, body: any, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": BROWSER_CACHE,
      "cdn-cache-control": CDN_CACHE,
      "vercel-cdn-cache-control": CDN_CACHE,
      ...(extraHeaders || {}),
    },
  });
}

function noStoreJson(status: number, body: any, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.search || "";

  // 워커의 /api/markets-global 로 프록시
  const target = `${WORKER_BASE}/api/markets-global${search}`;

  try {
    const res = await fetch(target, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    const data = await res.json().catch(() => null);

    return cachedJson(res.status, data ?? { ok: false, error: "invalid_worker_json" }, {
      "x-from": "cain-markets-worker",
      "x-cain-cache": "cdn",
    });
  } catch (e) {
    console.error("markets/global proxy error", e);
    return noStoreJson(
      500,
      { ok: false, error: "markets_global_proxy_failed" },
      { "x-from": "cain-markets-worker" }
    );
  }
}