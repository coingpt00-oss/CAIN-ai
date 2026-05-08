// src/app/api/public/personal-markets/indicators/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VPS_API_BASE = (process.env.CAIN_VPS_API_BASE || "").replace(/\/+$/, "");
const VPS_ORIGIN_SECRET = process.env.CAIN_VPS_ORIGIN_SECRET || "";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type PersonalMarketsType = "spot" | "domestic-global" | "futures-spot";

type SparklineViewRow = {
  symbol: string;
  canonical_symbol?: string | null;

  spark_spot_7d_usd?: unknown;
  spark_spot_7d_krw?: unknown;
  spark_kimchi_3d?: unknown;
  spark_basis_3d?: unknown;

  spark_spot_7d_usd_count?: number | null;
  spark_spot_7d_krw_count?: number | null;
  spark_kimchi_3d_count?: number | null;
  spark_basis_3d_count?: number | null;

  spark_spot_7d_usd_updated_at?: string | null;
  spark_spot_7d_krw_updated_at?: string | null;
  spark_kimchi_3d_updated_at?: string | null;
  spark_basis_3d_updated_at?: string | null;
};

type LatestPmRow = {
  symbol: string;
  canonical_symbol?: string | null;
  rate_krw_usd?: number | null;
  kimchi_premium?: number | null;
  dominance?: string | null;
  volatility_ratio?: number | null;
  volatility_warn?: boolean | null;
  dispersion_krw?: number | null;
  dispersion_krw_domestic_spread?: number | null;
  dispersion_krw_global_spread?: number | null;
  delay_proxy?: number | null;
  score?: number | null;
  global_avg_usd?: number | null;
  korea_avg_krw?: number | null;
  futures_basis_pct?: number | null;
};

type ExRow = {
  name: string;
  price: number;
};

type Indicator = {
  symbol: string;
  canonical_symbol?: string | null;
  type?: PersonalMarketsType | null;

  score?: number | null;
  state?: string | null;
  source?: string | null;
  ts?: string | null;

  // spot
  global_avg_usd?: number | null;
  global_spread_usd?: number | null;
  global_spread_pct?: number | null;
  volatility_ratio?: number | null;
  volatility_warn?: boolean | null;
  global_spot_exchange_count?: number | null;

  // domestic-global
  rate_krw_usd?: number | null;
  domestic_avg_krw?: number | null;
  global_spot_avg_usd?: number | null;
  global_spot_avg_krw?: number | null;
  premium_pct?: number | null;
  side?: string | null;
  domestic_spread_krw?: number | null;
  dispersion_krw_domestic_spread?: number | null;
  global_spread_krw?: number | null;
  dispersion_krw_global_spread?: number | null;
  domestic_exchange_count?: number | null;
  dominance?: string | null;

  // futures-spot
  global_futures_avg_usd?: number | null;
  basis_pct?: number | null;
  futures_basis_pct?: number | null;
  delay_proxy?: number | null;
  global_perp_exchange_count?: number | null;

  exchanges?: any;

  // rank merge
  market_cap_rank?: number | null;
  rank_name?: string | null;
  rank_cg_id?: string | null;
  icon_url?: string | null;
  is_ranked?: boolean;
  sort_priority?: number;

  // sparkline raw
  spark_spot_7d_usd?: number[] | null;
  spark_spot_7d_krw?: number[] | null;
  spark_kimchi_3d?: number[] | null;
  spark_basis_3d?: number[] | null;

  spark_spot_7d_usd_count?: number | null;
  spark_spot_7d_krw_count?: number | null;
  spark_kimchi_3d_count?: number | null;
  spark_basis_3d_count?: number | null;

  spark_spot_7d_usd_updated_at?: string | null;
  spark_spot_7d_krw_updated_at?: string | null;
  spark_kimchi_3d_updated_at?: string | null;
  spark_basis_3d_updated_at?: string | null;

  // sparkline aliases for frontend
  sparkline_krw?: number[] | null;
  sparkline_usd?: number[] | null;
  sparkline_gap?: number[] | null;
  sparkline_basis?: number[] | null;
  sparkline_label?: string | null;
};

