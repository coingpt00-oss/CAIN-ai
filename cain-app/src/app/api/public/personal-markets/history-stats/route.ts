// src/app/api/public/personal-markets/history-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type HistoryStatsRow = {
  symbol: string | null;
  ts: string | null;
};

function j(
  status: number,
  body: any,
  cacheControl?: string,
  extraHeaders?: Record<string, string>
) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "s-maxage=30, stale-while-revalidate=120",
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

// GET /api/public/personal-markets/history-stats?symbol=ICP
export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "SUPABASE_URL is not set",
        },
        "no-store"
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "SUPABASE_SERVICE_ROLE_KEY is not set",
        },
        "no-store"
      );
    }

    const url = new URL(req.url);
    const rawSymbol = url.searchParams.get("symbol");
    const nocache = url.searchParams.get("nocache") === "1";

    const symbolBase = normalizeBaseSymbol(rawSymbol);

    if (!symbolBase) {
      return j(
        400,
        { ok: false, error: "missing_symbol" },
        "no-store"
      );
    }

    const canonical = normalizeCanonicalSymbol(symbolBase);
    const candidates = Array.from(new Set([symbolBase, canonical]));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("pm_snapshots_3m")
      .select("symbol,ts")
      .in("symbol", candidates)
      .order("ts", { ascending: true })
      .limit(1);

    if (error) {
      return j(
        500,
        {
          ok: false,
          error: "supabase_query_failed",
          detail: error.message,
          table: "pm_snapshots_3m",
        },
        "no-store"
      );
    }

    const row = ((data ?? [])[0] || null) as HistoryStatsRow | null;
    const firstTs = row?.ts ? String(row.ts) : null;
    const days = calcDaysFromFirstTs(firstTs);

    return j(
      200,
      {
        ok: true,
        symbol: symbolBase,
        canonicalSymbol: canonical,
        days,
        firstTs,
        source: "pm_snapshots_3m",
        _cache: nocache ? "bypass" : "cdn",
      },
      nocache ? "no-store" : "s-maxage=30, stale-while-revalidate=120",
      {
        "X-Cain-Upstream": "supabase-direct",
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