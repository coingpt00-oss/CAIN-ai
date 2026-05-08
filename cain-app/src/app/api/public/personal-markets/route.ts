// src/app/api/public/personal-markets/route.ts
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

// GET /api/public/personal-markets
// - latest markets_prices + markets_indicators (+ system_meta optional)
export async function GET(req: NextRequest) {
  try {
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
    return j(200, {
      ok: true,
      ts: new Date().toISOString(),
      fx,
      prices: pricesRow
        ? {
            ts: pricesRow.ts,
            created_at: pricesRow.created_at,
            payload: pricesRow.payload,
          }
        : null,
      indicators: indicatorsRow
        ? {
            ts: indicatorsRow.ts,
            created_at: indicatorsRow.created_at,
            payload: indicatorsRow.payload,
          }
        : null,
      meta,
    });
  } catch (e: any) {
    return j(
      500,
      { ok: false, error: "unexpected", detail: e?.message || String(e) },
      { "Cache-Control": "no-store" }
    );
  }
}