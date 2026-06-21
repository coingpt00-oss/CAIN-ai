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
  | "minutes"
  | "correlation"
  | "confidence"
  | "lead"
  | "unknown";

type ChartTooltipRow = {
  label: string;
  value: string;
};

type ChartPointMeta = {
  tooltipRows?: ChartTooltipRow[];
};

type ChartPoint = {
  ts: string;
  value: number | null;
  meta?: ChartPointMeta;
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

  rate_krw_usd?: number | null;

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

  // newer / preferred fields
  premium_pct?: number | null;
  domestic_avg_krw?: number | null;
  global_spot_avg_krw?: number | null;
  domestic_spread_krw?: number | null;
  domestic_spread_pct?: number | null;
  global_spread_usd?: number | null;
  global_spread_krw?: number | null;
  global_spread_pct?: number | null;
  global_avg_usd?: number | null;
  global_spot_avg_usd?: number | null;
  global_futures_avg_usd?: number | null;
  basis_pct?: number | null;
  volatility_ratio?: number | null;
  premium_krw_gap?: number | null;
  price_gap_usd?: number | null;

  structure_divergence_score?: number | null;
  lead_market?: string | null;
  lag_minutes?: number | null;
  lead_correlation?: number | null;
  lead_confidence?: number | null;

  domestic_high_exchange?: string | null;
  domestic_high_krw?: number | null;
  domestic_low_exchange?: string | null;
  domestic_low_krw?: number | null;

  global_spot_high_exchange?: string | null;
  global_spot_high_usd?: number | null;
  global_spot_low_exchange?: string | null;
  global_spot_low_usd?: number | null;

  futures_high_exchange?: string | null;
  futures_high_usd?: number | null;
  futures_low_exchange?: string | null;
  futures_low_usd?: number | null;

  domestic_exchange_count?: number | null;
  global_spot_exchange_count?: number | null;
  global_perp_exchange_count?: number | null;
  sample_count?: number | null;
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
    snapshotsTable:
      | "pm_snapshots_3m"
      | "pm_chart_points_15m"
      | "pm_chart_points_1h"
      | "pm_chart_points_1d";
    stateTable: "pm_state";
    bucket: "3m" | "15m" | "1h" | "1d";
    rawPoints: number;
    filteredPoints: number;
    returnedPoints: number;
    supportedRanges: string[];
    availableSeriesKeys: string[];
    notes: string[];
    coverage: {
      firstTs: string | null;
      lastTs: string | null;
      availableDays: number;
      requestedDays: number | null;
      complete: boolean;
    };
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
    "24h": 26 * 60 * 60 * 1000,
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

function rangeDurationMs(range: RangeKey): number | null {
  const map: Record<Exclude<RangeKey, "all">, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "180d": 180 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000,
  };

  return range === "all" ? null : map[range];
}

function bucketToleranceMs(bucket: ChartResponseBody["meta"]["bucket"]): number {
  if (bucket === "3m") return 12 * 60 * 1000;
  if (bucket === "15m") return 45 * 60 * 1000;
  if (bucket === "1h") return 3 * 60 * 60 * 1000;
  return 36 * 60 * 60 * 1000;
}

function targetPointsByRange(range: RangeKey): number {
  if (range === "1h") return 60;
  if (range === "24h") return 480;
  if (range === "7d") return 336;
  if (range === "30d") return 720;
  if (range === "90d") return 1080;
  if (range === "180d") return 1080;
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
  return range === "1y" || range === "all";
}

function shouldUseHourlyPoints(range: RangeKey): boolean {
  return range === "90d" || range === "180d";
}

function shouldUseRawSnapshots(range: RangeKey): boolean {
  return range === "1h" || range === "24h";
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

function formatTooltipNumber(value: unknown, unit: "usd" | "krw" | "percent" | "score") {
  const n = toNumberOrNull(value);
  if (n === null) return "-";

  if (unit === "usd") {
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 8 })} USD`;
  }

  if (unit === "krw") {
    return `${Math.round(n).toLocaleString()}원`;
  }

  if (unit === "percent") {
    return `${n.toFixed(4)}%`;
  }

  return `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function compactTooltipRows(rows: Array<ChartTooltipRow | null>): ChartPointMeta | undefined {
  const tooltipRows = rows.filter((row): row is ChartTooltipRow => Boolean(row));
  return tooltipRows.length ? { tooltipRows } : undefined;
}

