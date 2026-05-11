// src/app/api/public/personal-markets/chart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseSupabaseClient = SupabaseClient<any, "public", any>;

type MarketType = "spot" | "domestic-global" | "futures-spot";
type RangeKey = "1h" | "24h" | "7d" | "30d" | "90d" | "180d" | "1y" | "all";
type UnitKey =
  | "usd"
  | "krw"
  | "percent"
  | "score"
  | "count"
  | "flag"
  | "dominance"
  | "unknown";

type ChartPoint = {
  ts: string;
  value: number | null;
};

type ChartSeries = {
  key: string;
  label: string;
  unit: UnitKey;
  chartType: "line" | "area" | "line-compare";
  group?: string;
  description?: string;
  data: ChartPoint[];
};

type StateBand = {
  state: string;
  from: string;
  to: string;
};

type LatestState = {
  state: string | null;
  stateSince: string | null;
  lastChangedAt: string | null;
  lastUpdatedAt: string | null;
};

type SnapshotRow = {
  symbol: string | null;
  canonical_symbol?: string | null;
  type?: string | null;
  ts: string;

  // legacy persist fields
  kimchi_premium?: number | null;
  score?: number | null;
  futures_basis_pct?: number | null;
  dispersion_krw?: number | null;
  dispersion_krw_domestic_spread?: number | null;
  dispersion_krw_global_spread?: number | null;
  delay_proxy?: number | null;
  dominance?: string | null;
  volatility_warn?: boolean | number | null;

  // newer / preferred fields if pm_snapshots_3m has already been expanded
  premium_pct?: number | null;
  domestic_avg_krw?: number | null;
  global_spot_avg_krw?: number | null;
  domestic_spread_krw?: number | null;
  global_spread_krw?: number | null;
  global_spread_pct?: number | null;
  global_avg_usd?: number | null;
  global_spot_avg_usd?: number | null;
  global_futures_avg_usd?: number | null;
  basis_pct?: number | null;
  volatility_ratio?: number | null;
  premium_krw_gap?: number | null;
  price_gap_usd?: number | null;
  domestic_exchange_count?: number | null;
  global_spot_exchange_count?: number | null;
  global_perp_exchange_count?: number | null;
};

type StateRow = {
  symbol: string | null;
  current_state: string | null;
  state_since: string | null;
  last_changed_at: string | null;
  last_updated_at?: string | null;
};

type ChartResponseBody = {
  ok: true;
  type: MarketType;
  symbol: string;
  canonical_symbol: string;
  range: RangeKey;
  from: string;
  to: string;
  series: ChartSeries[];
  chartTabs: Array<{
    key: string;
    label: string;
    seriesKeys: string[];
  }>;
  stateBands: StateBand[];
  latestState: LatestState | null;
  meta: {
    source: "supabase";
    snapshotsTable: "pm_chart_points_15m" | "pm_chart_points_1d";
    stateTable: "pm_state";
    bucket: "15m" | "1d";
    rawPoints: number;
    filteredPoints: number;
    returnedPoints: number;
    supportedRanges: string[];
    availableSeriesKeys: string[];
    notes: string[];
    cache: {
      key: string;
      ttlSeconds: number;
      servedFrom: "memory" | "fresh";
      generatedAt: string;
    };
  };
};

