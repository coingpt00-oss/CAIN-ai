// src/app/api/public/personal-markets/markets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CDN_CACHE = "public, s-maxage=10, stale-while-revalidate=30";
const BROWSER_CACHE = "public, max-age=0, must-revalidate";

function jsonError(message: string, status = 500, detail?: string) {
  return NextResponse.json(
    {
      ok: false,
      error: detail ? { message, detail } : { message },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function normalizeSymbol(value: any) {
  return String(value || "").trim().toUpperCase();
}

function toFiniteNumber(value: any) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function enrichSpotChange7d(payload: any) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return payload;

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      ...payload,
      meta: {
        ...(payload?.meta || {}),
        change_7d_enriched: false,
        change_7d_error: "supabase_env_missing",
      },
    };
  }

  const symbols = Array.from(
    new Set(
      items
        .map((row: any) => normalizeSymbol(row?.symbol_upper || row?.symbol))
        .filter(Boolean)
    )
  );

  if (!symbols.length) return payload;

  const { data, error } = await supabase.rpc("get_pm_period_changes", {
    p_type: "spot",
    p_symbols: symbols,
    p_period: "7d",
  });

  if (error) {
    return {
      ...payload,
      meta: {
        ...(payload?.meta || {}),
        change_7d_enriched: false,
        change_7d_error: error.message,
      },
    };
  }

  const changeMap = new Map<string, number>();

  for (const row of data || []) {
    const symbol = normalizeSymbol(row?.symbol);
    const change = toFiniteNumber(row?.change_pct);

    if (symbol && change !== null) {
      changeMap.set(symbol, change);
    }
  }

  const enrichedItems = items.map((row: any) => {
    const symbol = normalizeSymbol(row?.symbol_upper || row?.symbol);
    const change = changeMap.get(symbol);

    if (!Number.isFinite(change)) return row;

    return {
      ...row,
      change_7d: change,
    };
  });

  return {
    ...payload,
    items: enrichedItems,
    meta: {
      ...(payload?.meta || {}),
      change_7d_enriched: true,
      change_7d_source: "get_pm_period_changes",
      change_7d_symbols: changeMap.size,
    },
  };
}

function toPublicMarketItem(row: any) {
  return {
    cg_id: row?.cg_id ?? null,
    symbol: row?.symbol ?? null,
    symbol_upper: row?.symbol_upper ?? null,
    canonical_symbol: row?.canonical_symbol ?? null,
    name: row?.name ?? null,
    image: row?.image ?? null,

    market_mode: row?.market_mode ?? null,
    market_cap_rank: row?.market_cap_rank ?? null,

    price: row?.price ?? null,
    price_usd: row?.price_usd ?? null,
    price_krw: row?.price_krw ?? null,
    price_currency: row?.price_currency ?? null,

    market_cap_live: row?.market_cap_live ?? null,
    total_volume: row?.total_volume ?? null,
    circulating_supply: row?.circulating_supply ?? null,

    change_1h: row?.change_1h ?? null,
    change_24h: row?.change_24h ?? null,
    change_7d: row?.change_7d ?? null,
    price_change_percentage_24h: row?.price_change_percentage_24h ?? null,

    fx_usdkrw: row?.fx_usdkrw ?? null,

    has_live_price: row?.has_live_price ?? false,
    price_source_exchange: row?.price_source_exchange ?? null,
    price_source_type: row?.price_source_type ?? null,

    updated_at: row?.updated_at ?? null,
  };
}

function slimMarketsPayload(data: any, includeFull = false) {
  if (includeFull) return data;

  const items = Array.isArray(data?.items)
    ? data.items.map((row: any) => toPublicMarketItem(row))
    : [];

  return {
    ok: data?.ok ?? true,
    ts: data?.ts ?? null,
    currency: data?.currency ?? null,
    market: data?.market ?? null,
    total: data?.total ?? items.length,
    limit: data?.limit ?? null,
    offset: data?.offset ?? null,
    q: data?.q ?? null,
    only_live: data?.only_live ?? null,
    master: data?.master ?? null,
    items,
    meta: {
      ...(data?.meta || {}),
      slim: true,
      full_included: false,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const API_BASE = process.env.CAIN_VPS_API_BASE;
    const ORIGIN_SECRET =
      process.env.CAIN_VPS_ORIGIN_SECRET || process.env.ORIGIN_SECRET || "";

    if (!API_BASE) {
      return jsonError("CAIN_VPS_API_BASE is missing", 500);
    }

    const nocache = req.nextUrl.searchParams.get("nocache") === "1";
    const includeFull =
      req.nextUrl.searchParams.get("full") === "1" ||
      req.nextUrl.searchParams.get("include_full") === "1";
    const qs = req.nextUrl.search || "";
    const target = `${API_BASE.replace(/\/+$/, "")}/markets-v2${qs}`;

    const upstream = await fetch(target, {
      method: "GET",
      // VPS 원본은 매번 최신으로 받되,
      // 최종 사용자 응답은 아래 Response Header로 CDN 캐시시킵니다.
      cache: "no-store",
      headers: ORIGIN_SECRET
        ? {
            accept: "application/json",
            "x-origin-secret": ORIGIN_SECRET,
          }
        : {
            accept: "application/json",
          },
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Cain-Upstream": "error",
        },
      });
    }

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: {
            message: "markets_v2_bad_upstream_json",
            detail: text?.slice(0, 300) || "VPS returned non-JSON response",
          },
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Cain-Upstream": "bad-json",
          },
        }
      );
    }

    const payload = slimMarketsPayload(data, includeFull);
    const enrichedPayload = await enrichSpotChange7d(payload);

    return new NextResponse(JSON.stringify(enrichedPayload), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",

        // 브라우저에는 오래 들고 있지 말라고 하고
        "Cache-Control": nocache ? "no-store" : BROWSER_CACHE,

        // CDN/Vercel에는 짧게 캐시하라고 지시
        ...(nocache
          ? {}
          : {
              "CDN-Cache-Control": CDN_CACHE,
              "Vercel-CDN-Cache-Control": CDN_CACHE,
            }),

        "X-Cain-Upstream": "ok",
        "X-Cain-Cache": nocache ? "bypass" : "cdn",
        "X-Cain-Slim": includeFull ? "0" : "1",
      },
    });
  } catch (error) {
    return jsonError(
      "personal_markets_spot_proxy_failed",
      500,
      String((error as Error)?.message || error)
    );
  }
}