function buildDomesticExtremesMeta(row: SnapshotRow): ChartPointMeta | undefined {
  return compactTooltipRows([
    row.domestic_high_exchange && toNumberOrNull(row.domestic_high_krw) !== null
      ? {
          label: "국내 최고",
          value: `${row.domestic_high_exchange} · ${formatTooltipNumber(row.domestic_high_krw, "krw")}`,
        }
      : null,
    row.domestic_low_exchange && toNumberOrNull(row.domestic_low_krw) !== null
      ? {
          label: "국내 최저",
          value: `${row.domestic_low_exchange} · ${formatTooltipNumber(row.domestic_low_krw, "krw")}`,
        }
      : null,
  ]);
}

function buildGlobalSpotExtremesMeta(row: SnapshotRow): ChartPointMeta | undefined {
  return compactTooltipRows([
    row.global_spot_high_exchange && toNumberOrNull(row.global_spot_high_usd) !== null
      ? {
          label: "해외 최고",
          value: `${row.global_spot_high_exchange} · ${formatTooltipNumber(row.global_spot_high_usd, "usd")}`,
        }
      : null,
    row.global_spot_low_exchange && toNumberOrNull(row.global_spot_low_usd) !== null
      ? {
          label: "해외 최저",
          value: `${row.global_spot_low_exchange} · ${formatTooltipNumber(row.global_spot_low_usd, "usd")}`,
        }
      : null,
  ]);
}

function buildFuturesStructureMeta(row: SnapshotRow): ChartPointMeta | undefined {
  const leadMarket = String(row.lead_market || "").trim().toUpperCase();
  const leadLabel =
    leadMarket === "SPOT"
      ? "현물 선도"
      : leadMarket === "FUTURES"
        ? "선물 선도"
        : leadMarket === "NEUTRAL"
          ? "중립"
          : null;

  return compactTooltipRows([
    leadLabel ? { label: "선도 시장", value: leadLabel } : null,
    toNumberOrNull(row.lag_minutes) !== null
      ? { label: "지연 시간", value: `${Math.round(Number(row.lag_minutes))}분` }
      : null,
    toNumberOrNull(row.lead_correlation) !== null
      ? { label: "동조 상관도", value: Number(row.lead_correlation).toFixed(4) }
      : null,
    toNumberOrNull(row.lead_confidence) !== null
      ? { label: "판정 신뢰도", value: `${(Number(row.lead_confidence) * 100).toFixed(1)}%` }
      : null,
    row.global_spot_high_exchange && toNumberOrNull(row.global_spot_high_usd) !== null
      ? {
          label: "현물 최고",
          value: `${row.global_spot_high_exchange} · ${formatTooltipNumber(row.global_spot_high_usd, "usd")}`,
        }
      : null,
    row.global_spot_low_exchange && toNumberOrNull(row.global_spot_low_usd) !== null
      ? {
          label: "현물 최저",
          value: `${row.global_spot_low_exchange} · ${formatTooltipNumber(row.global_spot_low_usd, "usd")}`,
        }
      : null,
    row.futures_high_exchange && toNumberOrNull(row.futures_high_usd) !== null
      ? {
          label: "선물 최고",
          value: `${row.futures_high_exchange} · ${formatTooltipNumber(row.futures_high_usd, "usd")}`,
        }
      : null,
    row.futures_low_exchange && toNumberOrNull(row.futures_low_usd) !== null
      ? {
          label: "선물 최저",
          value: `${row.futures_low_exchange} · ${formatTooltipNumber(row.futures_low_usd, "usd")}`,
        }
      : null,
  ]);
}