type CachedChartEntry = {
  body: ChartResponseBody;
  generatedAt: number;
  expiresAt: number;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const responseCache = new Map<string, CachedChartEntry>();
const inflightRequests = new Map<string, Promise<ChartResponseBody>>();

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function badRequest(message: string) {
  return json({ ok: false, error: message }, { status: 400, headers: noStoreHeaders() });
}

function serverError(message: string) {
  return json({ ok: false, error: message }, { status: 500, headers: noStoreHeaders() });
}

function normalizeType(raw: string | null): MarketType {
  const v = String(raw || "spot").trim().toLowerCase();
  if (v === "domestic-global") return "domestic-global";
  if (v === "futures-spot") return "futures-spot";
  return "spot";
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

function parseRange(raw: string | null): RangeKey {
  const v = String(raw || "24h").trim().toLowerCase();

  if (v === "1h") return "1h";
  if (v === "24h" || v === "1d") return "24h";
  if (v === "7d") return "7d";
  if (v === "30d") return "30d";
  if (v === "90d") return "90d";
  if (v === "180d") return "180d";
  if (v === "1y" || v === "365d") return "1y";
  if (v === "all" || v === "max") return "all";

  return "24h";
}

function rangeToFromIso(range: RangeKey): string {
  const now = Date.now();

  const map: Record<Exclude<RangeKey, "all">, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "180d": 180 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000,
  };

  if (range === "all") {
    return "1970-01-01T00:00:00.000Z";
  }

  return new Date(now - map[range]).toISOString();
}

function targetPointsByRange(range: RangeKey): number {
  if (range === "1h") return 60;
  if (range === "24h") return 240;
  if (range === "7d") return 336;
  if (range === "30d") return 720;
  if (range === "90d") return 1200;
  if (range === "180d") return 360;
  if (range === "1y") return 365;
  return 1000;
}

function ttlSecondsByRange(range: RangeKey): number {
  if (range === "1h") return 20;
  if (range === "24h") return 45;
  if (range === "7d") return 120;
  if (range === "30d") return 300;
  if (range === "90d") return 600;
  if (range === "180d") return 900;
  if (range === "1y") return 1800;
  return 3600;
}

function shouldUseDailyPoints(range: RangeKey): boolean {
  return range === "180d" || range === "1y" || range === "all";
}

function buildCacheKey(type: MarketType, symbolBase: string, range: RangeKey): string {
  return `${type}:${symbolBase}:${range}`;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boolishToNumeric(value: boolean | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function dominanceToNumeric(value: string | null | undefined): number | null {
  if (!value) return null;

  const v = value.trim().toUpperCase();

  if (
    v === "KR_ACTIVE" ||
    v === "KR" ||
    v === "DOMESTIC" ||
    v === "KOREA" ||
    v === "KOREAN" ||
    v === "DOMESTIC_PREMIUM"
  ) {
    return 1;
  }

  if (
    v === "GLOBAL_ACTIVE" ||
    v === "GLOBAL" ||
    v === "OVERSEAS" ||
    v === "INTL" ||
    v === "GLOBAL_DISCOUNT"
  ) {
    return -1;
  }

  if (v === "WATCH" || v === "NEUTRAL" || v === "NOISE" || v === "STABLE") {
    return 0;
  }

  return null;
}

function downsample<T>(arr: T[], targetMaxPoints: number): T[] {
  if (arr.length <= targetMaxPoints) return arr;
  if (targetMaxPoints <= 0) return arr;

  const step = Math.ceil(arr.length / targetMaxPoints);
  const sampled: T[] = [];

  for (let i = 0; i < arr.length; i += step) {
    sampled.push(arr[i]);
  }

  const last = arr[arr.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled;
}

function sortRowsByTs(rows: SnapshotRow[]): SnapshotRow[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.ts).getTime();
    const tb = new Date(b.ts).getTime();
    return ta - tb;
  });
}

function buildCurrentStateBand(stateRow: StateRow | null, fromIso: string): StateBand[] {
  if (!stateRow?.current_state) return [];

  const nowIso = new Date().toISOString();
  const stateFrom = stateRow.state_since || stateRow.last_changed_at || fromIso;

  const fromMs = new Date(fromIso).getTime();
  const bandFromMs = new Date(stateFrom).getTime();

  const effectiveFrom =
    Number.isFinite(bandFromMs) && bandFromMs > fromMs ? stateFrom : fromIso;

  return [
    {
      state: stateRow.current_state,
      from: effectiveFrom,
      to: nowIso,
    },
  ];
}

function mapSeries(
  rows: SnapshotRow[],
  key: string,
  getter: (row: SnapshotRow) => number | null,
  options: Omit<ChartSeries, "key" | "data">,
): ChartSeries {
  return {
    key,
    ...options,
    data: rows.map((row) => ({
      ts: row.ts,
      value: getter(row),
    })),
  };
}

function filterEmptySeries(series: ChartSeries[]): ChartSeries[] {
  return series.filter((item) => item.data.some((point) => point.value !== null));
}

function getPremiumPct(row: SnapshotRow): number | null {
  return toNumberOrNull(row.premium_pct ?? row.kimchi_premium);
}

function getPremiumKrwGap(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.premium_krw_gap);
  if (direct !== null) return direct;
  return toNumberOrNull(row.dispersion_krw);
}

