// src/app/api/public/personal-markets/detail/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ExchangeRow = {
  exchange: string;
  name: string;
  label?: string;
  price: number | null;
  price_usd?: number | null;
  price_krw?: number | null;
  display_currency?: string | null;
  bucket?: string | null;
  status: string;
  connected: boolean;
  stale: boolean;
  ageMs: number | null;
  ts: number | null;
};

type ExchangeGroup = {
  domestic_krw: ExchangeRow[];
  global_spot_usd: ExchangeRow[];
  global_futures_usd: ExchangeRow[];
};

type BucketKey = keyof ExchangeGroup;

const DETAIL_CDN_CACHE = "public, s-maxage=5, stale-while-revalidate=25";
const BROWSER_CACHE = "public, max-age=0, must-revalidate";

const SLIM_ITEM_KEYS = [
  "score",
  "state",
  "source",
  "side",
  "dominance",

  "market_cap_rank",
  "rank_name",
  "rank_cg_id",
  "icon_url",
  "is_ranked",
  "sort_priority",

  "domestic_avg_krw",
  "global_spot_avg_usd",
  "global_spot_avg_krw",
  "premium_pct",
  "domestic_spread_krw",
  "dispersion_krw_domestic_spread",
  "global_spread_krw",
  "dispersion_krw_global_spread",
  "domestic_exchange_count",

  "global_avg_usd",
  "global_spread_usd",
  "global_spread_pct",
  "volatility_ratio",
  "volatility_warn",
  "global_spot_exchange_count",

  "global_futures_avg_usd",
  "basis_pct",
  "futures_basis_pct",
  "delay_proxy",
  "global_perp_exchange_count",

  "price",
  "price_usd",
  "price_krw",
  "market_cap_live",
  "market_cap_meta",
  "total_volume",
  "change_1h",
  "change_24h",
  "change_7d",
  "price_change_percentage_24h",
  "circulating_supply",

  "spark_spot_7d_usd",
  "spark_spot_7d_krw",
  "spark_kimchi_3d",
  "spark_basis_3d",
  "sparkline_usd",
  "sparkline_krw",
  "sparkline_gap",
  "sparkline_basis",
  "sparkline_label",
] as const;

function cacheHeaders(useNoStore: boolean, extraHeaders?: Record<string, string>) {
  if (useNoStore) {
    return {
      "Cache-Control": "no-store",
      ...(extraHeaders || {}),
    };
  }

  return {
    "Cache-Control": BROWSER_CACHE,
    "CDN-Cache-Control": DETAIL_CDN_CACHE,
    "Vercel-CDN-Cache-Control": DETAIL_CDN_CACHE,
    ...(extraHeaders || {}),
  };
}

function jsonError(message: string, status = 500, useNoStore = true) {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: cacheHeaders(useNoStore),
    }
  );
}

function finiteNumberOrNull(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compactObject<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      out[key] = null;
      continue;
    }
    out[key] = value;
  }

  return out as T;
}

function normalizeExchangeRow(row: any): ExchangeRow {
  const exchange = String(row?.exchange ?? row?.name ?? "").toLowerCase();
  const name = String(row?.name ?? row?.exchange ?? "").toLowerCase();
  const price = finiteNumberOrNull(row?.price ?? row?.price_usd ?? row?.price_krw);

  return compactObject({
    exchange,
    name,
    label: row?.label ? String(row.label) : undefined,
    price,
    price_usd: finiteNumberOrNull(row?.price_usd),
    price_krw: finiteNumberOrNull(row?.price_krw),
    display_currency: row?.display_currency ? String(row.display_currency) : undefined,
    bucket: row?.bucket ? String(row.bucket) : undefined,
    status: String(row?.status ?? "unknown"),
    connected: Boolean(row?.connected),
    stale: Boolean(row?.stale),
    ageMs: finiteNumberOrNull(row?.ageMs),
    ts: finiteNumberOrNull(row?.ts),
  });
}