function mapSeries(
  rows: SnapshotRow[],
  key: string,
  getter: (row: SnapshotRow) => number | null,
  options: Omit<ChartSeries, "key" | "data">,
  metaGetter?: (row: SnapshotRow) => ChartPointMeta | undefined,
): ChartSeries {
  return {
    key,
    ...options,
    data: rows.map((row) => ({
      ts: row.ts,
      value: getter(row),
      ...(metaGetter ? { meta: metaGetter(row) } : {}),
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

  const domestic = toNumberOrNull(row.domestic_avg_krw);
  const globalUsd = getGlobalAvgUsd(row);
  const rate = toNumberOrNull(row.rate_krw_usd);

  if (domestic === null || globalUsd === null || rate === null) return null;
  return domestic - globalUsd * rate;
}

function getDomesticSpreadKrw(row: SnapshotRow): number | null {
  return toNumberOrNull(row.domestic_spread_krw ?? row.dispersion_krw_domestic_spread);
}

function getGlobalSpreadUsd(row: SnapshotRow): number | null {
  return toNumberOrNull(row.global_spread_usd);
}

function getGlobalSpreadKrw(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.global_spread_krw ?? row.dispersion_krw_global_spread);
  if (direct !== null) return direct;

  const spreadUsd = getGlobalSpreadUsd(row);
  const rate = toNumberOrNull(row.rate_krw_usd);
  if (spreadUsd === null || rate === null) return null;

  return spreadUsd * rate;
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
  const direct = dominanceToNumeric(row.dominance);
  if (direct !== null) return direct;

  const premiumGap = getPremiumKrwGap(row);
  if (premiumGap === null) return null;
  if (premiumGap > 0) return 1;
  if (premiumGap < 0) return -1;
  return 0;
}

function getScore(row: SnapshotRow): number | null {
  return toNumberOrNull(row.score);
}

function getGlobalAvgUsd(row: SnapshotRow): number | null {
  return toNumberOrNull(row.global_avg_usd ?? row.global_spot_avg_usd);
}

function getGlobalSpotAvgKrw(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.global_spot_avg_krw);
  if (direct !== null) return direct;

  const globalUsd = getGlobalAvgUsd(row);
  const rate = toNumberOrNull(row.rate_krw_usd);
  if (globalUsd === null || rate === null) return null;

  return globalUsd * rate;
}

function getDomesticAvgKrw(row: SnapshotRow): number | null {
  return toNumberOrNull(row.domestic_avg_krw);
}

function getGlobalSpreadPct(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.global_spread_pct);
  if (direct !== null) return direct;

  const spreadUsd = getGlobalSpreadUsd(row);
  const globalUsd = getGlobalAvgUsd(row);
  if (spreadUsd === null || globalUsd === null || globalUsd === 0) return null;

  return (spreadUsd / globalUsd) * 100;
}

function getGlobalFuturesAvgUsd(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.global_futures_avg_usd);
  if (direct !== null) return direct;

  const spotAvg = getGlobalAvgUsd(row);
  const priceGap = toNumberOrNull(row.price_gap_usd);
  if (spotAvg !== null && priceGap !== null) {
    return spotAvg + priceGap;
  }

  const basisPct = getBasisPct(row);
  if (spotAvg !== null && basisPct !== null) {
    return spotAvg * (1 + basisPct / 100);
  }

  return null;
}

function getPriceGapUsd(row: SnapshotRow): number | null {
  const direct = toNumberOrNull(row.price_gap_usd);
  if (direct !== null) return direct;

  const futuresAvg = getGlobalFuturesAvgUsd(row);
  const spotAvg = getGlobalAvgUsd(row);
  if (futuresAvg !== null && spotAvg !== null) {
    return futuresAvg - spotAvg;
  }

  const basisPct = getBasisPct(row);
  if (spotAvg !== null && basisPct !== null) {
    return spotAvg * (basisPct / 100);
  }

  return null;
}

function getStructureDivergenceScore(row: SnapshotRow): number | null {
  return toNumberOrNull(row.structure_divergence_score);
}

function getLeadCorrelation(row: SnapshotRow): number | null {
  return toNumberOrNull(row.lead_correlation);
}

function getLeadConfidence(row: SnapshotRow): number | null {
  return toNumberOrNull(row.lead_confidence);
}

function getLagMinutes(row: SnapshotRow): number | null {
  return toNumberOrNull(row.lag_minutes);
}

function getLeadMarketSignal(row: SnapshotRow): number | null {
  const value = String(row.lead_market || "").trim().toUpperCase();
  if (value === "SPOT") return 1;
  if (value === "FUTURES") return -1;
  if (value === "NEUTRAL") return 0;
  return null;
}