function getDomesticSpreadKrw(row: SnapshotRow): number | null {
  return toNumberOrNull(row.domestic_spread_krw ?? row.dispersion_krw_domestic_spread);
}

function getGlobalSpreadKrw(row: SnapshotRow): number | null {
  return toNumberOrNull(row.global_spread_krw ?? row.dispersion_krw_global_spread);
}

function getBasisPct(row: SnapshotRow): number | null {
  return toNumberOrNull(row.basis_pct ?? row.futures_basis_pct);
}

function getDelayProxy(row: SnapshotRow): number | null {
  return toNumberOrNull(row.delay_proxy);
}

function getVolatilityWarnNumeric(row: SnapshotRow): number | null {
  return boolishToNumeric(row.volatility_warn);
}

function getDominanceNumeric(row: SnapshotRow): number | null {
  return dominanceToNumeric(row.dominance);
}

function getScore(row: SnapshotRow): number | null {
  return toNumberOrNull(row.score);
}

function getGlobalAvgUsd(row: SnapshotRow): number | null {
  return toNumberOrNull(row.global_avg_usd ?? row.global_spot_avg_usd);
}

function getGlobalSpreadPct(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.global_spread_pct);
  if (direct !== null) return direct;

  const spreadKrw = getGlobalSpreadKrw(row);
  const globalSpotKrw = toNumberOrNull(row.global_spot_avg_krw);
  if (spreadKrw === null || globalSpotKrw === null || globalSpotKrw === 0) return null;

  return (spreadKrw / globalSpotKrw) * 100;
}

function getPriceGapUsd(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.price_gap_usd);
  if (direct !== null) return direct;

  const futuresAvg = toNumberOrNull(row.global_futures_avg_usd);
  const spotAvg = toNumberOrNull(row.global_spot_avg_usd ?? row.global_avg_usd);
  if (futuresAvg === null || spotAvg === null) return null;

  return futuresAvg - spotAvg;
}

function buildSpotSeries(rows: SnapshotRow[]): ChartSeries[] {
  return filterEmptySeries([
    mapSeries(rows, "global_avg_usd", getGlobalAvgUsd, {
      label: "글로벌 평균가",
      unit: "usd",
      chartType: "area",
      group: "price",
      description: "글로벌 현물 평균가 추이",
    }),
    mapSeries(rows, "global_spread_pct", getGlobalSpreadPct, {
      label: "거래소 벌어짐 %",
      unit: "percent",
      chartType: "line",
      group: "spread",
      description: "거래소 간 가격 벌어짐 비율",
    }),
    mapSeries(rows, "global_spread_krw", getGlobalSpreadKrw, {
      label: "글로벌 내부 벌어짐",
      unit: "krw",
      chartType: "line",
      group: "spread",
      description: "글로벌 거래소 간 원화 환산 벌어짐",
    }),
    mapSeries(rows, "score", getScore, {
      label: "점수",
      unit: "score",
      chartType: "line",
      group: "state",
      description: "상태 점수 추이",
    }),
    mapSeries(rows, "volatility_warn", getVolatilityWarnNumeric, {
      label: "변동성 경고",
      unit: "flag",
      chartType: "line",
      group: "risk",
      description: "변동성 경고 플래그",
    }),
  ]);
}