type IndicatorsPayload = {
  type?: string;
  ts?: string;
  base_ts?: string;
  indicators?: Record<string, Indicator>;
  items?: Indicator[];
};

function j(
  status: number,
  body: any,
  cacheControl?: string,
  extraHeaders?: Record<string, string>
) {
  const rawCacheControl = cacheControl || "public, s-maxage=15, stale-while-revalidate=45";
  const isNoStore = rawCacheControl.includes("no-store");
  const cdnCacheControl = rawCacheControl.startsWith("public")
    ? rawCacheControl
    : `public, ${rawCacheControl}`;

  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": isNoStore ? "no-store" : "public, max-age=0, must-revalidate",
      ...(isNoStore
        ? {}
        : {
            "CDN-Cache-Control": cdnCacheControl,
            "Vercel-CDN-Cache-Control": cdnCacheControl,
          }),
      ...(extraHeaders || {}),
    },
  });
}

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function hasSupabaseEnv() {
  return !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;
}

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: any): boolean | null {
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === 1) return true;
  if (v === 0) return false;
  return null;
}

function normalizeSymbol(v: any): string {
  return String(v || "").toUpperCase().trim();
}

function toNumArray(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  return arr.length >= 2 ? arr : null;
}

function firstNum(...values: any[]): number | null {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function firstBool(...values: any[]): boolean | null {
  for (const v of values) {
    const b = toBool(v);
    if (b !== null) return b;
  }
  return null;
}

async function sbFetch(path: string, query?: Record<string, string | number | null | undefined>) {
  if (!hasSupabaseEnv()) {
    throw new Error("supabase_env_missing");
  }

  const url = `${SUPABASE_URL}/rest/v1/${path}${buildQuery(query || {})}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      accept: "application/json",
    },
    next: {
      revalidate: 300,
    },
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`supabase_fetch_failed:${res.status}:${raw.slice(0, 300)}`);
  }

  return raw ? JSON.parse(raw) : null;
}

async function loadRankingsMap() {
  const rows = await sbFetch("coin_rankings", {
    select: "symbol,cg_id,name,image,market_cap_rank,updated_at",
    order: "market_cap_rank.asc",
    limit: 750,
  });

  const map = new Map<
    string,
    {
      symbol: string;
      cg_id: string | null;
      name: string | null;
      image: string | null;
      market_cap_rank: number | null;
    }
  >();

  for (const row of Array.isArray(rows) ? rows : []) {
    const symbol = normalizeSymbol(row?.symbol);
    if (!symbol) continue;

    map.set(symbol, {
      symbol,
      cg_id: row?.cg_id || null,
      name: row?.name || null,
      image: row?.image || null,
      market_cap_rank:
        Number.isFinite(Number(row?.market_cap_rank)) ? Number(row.market_cap_rank) : null,
    });
  }

  return map;
}

async function loadSparklineMap() {
  const rows = await sbFetch("v_pm_latest_with_sparklines", {
    select: [
      "symbol",
      "canonical_symbol",
      "spark_spot_7d_usd",
      "spark_spot_7d_krw",
      "spark_kimchi_3d",
      "spark_basis_3d",
      "spark_spot_7d_usd_count",
      "spark_spot_7d_krw_count",
      "spark_kimchi_3d_count",
      "spark_basis_3d_count",
      "spark_spot_7d_usd_updated_at",
      "spark_spot_7d_krw_updated_at",
      "spark_kimchi_3d_updated_at",
      "spark_basis_3d_updated_at",
    ].join(","),
    limit: 1000,
  });

  const map = new Map<string, SparklineViewRow>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const symbol = normalizeSymbol(row?.symbol);
    if (!symbol) continue;

    map.set(symbol, {
      symbol,
      canonical_symbol: row?.canonical_symbol || null,

      spark_spot_7d_usd: row?.spark_spot_7d_usd ?? null,
      spark_spot_7d_krw: row?.spark_spot_7d_krw ?? null,
      spark_kimchi_3d: row?.spark_kimchi_3d ?? null,
      spark_basis_3d: row?.spark_basis_3d ?? null,

      spark_spot_7d_usd_count: toNum(row?.spark_spot_7d_usd_count),
      spark_spot_7d_krw_count: toNum(row?.spark_spot_7d_krw_count),
      spark_kimchi_3d_count: toNum(row?.spark_kimchi_3d_count),
      spark_basis_3d_count: toNum(row?.spark_basis_3d_count),

      spark_spot_7d_usd_updated_at: row?.spark_spot_7d_usd_updated_at || null,
      spark_spot_7d_krw_updated_at: row?.spark_spot_7d_krw_updated_at || null,
      spark_kimchi_3d_updated_at: row?.spark_kimchi_3d_updated_at || null,
      spark_basis_3d_updated_at: row?.spark_basis_3d_updated_at || null,
    });
  }

  return map;
}

async function loadPmLatestMap() {
  const rows = await sbFetch("pm_latest", {
    select: [
      "symbol",
      "canonical_symbol",
      "rate_krw_usd",
      "kimchi_premium",
      "dominance",
      "volatility_ratio",
      "volatility_warn",
      "dispersion_krw",
      "dispersion_krw_domestic_spread",
      "dispersion_krw_global_spread",
      "delay_proxy",
      "score",
      "global_avg_usd",
      "korea_avg_krw",
      "futures_basis_pct",
    ].join(","),
    limit: 1000,
  });

  const map = new Map<string, LatestPmRow>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const symbol = normalizeSymbol(row?.symbol);
    const canonical = normalizeSymbol(row?.canonical_symbol);
    if (!symbol) continue;

    const normalized: LatestPmRow = {
      symbol,
      canonical_symbol: canonical || null,
      rate_krw_usd: toNum(row?.rate_krw_usd),
      kimchi_premium: toNum(row?.kimchi_premium),
      dominance: row?.dominance || null,
      volatility_ratio: toNum(row?.volatility_ratio),
      volatility_warn: toBool(row?.volatility_warn),
      dispersion_krw: toNum(row?.dispersion_krw),
      dispersion_krw_domestic_spread: toNum(row?.dispersion_krw_domestic_spread),
      dispersion_krw_global_spread: toNum(row?.dispersion_krw_global_spread),
      delay_proxy: toNum(row?.delay_proxy),
      score: toNum(row?.score),
      global_avg_usd: toNum(row?.global_avg_usd),
      korea_avg_krw: toNum(row?.korea_avg_krw),
      futures_basis_pct: toNum(row?.futures_basis_pct),
    };

    map.set(symbol, normalized);
    if (canonical) map.set(canonical, normalized);
  }

  return map;
}

async function loadLatestFxUsdKrwFromVps() {
  const url = `${VPS_API_BASE}/personal-market-detail?type=spot&symbol=BTC`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-origin-secret": VPS_ORIGIN_SECRET,
    },
    next: {
      revalidate: 15,
    },
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`vps_fx_fetch_failed:${res.status}:${raw.slice(0, 300)}`);
  }

  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error("vps_fx_bad_json");
  }

  const fx = json?.fx?.usdkrw ?? json?.summary?.fx?.usdkrw ?? null;
  const n = Number(fx);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toSortedIndicatorsObject(
  indicators: Record<string, Indicator>,
  rankingsMap: Map<
    string,
    {
      symbol: string;
      cg_id: string | null;
      name: string | null;
      image: string | null;
      market_cap_rank: number | null;
    }
  >,
  sparklineMap: Map<string, SparklineViewRow>,
  latestMap: Map<string, LatestPmRow>,
  latestFxUsdKrw: number | null,
  currentType: string
) {
  const items = Object.entries(indicators || {}).map(([symbol, indicator]) => {
    const key = normalizeSymbol(symbol || indicator?.symbol);
    const canonicalKey = normalizeSymbol(indicator?.canonical_symbol);

    const rankInfo = rankingsMap.get(key) || rankingsMap.get(canonicalKey) || null;
    const sparkInfo = sparklineMap.get(key) || sparklineMap.get(canonicalKey) || null;
    const latestInfo = latestMap.get(key) || latestMap.get(canonicalKey) || null;

    const itemFx = toNum(indicator?.rate_krw_usd);

    const merged: Indicator = {
      ...indicator,
      symbol: key,
      rate_krw_usd:
        itemFx && itemFx > 0
          ? itemFx
          : latestFxUsdKrw ?? latestInfo?.rate_krw_usd ?? null,

      premium_pct: firstNum(indicator?.premium_pct, latestInfo?.kimchi_premium),

      dominance: indicator?.dominance ?? latestInfo?.dominance ?? null,

      volatility_ratio: firstNum(indicator?.volatility_ratio, latestInfo?.volatility_ratio),

      volatility_warn: firstBool(indicator?.volatility_warn, latestInfo?.volatility_warn),

      domestic_spread_krw: firstNum(
        indicator?.domestic_spread_krw,
        indicator?.dispersion_krw_domestic_spread,
        latestInfo?.dispersion_krw_domestic_spread
      ),

      dispersion_krw_domestic_spread: firstNum(
        indicator?.dispersion_krw_domestic_spread,
        indicator?.domestic_spread_krw,
        latestInfo?.dispersion_krw_domestic_spread
      ),

      global_spread_krw: firstNum(
        indicator?.global_spread_krw,
        indicator?.dispersion_krw_global_spread,
        latestInfo?.dispersion_krw_global_spread
      ),

      dispersion_krw_global_spread: firstNum(
        indicator?.dispersion_krw_global_spread,
        indicator?.global_spread_krw,
        latestInfo?.dispersion_krw_global_spread
      ),

      delay_proxy: firstNum(indicator?.delay_proxy, latestInfo?.delay_proxy),

      score: firstNum(indicator?.score, latestInfo?.score),

      global_avg_usd: firstNum(indicator?.global_avg_usd, latestInfo?.global_avg_usd),

      market_cap_rank: rankInfo?.market_cap_rank ?? null,
      rank_name: rankInfo?.name ?? null,
      rank_cg_id: rankInfo?.cg_id ?? null,
      icon_url: rankInfo?.image ?? null,
      is_ranked: Number.isFinite(Number(rankInfo?.market_cap_rank)),
      sort_priority: Number.isFinite(Number(rankInfo?.market_cap_rank))
        ? Number(rankInfo?.market_cap_rank)
        : 999999,

      spark_spot_7d_usd: toNumArray(sparkInfo?.spark_spot_7d_usd),
      spark_spot_7d_krw: toNumArray(sparkInfo?.spark_spot_7d_krw),
      spark_kimchi_3d: toNumArray(sparkInfo?.spark_kimchi_3d),
      spark_basis_3d: toNumArray(sparkInfo?.spark_basis_3d),

      spark_spot_7d_usd_count: sparkInfo?.spark_spot_7d_usd_count ?? null,
      spark_spot_7d_krw_count: sparkInfo?.spark_spot_7d_krw_count ?? null,
      spark_kimchi_3d_count: sparkInfo?.spark_kimchi_3d_count ?? null,
      spark_basis_3d_count: sparkInfo?.spark_basis_3d_count ?? null,

      spark_spot_7d_usd_updated_at: sparkInfo?.spark_spot_7d_usd_updated_at ?? null,
      spark_spot_7d_krw_updated_at: sparkInfo?.spark_spot_7d_krw_updated_at ?? null,
      spark_kimchi_3d_updated_at: sparkInfo?.spark_kimchi_3d_updated_at ?? null,
      spark_basis_3d_updated_at: sparkInfo?.spark_basis_3d_updated_at ?? null,
    };

    if (currentType === "spot") {
      merged.sparkline_krw = merged.spark_spot_7d_krw ?? null;
      merged.sparkline_usd = merged.spark_spot_7d_usd ?? null;
      merged.sparkline_label = "최근 평균가 7일";
    } else if (currentType === "domestic-global") {
      merged.sparkline_gap = merged.spark_kimchi_3d ?? null;
      merged.sparkline_label = "괴리율 추이 3일";
    } else if (currentType === "futures-spot") {
      merged.sparkline_basis = merged.spark_basis_3d ?? null;
      merged.sparkline_label = "베이시스 추이 3일";
    }

    return merged;
  });

  items.sort((a, b) => {
    const aRank = Number.isFinite(Number(a.market_cap_rank)) ? Number(a.market_cap_rank) : 999999;
    const bRank = Number.isFinite(Number(b.market_cap_rank)) ? Number(b.market_cap_rank) : 999999;

    if (aRank !== bRank) return aRank - bRank;

    const aScore = Number.isFinite(Number(a.score)) ? Number(a.score) : -999999;
    const bScore = Number.isFinite(Number(b.score)) ? Number(b.score) : -999999;

    if (aScore !== bScore) return bScore - aScore;

    return String(a.symbol || "").localeCompare(String(b.symbol || ""));
  });

  const sortedIndicators: Record<string, Indicator> = {};
  for (const item of items) {
    sortedIndicators[item.symbol] = item;
  }

  return {
    indicators: sortedIndicators,
    items,
  };
}

function toPublicExchangeRows(rows: any): ExRow[] | undefined {
  if (!Array.isArray(rows)) return undefined;

  const out = rows
    .map((row) => {
      const name = String(row?.label || row?.name || row?.exchange || "").trim();
      const price = firstNum(row?.price_usd, row?.price);
      if (!name || price === null) return null;
      return {
        name,
        price,
      };
    })
    .filter(Boolean) as ExRow[];

  return out.length ? out : undefined;
}

function toPublicIndicatorItem(item: Indicator, currentType: string): Indicator {
  const type = String(currentType || item?.type || "").trim().toLowerCase();

  const base: Indicator = {
    symbol: item.symbol,
    canonical_symbol: item.canonical_symbol ?? null,
    type: (item.type || type || null) as PersonalMarketsType | null,
    state: item.state ?? null,
    score: item.score ?? null,
    source: item.source ?? null,
    ts: item.ts ?? null,

    rate_krw_usd: item.rate_krw_usd ?? null,

    market_cap_rank: item.market_cap_rank ?? null,
    rank_name: item.rank_name ?? null,
    rank_cg_id: item.rank_cg_id ?? null,
    icon_url: item.icon_url ?? null,
    is_ranked: item.is_ranked ?? false,
    sort_priority: item.sort_priority ?? 999999,

    sparkline_label: item.sparkline_label ?? null,
  };

  if (type === "spot") {
    return {
      ...base,

      global_avg_usd: item.global_avg_usd ?? null,
      global_spread_usd: item.global_spread_usd ?? null,
      global_spread_pct: item.global_spread_pct ?? null,
      volatility_ratio: item.volatility_ratio ?? null,
      volatility_warn: item.volatility_warn ?? null,
      global_spot_exchange_count: item.global_spot_exchange_count ?? null,

      exchanges: {
        global_spot_usd: toPublicExchangeRows(item.exchanges?.global_spot_usd),
      },

      sparkline_krw: item.sparkline_krw ?? null,
      sparkline_usd: item.sparkline_usd ?? null,
      sparkline_label: item.sparkline_label ?? "최근 평균가 7일",
    };
  }

  if (type === "domestic-global") {
    return {
      ...base,

      domestic_avg_krw: item.domestic_avg_krw ?? null,
      global_spot_avg_usd: item.global_spot_avg_usd ?? null,
      global_spot_avg_krw: item.global_spot_avg_krw ?? null,
      premium_pct: item.premium_pct ?? null,
      side: item.side ?? null,

      domestic_spread_krw: item.domestic_spread_krw ?? null,
      dispersion_krw_domestic_spread: item.dispersion_krw_domestic_spread ?? null,
      global_spread_krw: item.global_spread_krw ?? null,
      dispersion_krw_global_spread: item.dispersion_krw_global_spread ?? null,

      domestic_exchange_count: item.domestic_exchange_count ?? null,
      global_spot_exchange_count: item.global_spot_exchange_count ?? null,
      dominance: item.dominance ?? null,

      sparkline_gap: item.sparkline_gap ?? null,
      sparkline_label: item.sparkline_label ?? "괴리율 추이 3일",
    };
  }

  if (type === "futures-spot") {
    return {
      ...base,

      global_spot_avg_usd: item.global_spot_avg_usd ?? null,
      global_futures_avg_usd: item.global_futures_avg_usd ?? null,
      basis_pct: item.basis_pct ?? null,
      futures_basis_pct: item.futures_basis_pct ?? null,
      side: item.side ?? null,
      delay_proxy: item.delay_proxy ?? null,
      global_spot_exchange_count: item.global_spot_exchange_count ?? null,
      global_perp_exchange_count: item.global_perp_exchange_count ?? null,

      sparkline_basis: item.sparkline_basis ?? null,
      sparkline_label: item.sparkline_label ?? "베이시스 추이 3일",
    };
  }

  return base;
}

function toIndicatorsMap(items: Indicator[]) {
  const out: Record<string, Indicator> = {};
  for (const item of items) {
    const key = normalizeSymbol(item?.symbol);
    if (!key) continue;
    out[key] = item;
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    if (!VPS_API_BASE) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "CAIN_VPS_API_BASE is not set",
        },
        "no-store"
      );
    }

    if (!VPS_ORIGIN_SECRET) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "CAIN_VPS_ORIGIN_SECRET is not set",
        },
        "no-store"
      );
    }

    if (!hasSupabaseEnv()) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
        },
        "no-store"
      );
    }

    const url = new URL(req.url);
    const symbol = normalizeSymbol(url.searchParams.get("symbol"));
    const type = String(url.searchParams.get("type") || "").trim().toLowerCase() as PersonalMarketsType | "";
    const includeMap = url.searchParams.get("include_map") === "1";

    const qs = buildQuery({
      symbol: symbol || undefined,
      type: type || undefined,
    });

    const upstreamUrl = `${VPS_API_BASE}/personal-indicators${qs}`;

    const [upstreamRes, rankingsMap, sparklineMap, latestMap, latestFxUsdKrw] = await Promise.all([
      fetch(upstreamUrl, {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-origin-secret": VPS_ORIGIN_SECRET,
        },
        next: {
          revalidate: 15,
        },
      }),
      loadRankingsMap(),
      loadSparklineMap(),
      loadPmLatestMap(),
      loadLatestFxUsdKrwFromVps(),
    ]);

    const raw = await upstreamRes.text();

    if (!upstreamRes.ok) {
      let parsed: any = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        return j(
          upstreamRes.status,
          {
            ok: false,
            error: "upstream_error",
            detail: raw?.slice(0, 300) || "Non-JSON upstream error",
            upstreamStatus: upstreamRes.status,
            upstreamUrl,
          },
          "no-store"
        );
      }

      return j(
        upstreamRes.status,
        parsed || {
          ok: false,
          error: "upstream_error",
          upstreamStatus: upstreamRes.status,
          upstreamUrl,
        },
        "no-store"
      );
    }

    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return j(
        502,
        {
          ok: false,
          error: "bad_upstream_json",
          detail: raw?.slice(0, 300) || "VPS returned non-JSON response",
          upstreamStatus: upstreamRes.status,
          upstreamUrl,
        },
        "no-store"
      );
    }

    const payload: IndicatorsPayload = data?.payload || {};
    const indicators = payload?.indicators || {};

    const currentPayloadType = type || payload?.type || data?.type || "";

    const { items } = toSortedIndicatorsObject(
      indicators,
      rankingsMap,
      sparklineMap,
      latestMap,
      latestFxUsdKrw,
      currentPayloadType
    );

    const publicItems = items.map((item) => toPublicIndicatorItem(item, currentPayloadType));
    const publicIndicators = includeMap ? toIndicatorsMap(publicItems) : {};

    const merged = {
      ...data,
      type: data?.type || payload?.type || type || null,
      payload: {
        type: payload?.type || data?.type || type || null,
        ts: payload?.ts || data?.ts || null,
        base_ts: payload?.base_ts || null,
        indicators: publicIndicators,
        items: publicItems,
      },
      meta: {
        ...(data?.meta || {}),
        ranking_source: "coin_rankings",
        ranking_count: rankingsMap.size,
        sparkline_source: "v_pm_latest_with_sparklines",
        sparkline_count: sparklineMap.size,
        latest_source: "pm_latest",
        latest_count: latestMap.size,
        default_sort: "market_cap_rank",
        fx_usdkrw: latestFxUsdKrw,
        slim: true,
        indicators_map_included: includeMap,
      },
    };

    return j(200, merged, "s-maxage=15, stale-while-revalidate=45");
  } catch (e: any) {
    return j(
      500,
      {
        ok: false,
        error: "unexpected",
        detail: String(e?.message || e),
      },
      "no-store"
    );
  }
}