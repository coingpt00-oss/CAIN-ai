// src/app/api/public/personal-markets/prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CDN_CACHE = "public, s-maxage=20, stale-while-revalidate=60";
const BROWSER_CACHE = "public, max-age=0, must-revalidate";

function j(status: number, body: any, headers?: Record<string, string>) {
  const explicitNoStore =
    headers?.["Cache-Control"] === "no-store" ||
    headers?.["cache-control"] === "no-store";

  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": explicitNoStore ? "no-store" : BROWSER_CACHE,
      ...(explicitNoStore
        ? {}
        : {
            "CDN-Cache-Control": DEFAULT_CDN_CACHE,
            "Vercel-CDN-Cache-Control": DEFAULT_CDN_CACHE,
          }),
      ...(headers || {}),
    },
  });
}

function isFullMode(req: NextRequest) {
  return req.nextUrl.searchParams.get("full") === "1";
}

function countObjectKeys(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.keys(value).length;
}

function getPricesPayloadStats(payload: any) {
  const koreaSpot = payload?.korea?.spot;
  const globalSpot = payload?.global?.spot;
  const globalFutures = payload?.global?.futures;
  const bySymbol = payload?.by_symbol;

  return {
    korea_spot_symbols: countObjectKeys(koreaSpot),
    global_spot_symbols: countObjectKeys(globalSpot),
    global_futures_symbols: countObjectKeys(globalFutures),
    by_symbol_count: countObjectKeys(bySymbol),
  };
}

function getIndicatorsPayloadStats(payload: any) {
  const indicators = payload?.payload?.indicators ?? payload?.indicators;
  return {
    type: payload?.payload?.type ?? payload?.type ?? null,
    ts: payload?.payload?.ts ?? payload?.ts ?? null,
    base_ts: payload?.payload?.base_ts ?? payload?.base_ts ?? null,
    indicators_count: countObjectKeys(indicators),
  };
}

function slimPricesRow(row: any) {
  if (!row) return null;

  const payload = row?.payload ?? null;

  return {
    ts: row.ts,
    created_at: row.created_at,
    payload: {
      ts: payload?.ts ?? row.ts ?? null,
      fx: payload?.fx ?? null,
      stats: getPricesPayloadStats(payload),
    },
  };
}

function slimIndicatorsRow(row: any) {
  if (!row) return null;

  const payload = row?.payload ?? null;

  return {
    ts: row.ts,
    created_at: row.created_at,
    payload: {
      ts: payload?.ts ?? row.ts ?? null,
      type: payload?.type ?? null,
      base_ts: payload?.base_ts ?? null,
      stats: getIndicatorsPayloadStats(payload),
    },
  };
}

// GET /api/public/personal-markets/prices
// - 기본값: slim 응답(대형 payload 제거)
// - 디버그/레거시 전체 확인: ?full=1
export async function GET(req: NextRequest) {
  try {
    const full = isFullMode(req);

    // 1) 최신 prices
    const pricesQ = supabaseAdmin
      .from("markets_prices")
      .select("ts, payload, created_at")
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2) 최신 indicators
    const indicatorsQ = supabaseAdmin
      .from("markets_indicators")
      .select("ts, payload, created_at")
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3) (선택) system_meta - 마지막 실행 기록
    const metaQ = supabaseAdmin
      .from("system_meta")
      .select("key, value, updated_at")
      .in("key", ["last_fx_run", "last_indicator_run", "last_price_run"]);

    const [pricesRes, indicatorsRes, metaRes] = await Promise.all([
      pricesQ,
      indicatorsQ,
      metaQ,
    ]);

    if (pricesRes.error) {
      return j(
        500,
        { ok: false, error: "prices_query_failed", detail: pricesRes.error.message },
        { "Cache-Control": "no-store" }
      );
    }
    if (indicatorsRes.error) {
      return j(
        500,
        { ok: false, error: "indicators_query_failed", detail: indicatorsRes.error.message },
        { "Cache-Control": "no-store" }
      );
    }
    if (metaRes.error) {
      return j(
        500,
        { ok: false, error: "meta_query_failed", detail: metaRes.error.message },
        { "Cache-Control": "no-store" }
      );
    }

    const pricesRow = pricesRes.data || null;
    const indicatorsRow = indicatorsRes.data || null;

    // prices payload 안에 fx가 들어있는 형태를 기본 가정(보스 스샷 그대로)
    const fx =
      (pricesRow?.payload as any)?.fx ??
      (indicatorsRow?.payload as any)?.fx ??
      null;

    const meta: Record<string, any> = {};
    for (const r of metaRes.data || []) {
      meta[r.key] = {
        value: r.value,
        updated_at: r.updated_at,
      };
    }

    // 데이터가 아직 하나도 없을 때도 프론트가 안 죽게
    const body = {
      ok: true,
      slim: !full,
      ts: new Date().toISOString(),
      fx,
      prices: full
        ? pricesRow
          ? {
              ts: pricesRow.ts,
              created_at: pricesRow.created_at,
              payload: pricesRow.payload,
            }
          : null
        : slimPricesRow(pricesRow),
      indicators: full
        ? indicatorsRow
          ? {
              ts: indicatorsRow.ts,
              created_at: indicatorsRow.created_at,
              payload: indicatorsRow.payload,
            }
          : null
        : slimIndicatorsRow(indicatorsRow),
      meta,
    };

    return j(200, body, {
      "X-Cain-Slim": full ? "0" : "1",
      "X-Cain-Full": full ? "1" : "0",
    });
  } catch (e: any) {
    return j(
      500,
      { ok: false, error: "unexpected", detail: e?.message || String(e) },
      { "Cache-Control": "no-store" }
    );
  }
}