function buildDomesticGlobalSeries(rows: SnapshotRow[]): ChartSeries[] {
  return filterEmptySeries([
    mapSeries(rows, "premium_pct", getPremiumPct, {
      label: "괴리율",
      unit: "percent",
      chartType: "line",
      group: "premium",
      description: "국내/해외 괴리율 추이",
    }),
    mapSeries(rows, "premium_krw_gap", getPremiumKrwGap, {
      label: "실제 원화 차이",
      unit: "krw",
      chartType: "area",
      group: "premium",
      description: "국내-해외 환산 실제 원화 차이",
    }),
    mapSeries(rows, "domestic_spread_krw", getDomesticSpreadKrw, {
      label: "국내 내부 분산",
      unit: "krw",
      chartType: "line",
      group: "spread",
      description: "국내 거래소끼리의 가격 차이",
    }),
    mapSeries(rows, "global_spread_krw", getGlobalSpreadKrw, {
      label: "해외 내부 분산",
      unit: "krw",
      chartType: "line",
      group: "spread",
      description: "해외 거래소끼리의 원화 환산 가격 차이",
    }),
    mapSeries(rows, "dominance", getDominanceNumeric, {
      label: "주도권",
      unit: "dominance",
      chartType: "line",
      group: "state",
      description: "국내/해외 어느 쪽 영향이 큰지 수치화",
    }),
    mapSeries(rows, "score", getScore, {
      label: "점수",
      unit: "score",
      chartType: "line",
      group: "state",
      description: "상태 점수 추이",
    }),
  ]);
}

function buildFuturesSpotSeries(rows: SnapshotRow[]): ChartSeries[] {
  return filterEmptySeries([
    mapSeries(rows, "basis_pct", getBasisPct, {
      label: "베이시스",
      unit: "percent",
      chartType: "line",
      group: "basis",
      description: "선/현물 베이시스 추이",
    }),
    mapSeries(rows, "price_gap_usd", getPriceGapUsd, {
      label: "실제 달러 가격차",
      unit: "usd",
      chartType: "area",
      group: "basis",
      description: "선물 평균가 - 현물 평균가",
    }),
    mapSeries(rows, "delay_proxy", getDelayProxy, {
      label: "동조/지연",
      unit: "percent",
      chartType: "line",
      group: "state",
      description: "구조 지연/동조 추이",
    }),
    mapSeries(rows, "score", getScore, {
      label: "점수",
      unit: "score",
      chartType: "line",
      group: "state",
      description: "상태 점수 추이",
    }),
  ]);
}

function buildSeriesByType(type: MarketType, rows: SnapshotRow[]): ChartSeries[] {
  if (type === "domestic-global") return buildDomesticGlobalSeries(rows);
  if (type === "futures-spot") return buildFuturesSpotSeries(rows);
  return buildSpotSeries(rows);
}

function buildChartTabs(type: MarketType, series: ChartSeries[]) {
  const keys = series.map((item) => item.key);

  if (type === "domestic-global") {
    return [
      {
        key: "premium",
        label: "괴리 구조",
        seriesKeys: keys.filter((k) => ["premium_pct", "premium_krw_gap"].includes(k)),
      },
      {
        key: "spread",
        label: "국내/해외 분산",
        seriesKeys: keys.filter((k) =>
          ["domestic_spread_krw", "global_spread_krw"].includes(k),
        ),
      },
      {
        key: "state",
        label: "주도권 / 점수",
        seriesKeys: keys.filter((k) => ["dominance", "score"].includes(k)),
      },
    ].filter((item) => item.seriesKeys.length > 0);
  }

  if (type === "futures-spot") {
    return [
      {
        key: "basis",
        label: "베이시스",
        seriesKeys: keys.filter((k) => ["basis_pct", "price_gap_usd"].includes(k)),
      },
      {
        key: "state",
        label: "동조 / 점수",
        seriesKeys: keys.filter((k) => ["delay_proxy", "score"].includes(k)),
      },
    ].filter((item) => item.seriesKeys.length > 0);
  }

  return [
    {
      key: "price",
      label: "가격 / 벌어짐",
      seriesKeys: keys.filter((k) =>
        ["global_avg_usd", "global_spread_pct", "global_spread_krw"].includes(k),
      ),
    },
    {
      key: "risk",
      label: "상태 / 경고",
      seriesKeys: keys.filter((k) => ["score", "volatility_warn"].includes(k)),
    },
  ].filter((item) => item.seriesKeys.length > 0);
}