function buildSpotSeries(rows: SnapshotRow[]): ChartSeries[] {
  return filterEmptySeries([
    mapSeries(rows, "global_avg_usd", getGlobalAvgUsd, {
      label: "글로벌 평균가",
      unit: "usd",
      chartType: "area",
      group: "price",
      description: "글로벌 현물 평균가 추이",
    }, buildGlobalSpotExtremesMeta),
    mapSeries(rows, "global_spread_pct", getGlobalSpreadPct, {
      label: "거래소 벌어짐 %",
      unit: "percent",
      chartType: "line",
      group: "spread",
      description: "거래소 간 가격 벌어짐 비율",
    }, buildGlobalSpotExtremesMeta),
    mapSeries(rows, "global_spread_usd", getGlobalSpreadUsd, {
      label: "실제 USD 차이",
      unit: "usd",
      chartType: "line",
      group: "spread",
      description: "글로벌 거래소 최고-최저 실제 달러 차이",
    }, buildGlobalSpotExtremesMeta),
    mapSeries(rows, "global_spread_krw", getGlobalSpreadKrw, {
      label: "원화 환산 차이",
      unit: "krw",
      chartType: "line",
      group: "spread",
      description: "글로벌 거래소 최고-최저 원화 환산 차이",
    }, buildGlobalSpotExtremesMeta),
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
    mapSeries(rows, "domestic_avg_krw", getDomesticAvgKrw, {
      label: "국내 평균가",
      unit: "krw",
      chartType: "line-compare",
      group: "price",
      description: "국내 거래소 평균가",
    }, buildDomesticExtremesMeta),
    mapSeries(rows, "global_spot_avg_krw", getGlobalSpotAvgKrw, {
      label: "해외 환산 평균가",
      unit: "krw",
      chartType: "line-compare",
      group: "price",
      description: "글로벌 현물 평균가의 원화 환산값",
    }, buildGlobalSpotExtremesMeta),
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
      description: "국내 평균가 - 해외 환산 평균가",
    }),
    mapSeries(rows, "domestic_spread_krw", getDomesticSpreadKrw, {
      label: "국내 내부 분산",
      unit: "krw",
      chartType: "line",
      group: "spread",
      description: "국내 거래소 최고-최저 가격 차이",
    }, buildDomesticExtremesMeta),
    mapSeries(rows, "global_spread_krw", getGlobalSpreadKrw, {
      label: "해외 내부 분산",
      unit: "krw",
      chartType: "line",
      group: "spread",
      description: "해외 거래소 최고-최저 원화 환산 가격 차이",
    }, buildGlobalSpotExtremesMeta),
    mapSeries(rows, "dominance", getDominanceNumeric, {
      label: "가격 우위",
      unit: "dominance",
      chartType: "line",
      group: "state",
      description: "실제 원화 차이 기준 국내/해외 가격 우위",
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
    mapSeries(rows, "global_spot_avg_usd", getGlobalAvgUsd, {
      label: "현물 평균가",
      unit: "usd",
      chartType: "line-compare",
      group: "price",
      description: "글로벌 현물 평균가",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "global_futures_avg_usd", getGlobalFuturesAvgUsd, {
      label: "선물 평균가",
      unit: "usd",
      chartType: "line-compare",
      group: "price",
      description: "글로벌 선물 평균가",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "basis_pct", getBasisPct, {
      label: "베이시스",
      unit: "percent",
      chartType: "line",
      group: "basis",
      description: "선물-현물 베이시스 추이",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "price_gap_usd", getPriceGapUsd, {
      label: "실제 달러 가격차",
      unit: "usd",
      chartType: "area",
      group: "basis",
      description: "선물 평균가 - 현물 평균가",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "structure_divergence_score", getStructureDivergenceScore, {
      label: "구조 괴리도",
      unit: "score",
      chartType: "line",
      group: "structure",
      description: "베이시스·수익률 차이·동조 약화를 합친 구조 괴리 점수",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "lead_correlation", getLeadCorrelation, {
      label: "동조 상관도",
      unit: "correlation",
      chartType: "line",
      group: "lead",
      description: "현물·선물 움직임의 최적 시차 상관도",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "lead_confidence", getLeadConfidence, {
      label: "판정 신뢰도",
      unit: "confidence",
      chartType: "line",
      group: "lead",
      description: "선도·지연 판정 신뢰도",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "lead_market_signal", getLeadMarketSignal, {
      label: "선도 시장",
      unit: "lead",
      chartType: "line",
      group: "lead",
      description: "현물 선도 / 중립 / 선물 선도",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "lag_minutes", getLagMinutes, {
      label: "지연 시간",
      unit: "minutes",
      chartType: "line",
      group: "lead",
      description: "선도 시장과 후행 시장 사이의 추정 지연 시간",
    }, buildFuturesStructureMeta),
    mapSeries(rows, "delay_proxy", getDelayProxy, {
      label: "레거시 구조 점수",
      unit: "percent",
      chartType: "line",
      group: "legacy",
      description: "기존 호환용 복합 위험 점수",
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
        key: "price",
        label: "국내 vs 해외 환산가",
        seriesKeys: keys.filter((k) =>
          ["domestic_avg_krw", "global_spot_avg_krw"].includes(k),
        ),
      },
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
        label: "가격 우위 / 점수",
        seriesKeys: keys.filter((k) => ["dominance", "score"].includes(k)),
      },
    ].filter((item) => item.seriesKeys.length > 0);
  }

  if (type === "futures-spot") {
    return [
      {
        key: "price",
        label: "현물 vs 선물",
        seriesKeys: keys.filter((k) =>
          ["global_spot_avg_usd", "global_futures_avg_usd"].includes(k),
        ),
      },
      {
        key: "basis",
        label: "베이시스",
        seriesKeys: keys.filter((k) => ["basis_pct", "price_gap_usd"].includes(k)),
      },
      {
        key: "structure",
        label: "구조 괴리",
        seriesKeys: keys.filter((k) => ["structure_divergence_score"].includes(k)),
      },
      {
        key: "lead",
        label: "동조 / 선도 / 지연",
        seriesKeys: keys.filter((k) =>
          ["lead_correlation", "lead_confidence", "lead_market_signal", "lag_minutes"].includes(k),
        ),
      },
    ].filter((item) => item.seriesKeys.length > 0);
  }

  return [
    {
      key: "price",
      label: "가격",
      seriesKeys: keys.filter((k) => ["global_avg_usd"].includes(k)),
    },
    {
      key: "spread",
      label: "거래소 벌어짐",
      seriesKeys: keys.filter((k) =>
        ["global_spread_pct", "global_spread_usd", "global_spread_krw"].includes(k),
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

    rate_krw_usd: toNumberOrNull(row.rate_krw_usd),

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

    premium_pct: toNumberOrNull(row.premium_pct ?? row.kimchi_premium),
    domestic_avg_krw: toNumberOrNull(row.domestic_avg_krw ?? row.korea_avg_krw),
    global_spot_avg_krw: toNumberOrNull(row.global_spot_avg_krw),
    domestic_spread_krw: toNumberOrNull(row.domestic_spread_krw),
    domestic_spread_pct: toNumberOrNull(row.domestic_spread_pct),
    global_spread_usd: toNumberOrNull(row.global_spread_usd),
    global_spread_krw: toNumberOrNull(row.global_spread_krw),
    global_spread_pct: toNumberOrNull(row.global_spread_pct),
    global_avg_usd: toNumberOrNull(row.global_avg_usd),
    global_spot_avg_usd: toNumberOrNull(row.global_spot_avg_usd ?? row.global_avg_usd),
    global_futures_avg_usd: toNumberOrNull(row.global_futures_avg_usd),
    basis_pct: toNumberOrNull(row.basis_pct ?? row.futures_basis_pct),
    volatility_ratio: toNumberOrNull(row.volatility_ratio),
    premium_krw_gap: toNumberOrNull(row.premium_krw_gap),
    price_gap_usd: toNumberOrNull(row.price_gap_usd),

    structure_divergence_score: toNumberOrNull(row.structure_divergence_score),
    lead_market: row.lead_market ? String(row.lead_market) : null,
    lag_minutes: toNumberOrNull(row.lag_minutes),
    lead_correlation: toNumberOrNull(row.lead_correlation),
    lead_confidence: toNumberOrNull(row.lead_confidence),

    domestic_high_exchange: row.domestic_high_exchange ? String(row.domestic_high_exchange) : null,
    domestic_high_krw: toNumberOrNull(row.domestic_high_krw),
    domestic_low_exchange: row.domestic_low_exchange ? String(row.domestic_low_exchange) : null,
    domestic_low_krw: toNumberOrNull(row.domestic_low_krw),

    global_spot_high_exchange: row.global_spot_high_exchange ? String(row.global_spot_high_exchange) : null,
    global_spot_high_usd: toNumberOrNull(row.global_spot_high_usd),
    global_spot_low_exchange: row.global_spot_low_exchange ? String(row.global_spot_low_exchange) : null,
    global_spot_low_usd: toNumberOrNull(row.global_spot_low_usd),

    futures_high_exchange: row.futures_high_exchange ? String(row.futures_high_exchange) : null,
    futures_high_usd: toNumberOrNull(row.futures_high_usd),
    futures_low_exchange: row.futures_low_exchange ? String(row.futures_low_exchange) : null,
    futures_low_usd: toNumberOrNull(row.futures_low_usd),

    domestic_exchange_count: toNumberOrNull(row.domestic_exchange_count),
    global_spot_exchange_count: toNumberOrNull(row.global_spot_exchange_count),
    global_perp_exchange_count: toNumberOrNull(row.global_perp_exchange_count),
    sample_count: toNumberOrNull(row.sample_count),
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
  fromIso: string,
): Promise<SnapshotRow[]> {
  const pageSize = 1000;
  const maxRows = 20_000;
  const allRows: Record<string, unknown>[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const { data, error } = await supabase
      .rpc("get_pm_chart_points_v2", {
        p_type: toDbMarketType(type),
        p_symbol: symbolBase,
        p_range: range,
        p_from: fromIso,
        p_to: new Date().toISOString(),
      })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`get_pm_chart_points_v2 rpc failed: ${error.message}`);
    }

    const page = (data ?? []) as Record<string, unknown>[];
    allRows.push(...page);

    if (page.length < pageSize) break;
  }

  return allRows.map((row) => ({
    symbol: (row.symbol as string | null) ?? symbolBase,
    canonical_symbol: (row.canonical_symbol as string | null) ?? normalizeCanonicalSymbol(symbolBase),
    type,
    ts: String(row.bucket_ts),

    rate_krw_usd: toNumberOrNull(row.rate_krw_usd),

    kimchi_premium: toNumberOrNull(row.kimchi_premium),
    score: toNumberOrNull(row.score),
    futures_basis_pct: toNumberOrNull(row.futures_basis_pct),
    dispersion_krw: toNumberOrNull(row.dispersion_krw),
    dispersion_krw_domestic_spread: toNumberOrNull(row.domestic_spread_krw),
    dispersion_krw_global_spread: toNumberOrNull(row.global_spread_krw),
    delay_proxy: toNumberOrNull(row.delay_proxy),
    dominance: null,
    volatility_warn: null,

    premium_pct: toNumberOrNull(row.kimchi_premium),
    domestic_avg_krw: toNumberOrNull(row.korea_avg_krw),
    global_spot_avg_krw: null,
    domestic_spread_krw: toNumberOrNull(row.domestic_spread_krw),
    domestic_spread_pct: toNumberOrNull(row.domestic_spread_pct),
    global_spread_usd: toNumberOrNull(row.global_spread_usd),
    global_spread_krw: toNumberOrNull(row.global_spread_krw),
    global_spread_pct: toNumberOrNull(row.global_spread_pct),
    global_avg_usd: toNumberOrNull(row.global_avg_usd),
    global_spot_avg_usd: toNumberOrNull(row.global_avg_usd),
    global_futures_avg_usd: toNumberOrNull(row.global_futures_avg_usd),
    basis_pct: toNumberOrNull(row.futures_basis_pct),
    volatility_ratio: toNumberOrNull(row.volatility_ratio),
    premium_krw_gap: toNumberOrNull(row.premium_krw_gap),
    price_gap_usd: toNumberOrNull(row.price_gap_usd),

    structure_divergence_score: toNumberOrNull(row.structure_divergence_score),
    lead_market: row.lead_market ? String(row.lead_market) : null,
    lag_minutes: toNumberOrNull(row.lag_minutes),
    lead_correlation: toNumberOrNull(row.lead_correlation),
    lead_confidence: toNumberOrNull(row.lead_confidence),

    domestic_high_exchange: row.domestic_high_exchange ? String(row.domestic_high_exchange) : null,
    domestic_high_krw: toNumberOrNull(row.domestic_high_krw),
    domestic_low_exchange: row.domestic_low_exchange ? String(row.domestic_low_exchange) : null,
    domestic_low_krw: toNumberOrNull(row.domestic_low_krw),

    global_spot_high_exchange: row.global_spot_high_exchange ? String(row.global_spot_high_exchange) : null,
    global_spot_high_usd: toNumberOrNull(row.global_spot_high_usd),
    global_spot_low_exchange: row.global_spot_low_exchange ? String(row.global_spot_low_exchange) : null,
    global_spot_low_usd: toNumberOrNull(row.global_spot_low_usd),

    futures_high_exchange: row.futures_high_exchange ? String(row.futures_high_exchange) : null,
    futures_high_usd: toNumberOrNull(row.futures_high_usd),
    futures_low_exchange: row.futures_low_exchange ? String(row.futures_low_exchange) : null,
    futures_low_usd: toNumberOrNull(row.futures_low_usd),

    domestic_exchange_count: null,
    global_spot_exchange_count: null,
    global_perp_exchange_count: null,
    sample_count: toNumberOrNull(row.sample_count),
  }));
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
  const useRawSnapshots = shouldUseRawSnapshots(range);
  const useHourlyPoints = shouldUseHourlyPoints(range);
  const useDailyPoints = shouldUseDailyPoints(range);

  const snapshotsTable: ChartResponseBody["meta"]["snapshotsTable"] = useRawSnapshots
    ? "pm_snapshots_3m"
    : useDailyPoints
      ? "pm_chart_points_1d"
      : useHourlyPoints
        ? "pm_chart_points_1h"
        : "pm_chart_points_15m";

  const bucket: ChartResponseBody["meta"]["bucket"] = useRawSnapshots
    ? "3m"
    : useDailyPoints
      ? "1d"
      : useHourlyPoints
        ? "1h"
        : "15m";

  const snapshotRowsPromise = useRawSnapshots
    ? fetchSnapshots(supabase, symbolBase, canonical, fromIso)
    : fetchChartPoints(supabase, type, symbolBase, range, fromIso);

  const [snapshotRows, latestState] = await Promise.all([
    snapshotRowsPromise,
    fetchLatestState(supabase, symbolBase, canonical),
  ]);

  const filteredRows = maybeFilterRowsByType(sortRowsByTs(snapshotRows), type);
  const firstTs = filteredRows[0]?.ts ?? null;
  const lastTs = filteredRows[filteredRows.length - 1]?.ts ?? null;
  const firstMs = firstTs ? new Date(firstTs).getTime() : NaN;
  const lastMs = lastTs ? new Date(lastTs).getTime() : NaN;
  const requestedMs = rangeDurationMs(range);
  const requestedDays = requestedMs === null ? null : requestedMs / (24 * 60 * 60 * 1000);
  const availableDays =
    Number.isFinite(firstMs) && Number.isFinite(lastMs)
      ? Math.max(0, (lastMs - firstMs) / (24 * 60 * 60 * 1000))
      : 0;
  const toleranceMs = bucketToleranceMs(bucket);
  const rangeComplete =
    range === "all"
      ? filteredRows.length > 0
      : Number.isFinite(firstMs) &&
        Number.isFinite(lastMs) &&
        firstMs <= new Date(fromIso).getTime() + toleranceMs &&
        lastMs >= Date.now() - toleranceMs;

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
        useRawSnapshots
          ? "1h/24h 단기 차트는 pm_snapshots_3m 원본 3분 데이터를 사용합니다."
          : useDailyPoints
            ? "1y/all 장기 차트는 get_pm_chart_points_v2 RPC를 통해 pm_chart_points_1d 일봉 데이터를 사용합니다."
            : useHourlyPoints
              ? "90d/180d 중장기 차트는 get_pm_chart_points_v2 RPC를 통해 pm_chart_points_1h 시간봉 데이터를 사용합니다."
              : "7d/30d 중기 차트는 get_pm_chart_points_v2 RPC를 통해 pm_chart_points_15m 15분 데이터를 사용합니다.",
        "실제 원화 차이, 국내/해외 분산, 선물/현물 가격차, 구조 괴리도, 동조·선도·지연 지표를 V2 컬럼에서 제공합니다.",
        "과거 원본 3분 이력이 없던 구간은 최고/최저 거래소와 구조·동조 지표가 비어 있을 수 있으며, 신규 데이터부터 계속 축적됩니다.",
        "Supabase REST의 1,000행 응답 제한을 페이지 단위로 이어 받아 전체 기간을 구성한 뒤 화면용 포인트로 축약합니다.",
      ],
      coverage: {
        firstTs,
        lastTs,
        availableDays,
        requestedDays,
        complete: rangeComplete,
      },
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