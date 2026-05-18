// src/app/api/public/personal-markets/history-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type HistoryStatsRow = {
  symbol: string | null;
  bucket_ts: string | null;
};

const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

function j(
  status: number,
  body: any,
  cacheControl?: string,
  extraHeaders?: Record<string, string>
) {
  const cc = cacheControl || CDN_CACHE;

  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",

      // Browser는 매번 검증, CDN은 60초 캐시
      "cache-control": status >= 400 ? "no-store" : "public, max-age=0, must-revalidate",
      "cdn-cache-control": status >= 400 ? "no-store" : cc,
      "vercel-cdn-cache-control": status >= 400 ? "no-store" : cc,

      ...(extraHeaders || {}),
    },
  });
}

function normalizeBaseSymbol(raw: string | null): string {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";

  if (s.endsWith("USDT")) return s.slice(0, -4);
  if (s.endsWith("USD")) return s.slice(0, -3);
  if (s.endsWith("KRW")) return s.slice(0, -3);

  return s;
}

function normalizeCanonicalSymbol(base: string): string {
  return `${base}USDT`;
}

function calcDaysFromFirstTs(firstTs: string | null): number {
  if (!firstTs) return 0;

  const first = new Date(firstTs).getTime();
  if (!Number.isFinite(first)) return 0;

  const now = Date.now();
  const diffMs = Math.max(0, now - first);
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

// GET /api/public/personal-markets/history-stats?symbol=BTC
export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL) {
      return j(500, {
        ok: false,
        error: "missing_env",
        detail: "SUPABASE_URL is not set",
      });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return j(500, {
        ok: false,
        error: "missing_env",
        detail: "SUPABASE_SERVICE_ROLE_KEY is not set",
      });
    }

    const url = new URL(req.url);
    const rawSymbol = url.searchParams.get("symbol");
    const nocache = url.searchParams.get("nocache") === "1";

    const symbolBase = normalizeBaseSymbol(rawSymbol);

    if (!symbolBase) {
      return j(400, { ok: false, error: "missing_symbol" }, "no-store");
    }

    const canonical = normalizeCanonicalSymbol(symbolBase);
    const candidates = Array.from(new Set([symbolBase, canonical]));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 중요:
    // 3분 raw(pm_snapshots_3m)는 24시간만 보관할 예정이므로
    // history-stats는 15분 집계 테이블(pm_chart_points_15m)을 기준으로 계산한다.
    const { data, error } = await supabase
      .from("pm_chart_points_15m")
      .select("symbol,bucket_ts")
      .in("symbol", candidates)
      .order("bucket_ts", { ascending: true })
      .limit(1);

    if (error) {
      return j(
        500,
        {
          ok: false,
          error: "supabase_query_failed",
          detail: error.message,
          table: "pm_chart_points_15m",
        },
        "no-store",
        { "X-Cain-Upstream": "supabase-error" }
      );
    }

    const row = ((data ?? [])[0] || null) as HistoryStatsRow | null;
    const firstTs = row?.bucket_ts ? String(row.bucket_ts) : null;
    const days = calcDaysFromFirstTs(firstTs);

    return j(
      200,
      {
        ok: true,
        symbol: symbolBase,
        canonicalSymbol: canonical,
        days,
        firstTs,
        source: "pm_chart_points_15m",
        _cache: nocache ? "bypass" : "cdn",
      },
      nocache ? "no-store" : CDN_CACHE,
      {
        "X-Cain-Upstream": "supabase-on-cache-miss",
        "X-Cain-Cache": nocache ? "bypass" : "cdn",
      }
    );
  } catch (e: any) {
    return j(
      500,
      {
        ok: false,
        error: "unexpected",
        detail: String(e?.message || e),
      },
      "no-store",
      { "X-Cain-Upstream": "exception" }
    );
  }
}