async function fetchSnapshots(
  supabase: LooseSupabaseClient,
  symbolBase: string,
  canonical: string,
  fromIso: string,
): Promise<SnapshotRow[]> {
  const candidates = Array.from(new Set([symbolBase, canonical]));

  const { data, error } = await supabase
    .from("pm_snapshots_3m")
    .select("*")
    .in("symbol", candidates)
    .gte("ts", fromIso)
    .order("ts", { ascending: true });

  if (error) {
    throw new Error(`pm_snapshots_3m query failed: ${error.message}`);
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    symbol: (row.symbol as string | null) ?? null,
    canonical_symbol: (row.canonical_symbol as string | null) ?? null,
    type: (row.type as string | null) ?? null,
    ts: String(row.ts),

    kimchi_premium: toNumberOrNull(row.kimchi_premium),
    score: toNumberOrNull(row.score),
    futures_basis_pct: toNumberOrNull(row.futures_basis_pct),
    dispersion_krw: toNumberOrNull(row.dispersion_krw),
    dispersion_krw_domestic_spread: toNumberOrNull(row.dispersion_krw_domestic_spread),
    dispersion_krw_global_spread: toNumberOrNull(row.dispersion_krw_global_spread),
    delay_proxy: toNumberOrNull(row.delay_proxy),
    dominance: row.dominance ? String(row.dominance) : null,
    volatility_warn:
      typeof row.volatility_warn === "boolean"
        ? row.volatility_warn
        : row.volatility_warn == null
          ? null
          : Number(row.volatility_warn),

    premium_pct: toNumberOrNull(row.premium_pct),
    domestic_avg_krw: toNumberOrNull(row.domestic_avg_krw),
    global_spot_avg_krw: toNumberOrNull(row.global_spot_avg_krw),
    domestic_spread_krw: toNumberOrNull(row.domestic_spread_krw),
    global_spread_krw: toNumberOrNull(row.global_spread_krw),
    global_spread_pct: toNumberOrNull(row.global_spread_pct),
    global_avg_usd: toNumberOrNull(row.global_avg_usd),
    global_spot_avg_usd: toNumberOrNull(row.global_spot_avg_usd),
    global_futures_avg_usd: toNumberOrNull(row.global_futures_avg_usd),
    basis_pct: toNumberOrNull(row.basis_pct),
    volatility_ratio: toNumberOrNull(row.volatility_ratio),
    premium_krw_gap: toNumberOrNull(row.premium_krw_gap),
    price_gap_usd: toNumberOrNull(row.price_gap_usd),
    domestic_exchange_count: toNumberOrNull(row.domestic_exchange_count),
    global_spot_exchange_count: toNumberOrNull(row.global_spot_exchange_count),
    global_perp_exchange_count: toNumberOrNull(row.global_perp_exchange_count),
  }));
}

function toDbMarketType(type: MarketType): string {
  if (type === "domestic-global") return "domestic_global";
  if (type === "futures-spot") return "futures_spot";
  return "spot";
}

async function fetchChartPoints(
  supabase: LooseSupabaseClient,
  type: MarketType,
  symbolBase: string,
  range: RangeKey,
): Promise<SnapshotRow[]> {
  const { data, error } = await supabase.rpc("get_pm_chart_points", {
    p_type: toDbMarketType(type),
    p_symbol: symbolBase,
    p_period: range,
  });

  if (error) {
    throw new Error(`get_pm_chart_points rpc failed: ${error.message}`);
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const globalAvgUsd = toNumberOrNull(row.global_avg_usd);
    const kimchiPremium = toNumberOrNull(row.kimchi_premium);
    const futuresBasisPct = toNumberOrNull(row.futures_basis_pct);
    const dispersionKrw = toNumberOrNull(row.dispersion_krw);
    const delayProxy = toNumberOrNull(row.delay_proxy);
    const volatilityRatio = toNumberOrNull(row.volatility_ratio);

    return {
      symbol: (row.symbol as string | null) ?? null,
      canonical_symbol: (row.canonical_symbol as string | null) ?? null,
      type: (row.type as string | null) ?? null,
      ts: String(row.bucket_ts),

      kimchi_premium: kimchiPremium,
      score: toNumberOrNull(row.score),
      futures_basis_pct: futuresBasisPct,
      dispersion_krw: dispersionKrw,
      dispersion_krw_domestic_spread: null,
      dispersion_krw_global_spread: dispersionKrw,
      delay_proxy: delayProxy,
      dominance: null,
      volatility_warn: null,

      premium_pct: kimchiPremium,
      domestic_avg_krw: toNumberOrNull(row.korea_avg_krw),
      global_spot_avg_krw: null,
      domestic_spread_krw: null,
      global_spread_krw: dispersionKrw,
      global_spread_pct: null,
      global_avg_usd: globalAvgUsd,
      global_spot_avg_usd: globalAvgUsd,
      global_futures_avg_usd: null,
      basis_pct: futuresBasisPct,
      volatility_ratio: volatilityRatio,
      premium_krw_gap: dispersionKrw,
      price_gap_usd: null,
      domestic_exchange_count: null,
      global_spot_exchange_count: null,
      global_perp_exchange_count: null,
    };
  });
}