function dedupeExchangeRows(rows: ExchangeRow[]) {
  const seen = new Set<string>();
  const out: ExchangeRow[] = [];

  for (const row of rows) {
    const key = String(row?.exchange || row?.name || "").trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function normalizeExchangeRows(rows: any): ExchangeRow[] {
  if (!Array.isArray(rows)) return [];
  return dedupeExchangeRows(
    rows
      .map(normalizeExchangeRow)
      .filter((row) => row.price !== null && Number.isFinite(Number(row.price)))
  );
}

function emptyExchanges(): ExchangeGroup {
  return {
    domestic_krw: [],
    global_spot_usd: [],
    global_futures_usd: [],
  };
}

function normalizeExchangeGroup(group: any): ExchangeGroup {
  return {
    domestic_krw: normalizeExchangeRows(group?.domestic_krw),
    global_spot_usd: normalizeExchangeRows(group?.global_spot_usd),
    global_futures_usd: normalizeExchangeRows(group?.global_futures_usd),
  };
}

function groupAllExchanges(rows: any): ExchangeGroup {
  const out = emptyExchanges();
  if (!Array.isArray(rows)) return out;

  for (const raw of rows) {
    const bucket = String(raw?.bucket || raw?.marketType || raw?.extra?.marketType || "").toLowerCase();
    const name = String(raw?.exchange || raw?.name || raw?.label || "").toLowerCase();
    const quote = String(raw?.quoteType || raw?.extra?.quoteType || raw?.marketQuote || raw?.extra?.marketQuote || "").toLowerCase();
    const row = normalizeExchangeRow(raw);

    if (row.price === null || !Number.isFinite(Number(row.price))) continue;

    if (
      bucket.includes("domestic") ||
      bucket.includes("krw") ||
      quote === "krw" ||
      name.includes("upbit") ||
      name.includes("bithumb")
    ) {
      out.domestic_krw.push(row);
      continue;
    }

    if (
      bucket.includes("perp") ||
      bucket.includes("future") ||
      bucket.includes("futures") ||
      name.includes("perp") ||
      name.includes("future") ||
      name.includes("futures") ||
      name.includes("swap")
    ) {
      out.global_futures_usd.push(row);
      continue;
    }

    if (
      bucket.includes("spot") ||
      name.includes("spot") ||
      quote === "usdt" ||
      quote === "usd"
    ) {
      out.global_spot_usd.push(row);
    }
  }

  return {
    domestic_krw: dedupeExchangeRows(out.domestic_krw),
    global_spot_usd: dedupeExchangeRows(out.global_spot_usd),
    global_futures_usd: dedupeExchangeRows(out.global_futures_usd),
  };
}

function bucketScore(rows: ExchangeRow[], priority: number) {
  return rows.length * 100 + priority;
}

function pickUpstreamExchanges(parsed: any, symbol: string): ExchangeGroup {
  const symbolKey = String(symbol || "").trim().toUpperCase();
  const allExchangeGroup = groupAllExchanges(parsed?.all_exchanges);

  const candidates = [
    {
      label: "detail_exchanges",
      priority: 70,
      group: parsed?.detail_exchanges,
    },
    {
      label: "all_exchanges",
      priority: 65,
      group: allExchangeGroup,
    },
    {
      label: "item.exchanges",
      priority: 50,
      group: parsed?.item?.exchanges,
    },
    {
      label: "indicator.exchanges",
      priority: 40,
      group: parsed?.indicator?.exchanges,
    },
    {
      label: "indicators.payload.indicators[symbol].exchanges",
      priority: 30,
      group: parsed?.indicators?.payload?.indicators?.[symbolKey]?.exchanges,
    },
    {
      label: "indicator.payload.indicators[symbol].exchanges",
      priority: 20,
      group: parsed?.indicator?.payload?.indicators?.[symbolKey]?.exchanges,
    },
    {
      label: "item.indicator.exchanges",
      priority: 10,
      group: parsed?.item?.indicator?.exchanges,
    },
  ].map((candidate) => ({
    ...candidate,
    normalized:
      candidate.label === "all_exchanges"
        ? (candidate.group as ExchangeGroup)
        : normalizeExchangeGroup(candidate.group),
  }));

  const pickBestBucket = (bucket: BucketKey) => {
    let bestRows: ExchangeRow[] = [];
    let bestScore = -1;

    for (const candidate of candidates) {
      const rows = candidate.normalized[bucket];
      if (!rows.length) continue;

      const score = bucketScore(rows, candidate.priority);
      if (score > bestScore) {
        bestRows = rows;
        bestScore = score;
      }
    }

    return bestRows;
  };

  return {
    domestic_krw: pickBestBucket("domestic_krw"),
    global_spot_usd: pickBestBucket("global_spot_usd"),
    global_futures_usd: pickBestBucket("global_futures_usd"),
  };
}

function pickFirstValue(sources: any[], key: string) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function pickFxValue(parsed: any, sources: any[]) {
  const direct = pickFirstValue(sources, "rate_krw_usd") ?? pickFirstValue(sources, "fx_usdkrw");
  const directNumber = finiteNumberOrNull(direct);
  if (directNumber !== null) return directNumber;

  const fx = parsed?.fx ?? pickFirstValue(sources, "fx");
  const fxNumber = finiteNumberOrNull(fx);
  if (fxNumber !== null) return fxNumber;

  if (fx && typeof fx === "object") {
    return (
      finiteNumberOrNull(fx.rate_krw_usd) ??
      finiteNumberOrNull(fx.usdkrw) ??
      finiteNumberOrNull(fx.usd_krw) ??
      finiteNumberOrNull(fx.USDKRW) ??
      finiteNumberOrNull(fx.USD_KRW)
    );
  }

  return null;
}

function buildSlimItem(parsed: any, symbol: string, type: string | null, exchanges: ExchangeGroup) {
  const symbolKey = String(symbol || "").trim().toUpperCase();
  const sources = [
    parsed?.item,
    parsed?.indicator,
    parsed?.summary,
    parsed,
  ];

  const out: Record<string, any> = {
    symbol:
      pickFirstValue(sources, "symbol") ??
      parsed?.symbol ??
      symbolKey,
    canonical_symbol:
      pickFirstValue(sources, "canonical_symbol") ??
      parsed?.canonical_symbol ??
      parsed?.summary?.canonical_symbol ??
      `${symbolKey}USDT`,
    type:
      pickFirstValue(sources, "type") ??
      parsed?.type ??
      type ??
      null,
    ts:
      pickFirstValue(sources, "ts") ??
      parsed?.ts ??
      null,
    rate_krw_usd: pickFxValue(parsed, sources),
    fx: parsed?.fx ?? pickFirstValue(sources, "fx") ?? null,
    exchanges,
  };

  for (const key of SLIM_ITEM_KEYS) {
    const value = pickFirstValue(sources, key);
    if (value !== undefined) out[key] = value;
  }

  // 절대 큰 원본 스냅샷을 item 안에 다시 넣지 않습니다.
  delete out.prices;
  delete out.indicators;
  delete out.payload;
  delete out.item;
  delete out.indicator;

  return compactObject(out);
}

function flattenExchangeGroup(group: ExchangeGroup) {
  return dedupeExchangeRows([
    ...group.domestic_krw,
    ...group.global_spot_usd,
    ...group.global_futures_usd,
  ]);
}

function slimHistory(history: any) {
  if (!history || typeof history !== "object") return history ?? null;

  return compactObject({
    days: history.days,
    firstTs: history.firstTs ?? history.first_ts ?? null,
    lastTs: history.lastTs ?? history.last_ts ?? null,
    source: history.source ?? null,
  });
}

export async function GET(req: NextRequest) {
  try {
    const API_BASE = process.env.CAIN_VPS_API_BASE;
    const ORIGIN_SECRET =
      process.env.CAIN_VPS_ORIGIN_SECRET || process.env.ORIGIN_SECRET || "";

    if (!API_BASE) {
      return jsonError("Missing env: CAIN_VPS_API_BASE", 500);
    }

    const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
    const type = req.nextUrl.searchParams.get("type")?.trim() || null;
    const useNoStore = req.nextUrl.searchParams.get("nocache") === "1";

    if (!symbol) {
      return jsonError("Missing query: symbol", 400, useNoStore);
    }

    const qp = new URLSearchParams();
    qp.set("symbol", symbol);

    if (type) {
      qp.set("type", type);
    }

    if (useNoStore) {
      qp.set("nocache", "1");
    }

    const upstream = `${API_BASE.replace(/\/$/, "")}/personal-market-detail?${qp.toString()}`;

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (ORIGIN_SECRET) {
      headers["x-origin-secret"] = ORIGIN_SECRET;
    }

    const r = await fetch(upstream, {
      method: "GET",
      headers,
      cache: useNoStore ? "no-store" : "force-cache",
      next: useNoStore ? undefined : { revalidate: 5 },
    });

    const text = await r.text();

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return jsonError(
        `Upstream returned non-JSON (${r.status})`,
        502,
        useNoStore
      );
    }

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "upstream_error",
          upstreamStatus: r.status,
          message: parsed?.error || parsed?.message || "VPS detail upstream failed",
        },
        {
          status: 502,
          headers: cacheHeaders(true, {
            "X-Cain-Upstream": "error",
            "X-Cain-Slim": "1",
          }),
        }
      );
    }

    const normalizedExchanges = pickUpstreamExchanges(parsed, symbol);
    const symbolKey = symbol.toUpperCase();
    const normalizedItem = buildSlimItem(parsed, symbolKey, type, normalizedExchanges);
    const response = {
      __route_version: "detail-route-v6-slim",
      ok: Boolean(parsed?.ok ?? true),
      ts: parsed?.ts ?? normalizedItem.ts ?? new Date().toISOString(),
      type: normalizedItem.type ?? type,
      symbol: normalizedItem.symbol ?? symbolKey,
      canonical_symbol: normalizedItem.canonical_symbol ?? `${symbolKey}USDT`,
      fx: parsed?.fx ?? normalizedItem.fx ?? normalizedItem.rate_krw_usd ?? null,
      summary: parsed?.summary ?? null,
      detail_exchanges: normalizedExchanges,
      all_exchanges: flattenExchangeGroup(normalizedExchanges),
      history: slimHistory(parsed?.history),
      indicator: normalizedItem,
      item: normalizedItem,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: cacheHeaders(useNoStore, {
        "X-Cain-Cache": useNoStore ? "bypass" : "cdn",
        "X-Cain-Upstream": "ok",
        "X-Cain-Slim": "1",
      }),
    });
  } catch (e: any) {
    return jsonError(String(e?.message || e), 500);
  }
}