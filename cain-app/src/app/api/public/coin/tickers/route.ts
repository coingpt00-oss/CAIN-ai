// src/app/api/public/coin/tickers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 워커 루트: 예) https://cain-markets-worker.coingpt00.workers.dev
const WORKER_ROOT =
  process.env.NEXT_PUBLIC_MARKETS_BASE ||
  (process.env.NEXT_PUBLIC_MARKETS_API_BASE
    ? process.env.NEXT_PUBLIC_MARKETS_API_BASE.replace(/\/api\/.*/i, "")
    : "");

const TTL = 180;

// ✅ 업스트림 흔들릴 때를 대비한 “stale 캐시”(서버 메모리, 짧게)
// - Vercel/Next 서버리스 환경에서는 인스턴스가 바뀌면 사라질 수 있지만,
//   같은 인스턴스 내에서는 효과가 있어 “순간 장애”를 흡수함.
const STALE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { ts: number; body: any };
const memCache: Map<string, CacheEntry> = new Map();

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // ✅ 워커 TTL(180)과 동기화
      "cache-control": `public, s-maxage=${TTL}, stale-while-revalidate=${TTL}`,
    },
  });
}

function cacheKey(id: string, limit: string) {
  return `${id}::${limit}`;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, next: { revalidate: TTL } });
    const data = await res.json().catch(() => null);
    return { res, data };
  } finally {
    clearTimeout(t);
  }
}

// GET /api/public/coin/tickers?id=bitcoin&limit=50
export async function GET(req: NextRequest) {
  if (!WORKER_ROOT) {
    return j(500, { ok: false, error: "worker_root_not_configured" });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const limit = url.searchParams.get("limit") || "50";

  if (!id) {
    return j(400, { ok: false, error: "missing_id" });
  }

  const key = cacheKey(id, limit);

  const qs = new URLSearchParams({ id, limit }).toString();
  const target = `${WORKER_ROOT}/api/coin-tickers?${qs}`;

  // 1) 업스트림 호출 (timeout + 1회 재시도)
  try {
    const TIMEOUT_MS = 8000;

    let out = await fetchJsonWithTimeout(target, TIMEOUT_MS);

    // 실패면 1회 재시도
    if (!out.res.ok || out.data?.ok === false || !Array.isArray(out.data?.items)) {
      out = await fetchJsonWithTimeout(target, TIMEOUT_MS);
    }

    // 성공 처리
    if (out.res.ok && out.data?.ok !== false && Array.isArray(out.data?.items)) {
      // memCache 저장(짧은 stale)
      memCache.set(key, { ts: Date.now(), body: out.data });
      return j(200, out.data);
    }

    // 2) 실패 시 stale fallback
    const cached = memCache.get(key);
    if (cached && Date.now() - cached.ts <= STALE_TTL_MS) {
      return j(200, {
        ...cached.body,
        meta: {
          ...(cached.body?.meta || {}),
          stale: true,
          stale_reason: "upstream_failed",
          upstream_status: out.res.status,
        },
      });
    }

    // 3) stale도 없으면 에러
    return j(500, {
      ok: false,
      error: "coin_tickers_failed",
      upstream_status: out.res.status,
    });
  } catch (e: any) {
    // 2) exception 시에도 stale fallback
    const cached = memCache.get(key);
    if (cached && Date.now() - cached.ts <= STALE_TTL_MS) {
      return j(200, {
        ...cached.body,
        meta: {
          ...(cached.body?.meta || {}),
          stale: true,
          stale_reason: "exception",
        },
      });
    }

    return j(500, {
      ok: false,
      error: "coin_tickers_exception",
    });
  }
}