async function fetchLatestState(
  supabase: LooseSupabaseClient,
  symbolBase: string,
  canonical: string,
): Promise<StateRow | null> {
  const candidates = Array.from(new Set([symbolBase, canonical]));

  const { data, error } = await supabase
    .from("pm_state")
    .select("symbol,current_state,state_since,last_changed_at,last_updated_at")
    .in("symbol", candidates)
    .order("last_updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`pm_state query failed: ${error.message}`);
  }

  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    symbol: (row.symbol as string | null) ?? null,
    current_state: (row.current_state as string | null) ?? null,
    state_since: (row.state_since as string | null) ?? null,
    last_changed_at: (row.last_changed_at as string | null) ?? null,
    last_updated_at: (row.last_updated_at as string | null) ?? null,
  };
}

function maybeFilterRowsByType(rows: SnapshotRow[], type: MarketType): SnapshotRow[] {
  const typedRows = rows.filter((row) => {
    const rowType = String(row.type || "").trim().toLowerCase();
    return rowType === type;
  });

  return typedRows.length > 0 ? typedRows : rows;
}

function cloneBodyWithCacheMeta(
  body: ChartResponseBody,
  key: string,
  ttlSeconds: number,
  servedFrom: "memory" | "fresh",
  generatedAt: number,
): ChartResponseBody {
  return {
    ...body,
    meta: {
      ...body.meta,
      cache: {
        key,
        ttlSeconds,
        servedFrom,
        generatedAt: new Date(generatedAt).toISOString(),
      },
    },
  };
}

async function buildChartResponseBody(
  supabase: LooseSupabaseClient,
  type: MarketType,
  symbolBase: string,
  canonical: string,
  range: RangeKey,
): Promise<ChartResponseBody> {
  const fromIso = rangeToFromIso(range);
  const useDailyPoints = shouldUseDailyPoints(range);
  const snapshotsTable = useDailyPoints ? "pm_chart_points_1d" : "pm_chart_points_15m";
  const bucket = useDailyPoints ? "1d" : "15m";

  const [snapshotRows, latestState] = await Promise.all([
    fetchChartPoints(supabase, type, symbolBase, range),
    fetchLatestState(supabase, symbolBase, canonical),
  ]);

  const filteredRows = maybeFilterRowsByType(sortRowsByTs(snapshotRows), type);
  const sampledRows = downsample(filteredRows, targetPointsByRange(range));
  const series = buildSeriesByType(type, sampledRows);
  const chartTabs = buildChartTabs(type, series);

  return {
    ok: true,
    type,
    symbol: symbolBase,
    canonical_symbol: canonical,
    range,
    from: fromIso,
    to: new Date().toISOString(),
    series,
    chartTabs,
    stateBands: buildCurrentStateBand(latestState, fromIso),
    latestState: latestState
      ? {
          state: latestState.current_state,
          stateSince: latestState.state_since,
          lastChangedAt: latestState.last_changed_at,
          lastUpdatedAt: latestState.last_updated_at ?? null,
        }
      : null,
    meta: {
      source: "supabase",
      snapshotsTable,
      stateTable: "pm_state",
      bucket,
      rawPoints: snapshotRows.length,
      filteredPoints: filteredRows.length,
      returnedPoints: sampledRows.length,
      supportedRanges: ["1h", "24h", "7d", "30d", "90d", "180d", "1y", "all"],
      availableSeriesKeys: series.map((item) => item.key),
      notes: [
        useDailyPoints
          ? "180d/1y/all 장기 차트는 pm_chart_points_1d 일봉 데이터를 사용합니다."
          : "1h/24h/7d/30d/90d 차트는 pm_chart_points_15m 경량 15분 데이터를 사용합니다.",
        "pm_snapshots_3m 원본 테이블은 차트 API에서 직접 조회하지 않습니다.",
        "newer columns가 있으면 우선 사용하고, 없으면 legacy columns(kimchi_premium, futures_basis_pct, dispersion_krw 등)로 fallback 합니다.",
      ],
      cache: {
        key: "",
        ttlSeconds: 0,
        servedFrom: "fresh",
        generatedAt: "",
      },
    },
  };
}

