// src/app/api/public/trending/route.ts
// CAIN — 트렌딩 코인 목록 (Cloudflare Markets Worker 프록시 버전)
//  - 기존: Next.js 서버에서 CoinGecko search/trending + coins/markets 직통 호출
//  - 변경: cain-markets-worker 의 /api/trending 결과를 그대로(또는 최소 가공) 반환
//  - CDN: Vercel CDN 120초 캐시 + 300초 stale 허용

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BROWSER_CACHE = "public, max-age=0, must-revalidate";
const CDN_CACHE = "public, s-maxage=120, stale-while-revalidate=300";

// ──────────────────────────────────────────────
// 워커 베이스 URL 추출
//   NEXT_PUBLIC_MARKETS_API_BASE 예시:
//   https://cain-markets-worker.../api/markets-list
//   → WORKER_ROOT = https://cain-markets-worker...
// ──────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_MARKETS_API_BASE;
const WORKER_ROOT = BASE ? BASE.replace(/\/api\/markets.*$/i, "") : null;

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
  if (!WORKER_ROOT) {
    return noStoreJson(500, { ok: false, error: "worker_base_not_configured" });
  }

  const { searchParams } = new URL(req.url);
  const vs = (searchParams.get("vs") ?? "krw").toLowerCase();
  const perPage = Number(searchParams.get("per_page") ?? "50") || 50;

  try {
    const qs = new URLSearchParams({
      vs,
      per_page: String(perPage),
    });

    const workerUrl = `${WORKER_ROOT}/api/trending?${qs.toString()}`;

    const r = await fetch(workerUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!r.ok) {
      return noStoreJson(200, {
        ok: false,
        status: r.status,
        error: `worker_${r.status}`,
        hint: "markets-worker /api/trending",
      });
    }

    const j = await r.json().catch(() => null);

    if (j?.ok === false) {
      return noStoreJson(200, {
        ok: false,
        status: 502,
        error: j.error ?? "worker_error",
      });
    }

    // 워커에서 이미 { ok, mode, vs, updatedAt, items } 형태로 내려주므로
    // 그대로 내려주되, 방어적으로 기본값만 잡아줌
    return cachedJson(
      200,
      {
        ok: true,
        mode: j?.mode ?? "trending",
        vs: j?.vs ?? vs,
        updatedAt: j?.updatedAt ?? new Date().toISOString(),
        items: Array.isArray(j?.items) ? j.items : [],
      },
      {
        "x-from": "cain-markets-worker",
        "x-cain-cache": "cdn",
      }
    );
  } catch (e: any) {
    return noStoreJson(200, {
      ok: false,
      error: String(e?.message || e),
    });
  }
}