const BROWSER_CACHE = "public, max-age=0, must-revalidate";

function buildResponseHeaders(ttlSeconds: number, cacheHit: boolean): HeadersInit {
  const cdnCacheControl = `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 5}`;

  return {
    "Cache-Control": BROWSER_CACHE,
    "CDN-Cache-Control": cdnCacheControl,
    "Vercel-CDN-Cache-Control": cdnCacheControl,
    "X-CAIN-Chart-Cache": cacheHit ? "HIT" : "MISS",
  };
}

function noStoreHeaders(extraHeaders?: Record<string, string>): HeadersInit {
  return {
    "Cache-Control": "no-store",
    ...(extraHeaders || {}),
  };
}

function pruneExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return serverError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const { searchParams } = new URL(req.url);
    const rawType = searchParams.get("type");
    const rawSymbol = searchParams.get("symbol");
    const range = parseRange(searchParams.get("range"));
    const noCache = searchParams.get("nocache") === "1";

    const type = normalizeType(rawType);
    const symbolBase = normalizeBaseSymbol(rawSymbol);

    if (!symbolBase) {
      return badRequest("Missing or invalid symbol");
    }

    const canonical = normalizeCanonicalSymbol(symbolBase);
    const cacheKey = buildCacheKey(type, symbolBase, range);
    const ttlSeconds = ttlSecondsByRange(range);

    pruneExpiredCacheEntries();

    if (!noCache) {
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        const body = cloneBodyWithCacheMeta(
          cached.body,
          cacheKey,
          ttlSeconds,
          "memory",
          cached.generatedAt,
        );

        return json(body, {
          status: 200,
          headers: buildResponseHeaders(ttlSeconds, true),
        });
      }
    }

    if (!noCache) {
      const inflight = inflightRequests.get(cacheKey);
      if (inflight) {
        const body = await inflight;
        return json(
          cloneBodyWithCacheMeta(body, cacheKey, ttlSeconds, "fresh", Date.now()),
          {
            status: 200,
            headers: buildResponseHeaders(ttlSeconds, true),
          },
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const buildPromise = buildChartResponseBody(supabase, type, symbolBase, canonical, range);

    if (!noCache) {
      inflightRequests.set(cacheKey, buildPromise);
    }

    const freshBody = await buildPromise;
    const now = Date.now();

    if (!noCache) {
      responseCache.set(cacheKey, {
        body: freshBody,
        generatedAt: now,
        expiresAt: now + ttlSeconds * 1000,
      });
      inflightRequests.delete(cacheKey);
    }

    return json(
      cloneBodyWithCacheMeta(freshBody, cacheKey, ttlSeconds, "fresh", now),
      {
        status: 200,
        headers: noCache
          ? noStoreHeaders({
              "X-CAIN-Chart-Cache": "BYPASS",
            })
          : buildResponseHeaders(ttlSeconds, false),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chart route error";

    return json(
      {
        ok: false,
        error: message,
      },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}