// src/app/personal-markets/TypedPersonalMarketDetailClient.tsx
"use client";

/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { pmApi } from "@/lib/personalMarketsApi";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

const AiBox = dynamic(() => import("@/components/ai/AiBox"), {
  ssr: false,
  loading: () => null,
});

type MarketType = "spot" | "domestic-global" | "futures-spot";
type RangeKey = "1h" | "24h" | "7d" | "30d" | "90d";
type CurrencyMode = "KRW" | "USD";
type UnitKey =
  | "usd"
  | "krw"
  | "percent"
  | "score"
  | "count"
  | "flag"
  | "dominance"
  | "unknown";

type ExRow = {
  name: string;
  price: number;
};

type AnyIndicator = {
  symbol: string;
  canonical_symbol?: string;
  type?: MarketType;
  score?: number;
  state?: string;
  ts?: string;
  source?: string;
  exchanges?: {
    domestic_krw?: ExRow[];
    global_spot_usd?: ExRow[];
    global_futures_usd?: ExRow[];
  };

  rate_krw_usd?: number | null;

  domestic_avg_krw?: number | null;
  global_spot_avg_usd?: number | null;
  global_spot_avg_krw?: number | null;
  premium_pct?: number | null;
  domestic_spread_krw?: number | null;
  domestic_exchange_count?: number | null;

  global_avg_usd?: number | null;
  global_spread_usd?: number | null;
  global_spread_pct?: number | null;
  volatility_ratio?: number | null;
  volatility_warn?: boolean;
  global_spot_exchange_count?: number | null;

  global_futures_avg_usd?: number | null;
  basis_pct?: number | null;
  delay_proxy?: number | null;
  global_perp_exchange_count?: number | null;

  price?: number | null;
  price_usd?: number | null;
  price_krw?: number | null;
  market_cap_live?: number | null;
  market_cap_meta?: number | null;
  market_cap_rank?: number | null;
  total_volume?: number | null;
  change_1h?: number | null;
  change_24h?: number | null;
  change_7d?: number | null;
  price_change_percentage_24h?: number | null;
  circulating_supply?: number | null;
  spark_spot_7d_usd?: number[] | null;
  spark_spot_7d_krw?: number[] | null;
  sparkline_usd?: number[] | null;
  sparkline_krw?: number[] | null;
};

type DetailRes = {
  ok: boolean;
  type?: MarketType;
  symbol?: string;
  canonical_symbol?: string;
  item?: AnyIndicator | null;
  indicator?: AnyIndicator | null;
  summary?: unknown;
  history?: {
    days?: number;
    firstTs?: string | null;
    source?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type SpotSupplementRes = {
  ok?: boolean;
  payload?: {
    items?: AnyIndicator[];
    indicators?: Record<string, AnyIndicator>;
  };
  items?: AnyIndicator[];
};

function resolveDetailItem(data: DetailRes | null): AnyIndicator | null {
  if (!data) return null;

  const primary = data.item;
  if (primary && typeof primary === "object") {
    return {
      ...primary,
      symbol: primary.symbol ?? data.symbol,
      canonical_symbol: primary.canonical_symbol ?? data.canonical_symbol,
      type: primary.type ?? data.type,
    };
  }

  const fallback = data.indicator;
  if (fallback && typeof fallback === "object") {
    return {
      ...fallback,
      symbol: fallback.symbol ?? data.symbol,
      canonical_symbol: fallback.canonical_symbol ?? data.canonical_symbol,
      type: fallback.type ?? data.type,
    };
  }

  return null;
}

type ApiChartPoint = {
  ts: string;
  value: number | null;
};

type ApiChartSeries = {
  key: string;
  label: string;
  unit: UnitKey;
  chartType: "line" | "area" | "line-compare";
  group?: string;
  description?: string;
  data: ApiChartPoint[];
};

type ApiChartTab = {
  key: string;
  label: string;
  seriesKeys?: string[];
  description?: string;
};

type ApiLatestState = {
  state: string | null;
  stateSince: string | null;
  lastChangedAt: string | null;
  lastUpdatedAt: string | null;
};

type ChartRes = {
  ok: boolean;
  type?: MarketType;
  symbol?: string;
  canonical_symbol?: string;
  range?: RangeKey;
  from?: string;
  to?: string;
  series?: ApiChartSeries[];
  chartTabs?: ApiChartTab[];
  latestState?: ApiLatestState | null;
  meta?: {
    returnedPoints?: number;
    rawPoints?: number;
    filteredPoints?: number;
    supportedRanges?: string[];
    availableSeriesKeys?: string[];
    notes?: string[];
  };
  error?: string;
};

type SeriesVisualPoint = {
  ts: string;
  values: Record<string, number | null>;
};

type ChartView = {
  key: string;
  label: string;
  description: string;
  seriesKeys: string[];
  tooltipSeriesKeys?: string[];
};

type CacheEntry<T> = {
  ts: number;
  data: T;
};

const detailCache = new Map<string, CacheEntry<DetailRes>>();
const chartCache = new Map<string, CacheEntry<ChartRes>>();
const spotSupplementCache = new Map<string, CacheEntry<AnyIndicator | null>>();
const detailPrefetchInFlight = new Set<string>();

const DETAIL_SEED_MAX_AGE = 120_000;

function detailCacheTtl() {
  return 10_000;
}

function chartCacheTtl(range: RangeKey) {
  if (range === "1h") return 20_000;
  if (range === "24h") return 45_000;
  if (range === "7d") return 120_000;
  if (range === "30d") return 300_000;
  return 0;
}

function n(v: unknown, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

function avg(values: number[]) {
  return values.length ? sum(values) / values.length : 0;
}

function isFiniteNum(value: unknown) {
  return Number.isFinite(Number(value));
}

function pickFiniteNumber(primary: unknown, fallback: unknown) {
  if (isFiniteNum(primary)) return Number(primary);
  if (isFiniteNum(fallback)) return Number(fallback);
  return primary as number | null | undefined;
}

function normalizeSpotSymbol(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/USDT$/, "")
    .replace(/USD$/, "");
}

function normalizeMarketSnapshotRow(row: any): AnyIndicator | null {
  if (!row || typeof row !== "object") return null;

  const symbol = String(row.symbol_upper || row.symbol || row.canonical_symbol || "")
    .trim()
    .toUpperCase()
    .replace(/USDT$/, "");

  if (!symbol) return null;

  return {
    symbol,
    canonical_symbol: row.canonical_symbol || `${symbol}USDT`,
    type: "spot",
    rate_krw_usd: isFiniteNum(row.fx_usdkrw) ? Number(row.fx_usdkrw) : isFiniteNum(row.rate_krw_usd) ? Number(row.rate_krw_usd) : null,
    price: isFiniteNum(row.price) ? Number(row.price) : null,
    price_usd: isFiniteNum(row.price_usd) ? Number(row.price_usd) : null,
    price_krw: isFiniteNum(row.price_krw) ? Number(row.price_krw) : null,
    market_cap_live: isFiniteNum(row.market_cap_live) ? Number(row.market_cap_live) : null,
    market_cap_meta: isFiniteNum(row.market_cap_meta) ? Number(row.market_cap_meta) : null,
    market_cap_rank: isFiniteNum(row.market_cap_rank) ? Number(row.market_cap_rank) : null,
    total_volume: isFiniteNum(row.total_volume) ? Number(row.total_volume) : null,
    change_1h: isFiniteNum(row.change_1h) ? Number(row.change_1h) : null,
    change_24h: isFiniteNum(row.change_24h) ? Number(row.change_24h) : isFiniteNum(row.price_change_percentage_24h) ? Number(row.price_change_percentage_24h) : null,
    change_7d: isFiniteNum(row.change_7d) ? Number(row.change_7d) : null,
    price_change_percentage_24h: isFiniteNum(row.price_change_percentage_24h) ? Number(row.price_change_percentage_24h) : null,
    circulating_supply: isFiniteNum(row.circulating_supply) ? Number(row.circulating_supply) : null,
    spark_spot_7d_usd: Array.isArray(row.spark_spot_7d_usd) ? row.spark_spot_7d_usd : null,
    spark_spot_7d_krw: Array.isArray(row.spark_spot_7d_krw) ? row.spark_spot_7d_krw : null,
    sparkline_usd: Array.isArray(row.sparkline_usd) ? row.sparkline_usd : null,
    sparkline_krw: Array.isArray(row.sparkline_krw) ? row.sparkline_krw : null,
  };
}


function getDetailSeedKeys(type: MarketType, symbol: string) {
  const normalizedType = normalizeType(type);
  const normalizedSymbol = normalizeSpotSymbol(symbol);

  return [
    `cain:pm:detail-seed:${normalizedType}:${normalizedSymbol}`,
    `cain:pm:detail-seed:spot:${normalizedSymbol}`,
    `cain:personal-market-detail-seed:${normalizedType}:${normalizedSymbol}`,
    `cain:personal-market-detail-seed:${normalizedSymbol}`,
    "cain:pm:selected-market",
    "cain:personal-market-detail-seed",
  ];
}

function readDetailSeed(type: MarketType, symbol: string): DetailRes | null {
  if (typeof window === "undefined") return null;

  const normalizedType = normalizeType(type);
  const normalizedSymbol = normalizeSpotSymbol(symbol);

  for (const key of getDetailSeedKeys(normalizedType, normalizedSymbol)) {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const seededAt = Number(parsed?.seeded_at || parsed?.seededAt || parsed?.stored_at || parsed?.storedAt || 0);

      if (seededAt > 0 && Date.now() - seededAt > DETAIL_SEED_MAX_AGE) {
        continue;
      }

      const rawItem = parsed?.item || parsed?.row || parsed?.data || parsed;
      const normalizedMarketItem = normalizeMarketSnapshotRow(rawItem);
      const fallbackItem =
        rawItem && typeof rawItem === "object" && (rawItem.symbol || rawItem.symbol_upper || rawItem.canonical_symbol)
          ? (rawItem as AnyIndicator)
          : null;

      const item =
        fallbackItem && normalizedMarketItem
          ? mergeSpotSupplement(fallbackItem, normalizedMarketItem)
          : normalizedMarketItem || fallbackItem;
      if (!item) continue;

      const itemSymbol = normalizeSpotSymbol((rawItem as any)?.symbol_upper || item.symbol || item.canonical_symbol);
      if (itemSymbol !== normalizedSymbol) continue;

      return {
        ok: true,
        type: normalizedType,
        symbol: normalizedSymbol,
        canonical_symbol: item.canonical_symbol || `${normalizedSymbol}USDT`,
        item: {
          ...item,
          symbol: item.symbol || normalizedSymbol,
          canonical_symbol: item.canonical_symbol || `${normalizedSymbol}USDT`,
          type: item.type || normalizedType,
        },
        history: {
          source: "session-seed",
        },
      };
    } catch {}
  }

  return null;
}

async function prefetchDetailData(type: MarketType, symbol: string) {
  const normalizedType = normalizeType(type);
  const normalizedSymbol = normalizeSpotSymbol(symbol);
  const cacheKey = `${normalizedType}:${normalizedSymbol}`;
  const cached = detailCache.get(cacheKey);
  const fresh = cached && Date.now() - cached.ts < detailCacheTtl();

  if (fresh) return;

  const flightKey = `detail:${cacheKey}`;
  if (detailPrefetchInFlight.has(flightKey)) return;

  detailPrefetchInFlight.add(flightKey);

  try {
    const detailUrl = pmApi(`/detail?type=${encodeURIComponent(normalizedType)}&symbol=${encodeURIComponent(normalizedSymbol)}`);
    const res = await fetch(detailUrl);
    const json = (await res.json()) as DetailRes;
    if (res.ok && json?.ok) {
      detailCache.set(cacheKey, { ts: Date.now(), data: json });
    }
  } catch {
  } finally {
    detailPrefetchInFlight.delete(flightKey);
  }
}

async function prefetchChartData(type: MarketType, symbol: string, range: RangeKey) {
  const normalizedType = normalizeType(type);
  const normalizedSymbol = normalizeSpotSymbol(symbol);
  const cacheKey = `${normalizedType}:${normalizedSymbol}:${range}`;
  const cached = chartCache.get(cacheKey);
  const ttl = chartCacheTtl(range);
  const fresh = cached && ttl > 0 && Date.now() - cached.ts < ttl;

  if (fresh) return;

  const flightKey = `chart:${cacheKey}`;
  if (detailPrefetchInFlight.has(flightKey)) return;

  detailPrefetchInFlight.add(flightKey);

  try {
    const chartUrl = pmApi(`/chart?type=${encodeURIComponent(normalizedType)}&symbol=${encodeURIComponent(normalizedSymbol)}&range=${encodeURIComponent(range)}`);
    const res = await fetch(chartUrl);
    const json = (await res.json()) as ChartRes;
    if (res.ok && json?.ok) {
      chartCache.set(cacheKey, { ts: Date.now(), data: json });
    }
  } catch {
  } finally {
    detailPrefetchInFlight.delete(flightKey);
  }
}

function findSpotSupplementFromResponse(raw: any, symbol: string): AnyIndicator | null {
  const target = normalizeSpotSymbol(symbol);

  const rawItems = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.payload?.items)
      ? raw.payload.items
      : raw?.payload?.indicators && typeof raw.payload.indicators === "object"
        ? Object.values(raw.payload.indicators)
        : [];

  for (const rawItem of rawItems) {
    const rawAny = rawItem as AnyIndicator;
    const maybeMarketRow = normalizeMarketSnapshotRow(rawItem);
    const item = maybeMarketRow ? mergeSpotSupplement(rawAny, maybeMarketRow) : rawAny;
    const itemSymbol = normalizeSpotSymbol((rawItem as any)?.symbol_upper || item?.symbol || item?.canonical_symbol);
    if (itemSymbol === target) {
      return {
        ...item,
        symbol: item.symbol || target,
        type: item.type || "spot",
      };
    }
  }

  return null;
}

function mergeSpotSupplement(base: AnyIndicator, supplemental?: AnyIndicator | null): AnyIndicator {
  if (!supplemental) return base;

  const merged: AnyIndicator = {
    ...base,
    exchanges: {
      ...(supplemental.exchanges || {}),
      ...(base.exchanges || {}),
    },
  };

  const numericKeys: (keyof AnyIndicator)[] = [
    "rate_krw_usd",
    "price",
    "price_usd",
    "price_krw",
    "market_cap_live",
    "market_cap_meta",
    "market_cap_rank",
    "total_volume",
    "change_1h",
    "change_24h",
    "change_7d",
    "price_change_percentage_24h",
    "circulating_supply",
    "global_avg_usd",
    "global_spot_avg_usd",
    "global_spread_usd",
    "global_spread_pct",
    "volatility_ratio",
  ];

  for (const key of numericKeys) {
    const currentValue = merged[key];
    const fallbackValue = supplemental[key];

    if (key === "change_7d" && isFiniteNum(fallbackValue)) {
      (merged as any)[key] = Number(fallbackValue);
      continue;
    }

    if (!isFiniteNum(currentValue) && isFiniteNum(fallbackValue)) {
      (merged as any)[key] = Number(fallbackValue);
    }
  }

  const sparkKeys: (keyof AnyIndicator)[] = [
    "spark_spot_7d_usd",
    "spark_spot_7d_krw",
    "sparkline_usd",
    "sparkline_krw",
  ];

  for (const key of sparkKeys) {
    const currentValue = merged[key];
    const fallbackValue = supplemental[key];
    if (!hasSparkPoints(currentValue as number[] | null | undefined) && hasSparkPoints(fallbackValue as number[] | null | undefined)) {
      (merged as any)[key] = fallbackValue;
    }
  }

  return merged;
}

function getExtremes(rows: ExRow[]) {
  if (!rows.length) {
    return { highest: null as ExRow | null, lowest: null as ExRow | null, spread: 0, average: 0 };
  }
  const sorted = [...rows].sort((a, b) => b.price - a.price);
  const highest = sorted[0] || null;
  const lowest = sorted[sorted.length - 1] || null;
  return {
    highest,
    lowest,
    spread: highest && lowest ? highest.price - lowest.price : 0,
    average: avg(sorted.map((row) => row.price)),
  };
}

function averageOfSeries(series: ApiChartSeries | undefined) {
  if (!series) return null;
  const values = series.data
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length ? avg(values) : null;
}

function positionVsAverageText(current: number | null, averageValue: number | null, unit: UnitKey) {
  if (current === null || averageValue === null || !Number.isFinite(current) || !Number.isFinite(averageValue)) {
    return { value: "-", sub: "평균 비교 데이터가 아직 부족합니다." };
  }
  const delta = current - averageValue;
  if (unit === "percent") {
    return {
      value: `${delta > 0 ? "+" : ""}${delta.toFixed(3)}%p`,
      sub: `현재 ${fmtSignedPct(current, 3)} · 24h 평균 ${fmtSignedPct(averageValue, 3)}`,
    };
  }
  if (unit === "usd") {
    return {
      value: fmtSignedUsd(delta, 3),
      sub: `현재 ${fmtUsd(current, 4)} · 24h 평균 ${fmtUsd(averageValue, 4)}`,
    };
  }
  if (unit === "krw") {
    return {
      value: fmtSignedKrw(delta),
      sub: `현재 ${fmtKrw(current)} · 24h 평균 ${fmtKrw(averageValue)}`,
    };
  }
  return {
    value: `${delta > 0 ? "+" : ""}${delta.toFixed(3)}`,
    sub: `현재 ${current.toFixed(3)} · 24h 평균 ${averageValue.toFixed(3)}`,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fmtUsd(v: unknown, digits = 4) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `${x.toLocaleString(undefined, { maximumFractionDigits: digits })} USD`;
}

function fmtKrw(v: unknown) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `${Math.round(x).toLocaleString()}원`;
}

function fmtPct(v: unknown, digits = 2) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `${x.toFixed(digits)}%`;
}

function fmtSignedPct(v: unknown, digits = 2) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `${x > 0 ? "+" : ""}${x.toFixed(digits)}%`;
}

function fmtSignedUsd(v: unknown, digits = 2) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `${x > 0 ? "+" : ""}${x.toLocaleString(undefined, { maximumFractionDigits: digits })} USD`;
}

function fmtSignedKrw(v: unknown) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `${x > 0 ? "+" : ""}${Math.round(x).toLocaleString()}원`;
}

function signedTextClassFromRaw(value: unknown) {
  const raw = String(value ?? "").trim();
  if (raw.startsWith("+")) return "text-[#22c55e]";
  if (raw.startsWith("-")) return "text-[#ef4444]";

  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric) || numeric === 0) return "text-white";
  return numeric > 0 ? "text-[#22c55e]" : "text-[#ef4444]";
}

function getStateTextClass(value: unknown) {
  const state = String(value ?? "").trim().toUpperCase();

  if (
    [
      "STABLE",
      "NORMAL",
      "GOOD",
      "SAFE",
      "양호",
      "안정",
      "DOMESTIC_PREMIUM",
      "FUTURES_PREMIUM",
    ].includes(state)
  ) {
    return "text-[#22c55e]";
  }

  if (
    [
      "WATCH",
      "CAUTION",
      "WARNING",
      "주의",
      "NEUTRAL",
      "중립",
      "NOISE",
    ].includes(state)
  ) {
    return "text-[#facc15]";
  }

  if (
    [
      "RISK",
      "DANGER",
      "ALERT",
      "BAD",
      "위험",
      "경고",
      "FUTURES_DISCOUNT",
      "GLOBAL_PREMIUM",
      "GLOBAL_DISCOUNT",
    ].includes(state)
  ) {
    return "text-[#ef4444]";
  }

  return "text-[var(--brand)]";
}

function getSummaryInfoText(label: string) {
  const key = label.trim();

  const map: Record<string, string> = {
    "현재 상태": "현재 지표들을 종합해 만든 상태 요약입니다.\nSTABLE은 안정, NEUTRAL은 중립, PREMIUM/DISCOUNT는 한쪽 가격이 상대적으로 높은 구조를 뜻합니다.",
    "글로벌 평균가": "글로벌 현물 거래소 가격들을 종합한 평균가입니다.\n특정 거래소 하나가 아니라 여러 거래소 가격을 함께 본 기준값입니다.",
    "거래소 벌어짐": "글로벌 현물 거래소들 사이의 가격 차이를 비율로 본 값입니다.\n값이 커질수록 거래소별 체결 가격이 더 벌어진 상태입니다.",
    "최고-최저 차이": "가장 높은 거래소 가격과 가장 낮은 거래소 가격의 절대 차이입니다.\n어느 거래소가 튀는지 확인하는 데 씁니다.",
    "단기 흔들림": "최근 흐름에서 가격이 얼마나 흔들리는지 보는 보조 지표입니다.\n값이 높을수록 단기 변동성이 커진 상태입니다.",
    "경고 상태": "거래소 수와 변동성 조건을 보고 주의가 필요한지 표시합니다.\n양호는 현재 조건이 비교적 안정적이라는 뜻입니다.",
    "괴리율": "국내 평균가와 해외 환산 평균가의 퍼센트 차이입니다.\n양수면 국내가 해외보다 비싼 편, 음수면 국내가 더 낮은 편입니다.",
    "실제 원화 차이": "국내 평균가와 해외 환산 평균가의 실제 원화 차이입니다.\n퍼센트가 아니라 1코인 기준 원화 차이를 보여줍니다.",
    "국내 평균가": "국내 거래소 가격들을 평균낸 값입니다.\n현재 국내 시장 기준 가격을 보는 데 씁니다.",
    "해외 환산 평균가": "해외 현물 평균가에 환율을 반영해 원화로 바꾼 값입니다.\n국내 가격과 직접 비교하기 위한 기준입니다.",
    "괴리율 vs 24h 평균": "현재 괴리율이 최근 24시간 평균보다 높은지 낮은지 보여줍니다.\n구조가 평소보다 확대됐는지 확인하는 데 씁니다.",
    "국내 내부 분산": "국내 거래소끼리의 가격 차이입니다.\n값이 크면 국내 시장 내부에서도 체결 가격 차이가 벌어진 상태입니다.",
    "베이시스": "선물 평균가와 현물 평균가의 퍼센트 차이입니다.\n양수면 선물이 현물보다 높은 선물 프리미엄, 음수면 선물 할인입니다.",
    "실제 달러 가격차": "선물 평균가와 현물 평균가의 실제 달러 차이입니다.\n퍼센트가 아니라 1코인 기준 가격차를 보여줍니다.",
    "현물 평균가": "글로벌 현물 거래소 가격들을 평균낸 값입니다.\n선물 가격과 비교하는 기준 현물가입니다.",
    "선물 평균가": "글로벌 선물/Perpetual 거래소 가격들을 평균낸 값입니다.\n현물 가격과 비교해 베이시스를 판단합니다.",
    "베이시스 vs 24h 평균": "현재 베이시스가 최근 24시간 평균보다 높은지 낮은지 보여줍니다.\n선물/현물 구조가 평소보다 벌어졌는지 확인합니다.",
    "동조/지연": "현물과 선물 가격 반응이 얼마나 맞물리는지 보는 보조 지표입니다.\n값이 커지면 둘 사이의 반응 차이가 커진 상태로 볼 수 있습니다.",
  };

  return map[key] || "해당 항목은 현재 상세 화면의 판단 보조 지표입니다.\n수치 하나만 보지 말고 주변 지표와 함께 확인하는 용도입니다.";
}

function getSummaryValueClass(label: string, value: string) {
  if (label.includes("상태") || label.includes("판정")) return getStateTextClass(value);
  if (String(value).trim().startsWith("+") || String(value).trim().startsWith("-")) {
    return signedTextClassFromRaw(value);
  }
  if (
    label.includes("평균가") ||
    label.includes("가격차") ||
    label.includes("벌어짐") ||
    label.includes("차이") ||
    label.includes("분산") ||
    label.includes("흔들림") ||
    label.includes("지연") ||
    label.includes("베이시스") ||
    label.includes("괴리율")
  ) {
    return "text-[var(--brand)]";
  }
  return "text-white";
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("ko-KR");
}

function normalizeType(input: string): MarketType {
  const s = String(input || "").trim().toLowerCase();
  if (s === "domestic-global") return "domestic-global";
  if (s === "futures-spot") return "futures-spot";
  return "spot";
}

function typeLabel(type: MarketType) {
  if (type === "domestic-global") return "국내/해외";
  if (type === "futures-spot") return "선물/현물";
  return "SPOT";
}

function heroDescription(type: MarketType) {
  if (type === "domestic-global") {
    return "지금 국내/해외 가격 차 구조를 확인하는 화면입니다.";
  }
  if (type === "futures-spot") {
    return "지금 선물/현물 가격 구조를 확인하는 화면입니다.";
  }
  return "지금 글로벌 현물 구조를 확인하는 화면입니다.";
}

function stateSummaryText(type: MarketType, item: AnyIndicator) {
  if (type === "domestic-global") {
    const premium = n(item.premium_pct);
    if (premium >= 1) return "국내/해외 가격 차가 확대된 상태입니다.";
    if (premium >= 0.2) return "국내 가격이 해외 환산값보다 높은 편입니다.";
    if (premium <= -0.2) return "국내 가격이 해외 환산값보다 낮은 편입니다.";
    return "국내/해외 가격 차가 크지 않은 상태입니다.";
  }
  if (type === "futures-spot") {
    const basis = n(item.basis_pct);
    if (basis >= 0.15) return "선물 가격이 현물보다 높은 상태입니다.";
    if (basis <= -0.15) return "선물 가격이 현물보다 낮은 상태입니다.";
    return "선물/현물 가격 차가 크지 않은 상태입니다.";
  }
  const spreadPct = n(item.global_spread_pct);
  const vol = n(item.volatility_ratio);
  if (spreadPct <= 0.15 && vol <= 0.15) return "거래소 간 가격 차가 최근 기준 범위 내에 있습니다.";
  if (spreadPct <= 0.35) return "거래소 간 가격 차는 관리 가능한 범위지만 지속 확인이 필요합니다.";
  return "거래소 간 가격 차가 최근 기준보다 확대된 상태입니다.";
}

function aiTitle(type: MarketType) {
  if (type === "domestic-global") return "🤖 CAIN AI 보조 해석 (국내/해외)";
  if (type === "futures-spot") return "🤖 CAIN AI 보조 해석 (선물/현물)";
  return "🤖 CAIN AI 보조 해석 (SPOT)";
}

function aiPlaceholder(type: MarketType) {
  if (type === "domestic-global") {
    return "예) 현재 국내/해외 괴리 구조를 설명형으로 정리해줘";
  }
  if (type === "futures-spot") {
    return "예) 현재 선물/현물 구조를 설명형으로 정리해줘";
  }
  return "예) 현재 글로벌 현물 구조를 설명형으로 정리해줘";
}

function aiDefaultPrompt(type: MarketType) {
  if (type === "domestic-global") {
    return "현재 국내/해외 괴리 구조를 한국어로 쉽게 설명형으로 요약하고, 괴리율·실제 원화 차이·국내 분산 관점에서 어떤 상태인지 정리해줘";
  }
  if (type === "futures-spot") {
    return "현재 선물/현물 구조를 한국어로 쉽게 설명형으로 요약하고, 베이시스·실제 달러 가격차·동조/지연 관점에서 어떤 상태인지 정리해줘";
  }
  return "현재 글로벌 현물 구조를 한국어로 쉽게 설명형으로 요약하고, 평균가·거래소 벌어짐·단기 흔들림 관점에서 어떤 상태인지 정리해줘";
}

function aiHelperText(type: MarketType) {
  if (type === "domestic-global") {
    return "* 현재 괴리율, 실제 원화 차이, 평균가, 환율, 거래소 가격 등 핵심 데이터만 AI에 전달됩니다.";
  }
  if (type === "futures-spot") {
    return "* 현재 베이시스, 실제 달러 가격차, 평균가, 지연, 거래소 가격 등 핵심 데이터만 AI에 전달됩니다.";
  }
  return "* 현재 글로벌 평균가, 거래소 벌어짐, 단기 흔들림, 거래소 가격 등 핵심 데이터만 AI에 전달됩니다.";
}

function symLabel(symbol?: string) {
  return String(symbol || "").toUpperCase() || "코인";
}

function TypeTabs({ type, symbol }: { type: MarketType; symbol: string }) {
  const tabs: { type: MarketType; label: string }[] = [
    { type: "spot", label: "SPOT" },
    { type: "domestic-global", label: "국내/해외" },
    { type: "futures-spot", label: "선물/현물" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.type === type;
        return (
          <Link
            key={tab.type}
            href={`/personal-markets/${tab.type}/${encodeURIComponent(symbol)}`}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-[var(--brand)] bg-[color:rgba(0,229,255,0.10)] text-[var(--brand)] shadow-[0_0_0_1px_rgba(0,229,255,0.15),0_0_18px_rgba(0,229,255,0.08)]"
                : "border-[color:rgba(0,229,255,0.35)] bg-black/60 text-white/80 hover:bg-black/80 hover:text-[var(--brand)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function Card({
  title,
  children,
  badge,
  right,
  hideHeader = false,
}: {
  title?: string;
  children: ReactNode;
  badge?: string;
  right?: ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--brand)]">{title}</div>
          <div className="flex items-center gap-2">
            {right}
            {badge ? (
              <span className="rounded-full border border-[color:rgba(0,229,255,0.32)] bg-black/70 px-2 py-0.5 text-[11px] text-white/85">
                {badge}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={hideHeader ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function ValueCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  const inferredClassName =
    valueClassName ||
    (String(value).trim().startsWith("+") || String(value).trim().startsWith("-")
      ? signedTextClassFromRaw(value)
      : "text-white");

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-3">
      <div className="text-[11px] opacity-65">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${inferredClassName}`}>{value}</div>
      {sub ? <div className="mt-1 text-[11px] opacity-55">{sub}</div> : null}
    </div>
  );
}

function SectionPills({
  options,
  value,
  onChange,
  disabledKeys,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabledKeys?: string[];
}) {
  const disabledSet = new Set(disabledKeys || []);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.key === value;
        const disabled = disabledSet.has(option.key);
        return (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(option.key);
            }}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              disabled
                ? "cursor-not-allowed border-white/5 bg-black/40 text-white/30"
                : selected
                  ? "border-[var(--brand)]/40 bg-black/80 text-white"
                  : "border-white/10 bg-black/60 text-white/70 hover:bg-black/80"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type ExchangeMeta = {
  label: string;
  venue: string;
  market: string;
  iconPaths: string[];
  initial: string;
};

const EXCHANGE_NAME_MAP: Record<string, string> = {
  binance: "Binance",
  bybit: "Bybit",
  bitget: "Bitget",
  okx: "OKX",
  kraken: "Kraken",
  coinbase: "Coinbase",
  upbit: "Upbit",
  bithumb: "Bithumb",
  coinone: "Coinone",
  korbit: "Korbit",
};

const EXCHANGE_ICON_BASE_MAP: Record<string, string> = {
  binance: "binance",
  bybit: "bybit",
  bitget: "bitget",
  okx: "okx",
  kraken: "kraken",
  coinbase: "coinbase",
  upbit: "upbit",
  bithumb: "bithumb",
  coinone: "coinone",
  korbit: "korbit",
};

function titleCaseExchange(raw: string) {
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getExchangeMeta(rawName: string): ExchangeMeta {
  const raw = String(rawName || "").trim();
  const lower = raw.toLowerCase();
  const base = lower.split(/[_-]/)[0] || lower;
  const iconBase = EXCHANGE_ICON_BASE_MAP[base] || base || "exchange";
  const venue = EXCHANGE_NAME_MAP[base] || titleCaseExchange(base || raw) || "Exchange";

  let market = "";
  if (lower.includes("perp") || lower.includes("perpetual")) market = "Perpetual";
  else if (lower.includes("future")) market = "Futures";
  else if (lower.includes("spot")) market = "Spot";
  else if (lower.includes("krw")) market = "KRW";
  else if (lower.includes("usd")) market = "USD";

  return {
    label: market ? `${venue}-${market}` : venue,
    venue,
    market,
    iconPaths: [
      `/exchanges/${iconBase}.png`,
      `/exchanges/${iconBase}.svg`,
      `/exchanges/${iconBase}.webp`,
      `/exchanges/${iconBase}.jpg`,
    ],
    initial: venue.slice(0, 1).toUpperCase(),
  };
}

const GLOBAL_EXCHANGE_ORDER = ["binance", "bitget", "bybit", "okx", "kraken", "coinbase"];
const DOMESTIC_EXCHANGE_ORDER = ["upbit", "bithumb", "coinone", "korbit"];

function getExchangeBaseName(rawName: string) {
  const lower = String(rawName || "").trim().toLowerCase();
  const first = lower.split(/[_-]/)[0] || lower;
  if (first === "okex") return "okx";
  if (first === "gdax" || first === "coinbasepro" || first === "coinbaseexchange") return "coinbase";
  return first;
}

function orderExchangeRows(rows: ExRow[]) {
  const hasDomestic = rows.some((row) => {
    const base = getExchangeBaseName(row.name);
    return DOMESTIC_EXCHANGE_ORDER.includes(base) || String(row.name || "").toLowerCase().includes("krw");
  });

  const preferredOrder = hasDomestic ? DOMESTIC_EXCHANGE_ORDER : GLOBAL_EXCHANGE_ORDER;

  return [...rows].sort((a, b) => {
    const aBase = getExchangeBaseName(a.name);
    const bBase = getExchangeBaseName(b.name);
    const aIndex = preferredOrder.includes(aBase) ? preferredOrder.indexOf(aBase) : 999;
    const bIndex = preferredOrder.includes(bBase) ? preferredOrder.indexOf(bBase) : 999;

    if (aIndex !== bIndex) return aIndex - bIndex;

    const aMeta = getExchangeMeta(a.name);
    const bMeta = getExchangeMeta(b.name);
    const marketPriority = (market: string) => {
      const m = market.toLowerCase();
      if (m === "spot") return 0;
      if (m === "perp" || m === "perpetual") return 1;
      if (m === "futures") return 2;
      if (m === "krw") return 0;
      return 3;
    };

    const marketDiff = marketPriority(aMeta.market) - marketPriority(bMeta.market);
    if (marketDiff !== 0) return marketDiff;

    return String(a.name).localeCompare(String(b.name));
  });
}

function ExchangeIcon({ name }: { name: string }) {
  const meta = getExchangeMeta(name);
  const [iconIndex, setIconIndex] = useState(0);
  const [failedAll, setFailedAll] = useState(false);
  const iconSrc = meta.iconPaths[iconIndex];

  useEffect(() => {
    setIconIndex(0);
    setFailedAll(false);
  }, [name]);

  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/25 bg-black/60">
      {failedAll ? (
        <span className="inline-flex h-full w-full items-center justify-center text-[10px] font-semibold text-white/80">
          {meta.initial}
        </span>
      ) : iconSrc ? (
        <img
          src={iconSrc}
          alt={meta.venue}
          className="h-full w-full scale-[1.08] object-contain"
          onError={() => {
            if (iconIndex < meta.iconPaths.length - 1) {
              setIconIndex((prev) => prev + 1);
            } else {
              setFailedAll(true);
            }
          }}
        />
      ) : null}
    </span>
  );
}

function InfoPopover({
  title,
  content,
  open,
  onToggle,
  side = "left",
}: {
  title: string;
  content: string;
  open: boolean;
  onToggle: () => void;
  side?: "left" | "right";
}) {
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={onToggle}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:rgba(0,229,255,0.45)] text-[10px] text-[var(--brand)] hover:bg-[color:rgba(0,229,255,0.08)]"
        aria-label={`${title} 설명 보기`}
      >
        ?
      </button>
      {open ? (
        <div
          className={`absolute top-6 z-30 w-72 rounded-xl border border-[color:rgba(0,229,255,0.25)] bg-[#071015] p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.55)] ${
            side === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="text-xs font-semibold text-[var(--brand)]">{title}</div>
          <div className="mt-1 whitespace-pre-line text-[11px] leading-5 text-white/80">{content}</div>
        </div>
      ) : null}
    </div>
  );
}

function InfoLabel({
  label,
  title,
  content,
  open,
  onToggle,
  side = "left",
  className = "",
}: {
  label: string;
  title?: string;
  content?: string;
  open: boolean;
  onToggle: () => void;
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span>{label}</span>
      <InfoPopover
        title={title || label}
        content={content || getSummaryInfoText(label)}
        open={open}
        onToggle={onToggle}
        side={side}
      />
    </div>
  );
}

function CurrencyInlineToggle({
  value,
  onChange,
}: {
  value: CurrencyMode;
  onChange: (value: CurrencyMode) => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-[color:rgba(0,229,255,0.35)] bg-black/60">
      <button
        type="button"
        onClick={() => onChange("KRW")}
        className={`px-2 py-0.5 text-[10px] transition ${
          value === "KRW"
            ? "bg-[color:rgba(0,229,255,0.14)] text-[var(--brand)]"
            : "text-white/70 hover:text-white"
        }`}
      >
        KRW
      </button>
      <button
        type="button"
        onClick={() => onChange("USD")}
        className={`px-2 py-0.5 text-[10px] transition ${
          value === "USD"
            ? "bg-[color:rgba(0,229,255,0.14)] text-[var(--brand)]"
            : "text-white/70 hover:text-white"
        }`}
      >
        USD
      </button>
    </div>
  );
}


function MobileSegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-[color:rgba(0,229,255,0.32)] bg-black/60">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-2 py-0.5 text-[10px] transition ${
            value === option.value
              ? "bg-[color:rgba(0,229,255,0.14)] text-[var(--brand)]"
              : "text-white/70 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function convertExchangePrice(value: number, baseUnit: "KRW" | "USD", displayUnit: CurrencyMode, fx: number) {
  if (baseUnit === displayUnit) return value;
  if (!fx || fx <= 0) return NaN;
  if (baseUnit === "USD" && displayUnit === "KRW") return value * fx;
  if (baseUnit === "KRW" && displayUnit === "USD") return value / fx;
  return value;
}

function formatExchangePrice(value: number, displayUnit: CurrencyMode) {
  if (!Number.isFinite(value)) return "-";
  return displayUnit === "KRW" ? fmtKrw(value) : fmtUsd(value, 6);
}

function formatExchangeDelta(value: number, displayUnit: CurrencyMode) {
  if (!Number.isFinite(value)) return "-";
  return displayUnit === "KRW" ? fmtSignedKrw(value) : fmtSignedUsd(value, 4);
}

type SummaryStripItem = {
  label: string;
  value: string;
  sub?: string;
  infoTitle?: string;
  infoContent?: string;
  popoverSide?: "left" | "right";
  valueClassName?: string;
};

function SummaryStrip({
  items,
}: {
  items: SummaryStripItem[];
}) {
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const key = `${item.label}-${index}`;
          const isOpen = activeInfoKey === key;
          const side = item.popoverSide || (index % 4 === 3 ? "right" : "left");
          const valueClassName = item.valueClassName || getSummaryValueClass(item.label, item.value);

          return (
            <div key={`${item.label}-${item.value}-${index}`} className="min-w-0 border-l border-[color:rgba(0,229,255,0.22)] pl-3">
              <InfoLabel
                label={item.label}
                title={item.infoTitle}
                content={item.infoContent}
                open={isOpen}
                onToggle={() => setActiveInfoKey(isOpen ? null : key)}
                side={side}
                className="text-[11px] text-white/55"
              />
              <div className={`mt-1 truncate text-sm font-semibold ${valueClassName}`}>{item.value}</div>
              {item.sub ? <div className="mt-1 truncate text-[11px] text-white/50">{item.sub}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExchangeList({
  title,
  rows,
  unit,
  rate,
}: {
  title: string;
  rows: ExRow[];
  unit: "KRW" | "USD";
  rate?: number | null;
}) {
  const [displayUnit, setDisplayUnit] = useState<CurrencyMode>(unit);
  const fx = n(rate);
  const sorted = useMemo(() => orderExchangeRows(rows), [rows]);
  const { highest, lowest, spread, average } = useMemo(() => getExtremes(sorted), [sorted]);

  const convertedAverage = convertExchangePrice(average, unit, displayUnit, fx);
  const convertedSpread = convertExchangePrice(spread, unit, displayUnit, fx);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--brand)]">{title}</div>
          <div className="mt-1 text-[11px] text-white/55">
            {sorted.length ? `${sorted.length}개 거래소 · 평균 ${formatExchangePrice(convertedAverage, displayUnit)} · 최고-최저 차이 ${formatExchangePrice(convertedSpread, displayUnit)}` : "표시할 거래소 가격이 아직 없습니다."}
          </div>
        </div>
        <CurrencyInlineToggle value={displayUnit} onChange={setDisplayUnit} />
      </div>

      {!sorted.length ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-4 text-[11px] opacity-55">
          표시할 거래소 가격이 아직 없습니다.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/50">
          <div className="md:hidden">
            <div className="grid grid-cols-[minmax(104px,1.15fr)_minmax(88px,0.95fr)_minmax(78px,0.85fr)_42px] border-b border-white/10 bg-black/70 px-2.5 py-2 text-[10px] text-white/45">
              <div>거래소</div>
              <div className="text-right">가격</div>
              <div className="text-right">평균대비</div>
              <div className="text-right">상태</div>
            </div>

            <div className="divide-y divide-white/5">
              {sorted.map((row) => {
                const meta = getExchangeMeta(row.name);
                const convertedPrice = convertExchangePrice(row.price, unit, displayUnit, fx);
                const convertedDelta = convertExchangePrice(row.price - average, unit, displayUnit, fx);
                const isHighest = highest?.name === row.name && highest?.price === row.price;
                const isLowest = lowest?.name === row.name && lowest?.price === row.price;
                const status = isHighest ? "최고" : isLowest ? "최저" : "정상";
                const statusClass = isHighest
                  ? "text-[#22c55e]"
                  : isLowest
                    ? "text-[#ef4444]"
                    : "text-white/65";

                return (
                  <div
                    key={row.name}
                    className="grid grid-cols-[minmax(104px,1.15fr)_minmax(88px,0.95fr)_minmax(78px,0.85fr)_42px] items-center gap-2 px-2.5 py-2.5 text-xs transition hover:bg-white/[0.03]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ExchangeIcon name={row.name} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">{meta.label}</div>
                      </div>
                    </div>

                    <div className="truncate text-right font-semibold text-[var(--brand)]">
                      {formatExchangePrice(convertedPrice, displayUnit)}
                    </div>

                    <div className={`truncate text-right font-semibold ${convertedDelta > 0 ? "text-[#22c55e]" : convertedDelta < 0 ? "text-[#ef4444]" : "text-white/70"}`}>
                      {formatExchangeDelta(convertedDelta, displayUnit)}
                    </div>

                    <div className={`truncate text-right font-semibold ${statusClass}`}>
                      {status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-[minmax(170px,1.4fr)_minmax(120px,1fr)_minmax(110px,0.9fr)_80px] border-b border-white/10 bg-black/70 px-3 py-2 text-[11px] text-white/55">
              <div>거래소</div>
              <div className="text-center">가격</div>
              <div className="text-center">평균 대비</div>
              <div className="text-center">상태</div>
            </div>

            <div className="divide-y divide-white/5">
              {sorted.map((row) => {
                const meta = getExchangeMeta(row.name);
                const convertedPrice = convertExchangePrice(row.price, unit, displayUnit, fx);
                const convertedDelta = convertExchangePrice(row.price - average, unit, displayUnit, fx);
                const isHighest = highest?.name === row.name && highest?.price === row.price;
                const isLowest = lowest?.name === row.name && lowest?.price === row.price;
                const status = isHighest ? "최고" : isLowest ? "최저" : "정상";
                const statusClass = isHighest
                  ? "text-[#22c55e]"
                  : isLowest
                    ? "text-[#ef4444]"
                    : "text-white/65";

                return (
                  <div
                    key={row.name}
                    className="grid items-center gap-3 px-3 py-3 text-sm transition hover:bg-white/[0.03] md:grid-cols-[minmax(170px,1.4fr)_minmax(120px,1fr)_minmax(110px,0.9fr)_80px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ExchangeIcon name={row.name} />
                      <div className="min-w-0 self-center">
                        <div className="truncate font-semibold text-white">{meta.label}</div>
                      </div>
                    </div>

                    <div className="font-semibold text-[var(--brand)] md:text-center">
                      <span>{formatExchangePrice(convertedPrice, displayUnit)}</span>
                    </div>

                    <div className={`text-xs font-semibold md:text-center ${convertedDelta > 0 ? "text-[#22c55e]" : convertedDelta < 0 ? "text-[#ef4444]" : "text-white/70"}`}>
                      <span>{formatExchangeDelta(convertedDelta, displayUnit)}</span>
                    </div>

                    <div className={`text-xs font-semibold md:text-center ${statusClass}`}>
                      <span>{status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-[11px] opacity-65">{label}</div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 pr-12 text-sm outline-none transition focus:border-white/20"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] opacity-55">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function SpotPlanCalculator({ item }: { item: AnyIndicator }) {
  const basePrice =
    n(item.global_avg_usd) ||
    n(item.global_spot_avg_usd) ||
    avg((item.exchanges?.global_spot_usd || []).map((row) => row.price));

  const [capital, setCapital] = useState(10000);
  const [entry1, setEntry1] = useState(basePrice || 0);
  const [entry2, setEntry2] = useState(basePrice ? basePrice * 0.985 : 0);
  const [entry3, setEntry3] = useState(basePrice ? basePrice * 0.97 : 0);
  const [alloc1, setAlloc1] = useState(40);
  const [alloc2, setAlloc2] = useState(35);
  const [alloc3, setAlloc3] = useState(25);
  const [targetPrice, setTargetPrice] = useState(basePrice ? basePrice * 1.04 : 0);
  const [stopPrice, setStopPrice] = useState(basePrice ? basePrice * 0.96 : 0);

  useEffect(() => {
    if (!basePrice) return;
    setEntry1(basePrice);
    setEntry2(basePrice * 0.985);
    setEntry3(basePrice * 0.97);
    setTargetPrice(basePrice * 1.04);
    setStopPrice(basePrice * 0.96);
  }, [basePrice]);

  const allocSum = alloc1 + alloc2 + alloc3;
  const deployed = capital * (allocSum / 100);
  const qty1 = entry1 > 0 ? (capital * (alloc1 / 100)) / entry1 : 0;
  const qty2 = entry2 > 0 ? (capital * (alloc2 / 100)) / entry2 : 0;
  const qty3 = entry3 > 0 ? (capital * (alloc3 / 100)) / entry3 : 0;
  const totalQty = qty1 + qty2 + qty3;
  const avgEntry = totalQty > 0 ? deployed / totalQty : 0;
  const targetPnl = totalQty > 0 ? totalQty * targetPrice - deployed : 0;
  const stopPnl = totalQty > 0 ? totalQty * stopPrice - deployed : 0;

  const mobileResultClass =
    "rounded-xl border border-white/10 bg-black/60 p-3";
  const mobileResultValueClass =
    "mt-1 truncate text-sm font-semibold text-[var(--brand)]";

  return (
    <Card title="실전 계산기 · 분할 진입 평균단가" badge="SPOT">
      <div className="grid gap-3 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="총 투자금" value={capital} onChange={setCapital} suffix="USD" />
          <div className={mobileResultClass}>
            <div className="text-[11px] opacity-65">실투입 금액</div>
            <div className={mobileResultValueClass}>{fmtUsd(deployed, 2)}</div>
            <div className="mt-1 text-[11px] opacity-55">투입 비중 {allocSum.toFixed(1)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField label="1차 진입가" value={entry1} onChange={setEntry1} suffix="USD" />
          <NumberField label="1차 비중" value={alloc1} onChange={setAlloc1} suffix="%" />
          <NumberField label="2차 진입가" value={entry2} onChange={setEntry2} suffix="USD" />
          <NumberField label="2차 비중" value={alloc2} onChange={setAlloc2} suffix="%" />
          <NumberField label="3차 진입가" value={entry3} onChange={setEntry3} suffix="USD" />
          <NumberField label="3차 비중" value={alloc3} onChange={setAlloc3} suffix="%" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={mobileResultClass}>
            <div className="text-[11px] opacity-65">예상 평균단가</div>
            <div className={mobileResultValueClass}>{fmtUsd(avgEntry, 4)}</div>
          </div>
          <div className={mobileResultClass}>
            <div className="text-[11px] opacity-65">예상 보유 수량</div>
            <div className={mobileResultValueClass}>{totalQty ? totalQty.toFixed(6) : "-"}</div>
            <div className="mt-1 text-[11px] opacity-55">{symLabel(item.symbol)} 기준</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField label="목표 매도가" value={targetPrice} onChange={setTargetPrice} suffix="USD" />
          <div className={mobileResultClass}>
            <div className="text-[11px] opacity-65">목표가 도달 손익</div>
            <div className={`mt-1 truncate text-sm font-semibold ${signedTextClassFromRaw(fmtSignedUsd(targetPnl, 2))}`}>
              {fmtSignedUsd(targetPnl, 2)}
            </div>
            {deployed > 0 ? <div className="mt-1 text-[11px] opacity-55">{fmtSignedPct((targetPnl / deployed) * 100, 2)}</div> : null}
          </div>

          <NumberField label="손절 기준가" value={stopPrice} onChange={setStopPrice} suffix="USD" />
          <div className={mobileResultClass}>
            <div className="text-[11px] opacity-65">손절가 도달 손익</div>
            <div className={`mt-1 truncate text-sm font-semibold ${signedTextClassFromRaw(fmtSignedUsd(stopPnl, 2))}`}>
              {fmtSignedUsd(stopPnl, 2)}
            </div>
            {deployed > 0 ? <div className="mt-1 text-[11px] opacity-55">{fmtSignedPct((stopPnl / deployed) * 100, 2)}</div> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ValueCard
            label="지금 구조 코멘트"
            value={n(item.global_spread_pct) <= 0.2 ? "체결 구조 양호" : "체결 벌어짐 체크"}
            sub="현물은 평균단가보다 체결 왜곡 관리가 중요합니다."
          />
          <ValueCard
            label="권장 체크"
            value="분할 진입 + 거래소 분산"
            sub="한 거래소 몰빵보다 체결가 안정성이 좋아질 수 있습니다."
          />
        </div>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
        <NumberField label="총 투자금" value={capital} onChange={setCapital} suffix="USD" />
        <NumberField label="1차 진입가" value={entry1} onChange={setEntry1} suffix="USD" />
        <NumberField label="2차 진입가" value={entry2} onChange={setEntry2} suffix="USD" />
        <NumberField label="3차 진입가" value={entry3} onChange={setEntry3} suffix="USD" />
        <NumberField label="1차 비중" value={alloc1} onChange={setAlloc1} suffix="%" />
        <NumberField label="2차 비중" value={alloc2} onChange={setAlloc2} suffix="%" />
        <NumberField label="3차 비중" value={alloc3} onChange={setAlloc3} suffix="%" />
        <NumberField label="목표 매도가" value={targetPrice} onChange={setTargetPrice} suffix="USD" />
        <NumberField label="손절 기준가" value={stopPrice} onChange={setStopPrice} suffix="USD" />
      </div>

      <div className="mt-4 hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
        <ValueCard label="투입 비중 합" value={`${allocSum.toFixed(1)}%`} sub={allocSum === 100 ? "비중 합 100%" : "비중 합을 100%에 맞추면 계산이 더 직관적입니다."} valueClassName="text-[var(--brand)]" />
        <ValueCard label="실투입 금액" value={fmtUsd(deployed, 2)} valueClassName="text-[var(--brand)]" />
        <ValueCard label="예상 평균단가" value={fmtUsd(avgEntry, 4)} valueClassName="text-[var(--brand)]" />
        <ValueCard label="예상 보유 수량" value={totalQty ? totalQty.toFixed(6) : "-"} sub={`${symLabel(item.symbol)} 기준`} valueClassName="text-[var(--brand)]" />
        <ValueCard label="목표가 도달 손익" value={fmtSignedUsd(targetPnl, 2)} sub={deployed > 0 ? fmtSignedPct((targetPnl / deployed) * 100, 2) : undefined} />
        <ValueCard label="손절가 도달 손익" value={fmtSignedUsd(stopPnl, 2)} sub={deployed > 0 ? fmtSignedPct((stopPnl / deployed) * 100, 2) : undefined} />
        <ValueCard label="지금 구조 코멘트" value={n(item.global_spread_pct) <= 0.2 ? "체결 구조 양호" : "체결 벌어짐 체크"} sub="현물은 평균단가보다 체결 왜곡 관리가 중요합니다." />
        <ValueCard label="권장 체크" value="분할 진입 + 거래소 분산" sub="한 거래소 몰빵보다 체결가 안정성이 좋아질 수 있습니다." />
      </div>
    </Card>
  );
}


function DomesticArbCalculator({ item }: { item: AnyIndicator }) {
  const defaultDomestic = n(item.domestic_avg_krw);
  const defaultGlobalKrw = n(item.global_spot_avg_krw);
  const defaultRate = n(item.rate_krw_usd) || 1500;

  const [capitalKrw, setCapitalKrw] = useState(10000000);
  const [domesticPrice, setDomesticPrice] = useState(defaultDomestic);
  const [globalPriceKrw, setGlobalPriceKrw] = useState(defaultGlobalKrw);
  const [rate, setRate] = useState(defaultRate);
  const [domesticFeePct, setDomesticFeePct] = useState(0.05);
  const [globalFeePct, setGlobalFeePct] = useState(0.1);
  const [slippagePct, setSlippagePct] = useState(0.1);
  const [transferCostKrw, setTransferCostKrw] = useState(15000);

  useEffect(() => {
    if (defaultDomestic > 0) setDomesticPrice(defaultDomestic);
    if (defaultGlobalKrw > 0) setGlobalPriceKrw(defaultGlobalKrw);
    if (defaultRate > 0) setRate(defaultRate);
  }, [defaultDomestic, defaultGlobalKrw, defaultRate]);

  const buyPrice = globalPriceKrw;
  const qty = buyPrice > 0 ? capitalKrw / (buyPrice * (1 + globalFeePct / 100 + slippagePct / 100)) : 0;
  const sellRevenue = qty > 0 ? qty * domesticPrice * (1 - domesticFeePct / 100 - slippagePct / 100) : 0;

  const netProfit = sellRevenue - capitalKrw - transferCostKrw;
  const grossDiffKrw = domesticPrice - globalPriceKrw;
  const grossDiffPct = globalPriceKrw > 0 ? (grossDiffKrw / globalPriceKrw) * 100 : 0;
  const breakEvenPct = domesticFeePct + globalFeePct + slippagePct * 2 + (capitalKrw > 0 ? (transferCostKrw / capitalKrw) * 100 : 0);

  return (
    <Card title="실전 계산기 · 국내/해외 차익 체크" badge="국내/해외">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberField label="투자금" value={capitalKrw} onChange={setCapitalKrw} suffix="원" />
        <NumberField label="국내 가격" value={domesticPrice} onChange={setDomesticPrice} suffix="원" />
        <NumberField label="해외 환산 가격" value={globalPriceKrw} onChange={setGlobalPriceKrw} suffix="원" />
        <NumberField label="환율" value={rate} onChange={setRate} suffix="원" />
        <NumberField label="국내 수수료" value={domesticFeePct} onChange={setDomesticFeePct} suffix="%" />
        <NumberField label="해외 수수료" value={globalFeePct} onChange={setGlobalFeePct} suffix="%" />
        <NumberField label="슬리피지(왕복 기준 단방향)" value={slippagePct} onChange={setSlippagePct} suffix="%" />
        <NumberField label="이체/출금 비용" value={transferCostKrw} onChange={setTransferCostKrw} suffix="원" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ValueCard label="현재 괴리율" value={fmtSignedPct(grossDiffPct, 3)} sub="국내-해외 환산 기준" />
        <ValueCard label="실제 원화 차이" value={fmtSignedKrw(grossDiffKrw)} sub="한 코인당 기준" />
        <ValueCard label="예상 매수 수량" value={qty ? qty.toFixed(6) : "-"} sub={`${symLabel(item.symbol)} 기준`} valueClassName="text-[var(--brand)]" />
        <ValueCard label="비용 반영 예상 순손익" value={fmtSignedKrw(netProfit)} sub={capitalKrw > 0 ? fmtSignedPct((netProfit / capitalKrw) * 100, 2) : undefined} />
        <ValueCard label="손익분기 괴리율" value={fmtPct(breakEvenPct, 2)} sub="이 수치를 넘어야 비용을 이길 가능성이 있습니다." valueClassName="text-[var(--brand)]" />
        <ValueCard label="현재 판정" value={grossDiffPct > breakEvenPct ? "실전 검토 가능" : "비용 우세 가능성"} sub="퍼센트만 보고 판단하지 말고 비용 반영 결과를 같이 보셔야 합니다." />
        <ValueCard label="참고 환율" value={fmtKrw(rate)} sub="해외 환산 기준 체크용" valueClassName="text-[var(--brand)]" />
        <ValueCard label="권장 체크" value="국내 분산 + 체결 깊이" sub="괴리가 보여도 국내 체결가가 흔들리면 실제 결과가 줄어들 수 있습니다." />
      </div>
    </Card>
  );
}

function FuturesBasisCalculator({ item }: { item: AnyIndicator }) {
  const defaultSpot = n(item.global_spot_avg_usd);
  const defaultFutures = n(item.global_futures_avg_usd);

  const [capitalUsd, setCapitalUsd] = useState(10000);
  const [spotPrice, setSpotPrice] = useState(defaultSpot);
  const [futuresPrice, setFuturesPrice] = useState(defaultFutures);
  const [leverage, setLeverage] = useState(1);
  const [spotFeePct, setSpotFeePct] = useState(0.1);
  const [futuresFeePct, setFuturesFeePct] = useState(0.04);
  const [fundingPctPerDay, setFundingPctPerDay] = useState(0.01);
  const [holdingDays, setHoldingDays] = useState(3);

  useEffect(() => {
    if (defaultSpot > 0) setSpotPrice(defaultSpot);
    if (defaultFutures > 0) setFuturesPrice(defaultFutures);
  }, [defaultSpot, defaultFutures]);

  const notional = capitalUsd * Math.max(1, leverage);
  const qty = spotPrice > 0 ? notional / spotPrice : 0;
  const grossGap = qty * (futuresPrice - spotPrice);
  const feeCost = notional * (spotFeePct / 100 + futuresFeePct / 100);
  const fundingCost = notional * (fundingPctPerDay / 100) * Math.max(0, holdingDays);
  const netEdge = grossGap - feeCost - fundingCost;
  const basisPct = spotPrice > 0 ? ((futuresPrice - spotPrice) / spotPrice) * 100 : 0;
  const breakEvenBasisPct = notional > 0 ? ((feeCost + fundingCost) / notional) * 100 : 0;

  return (
    <Card title="실전 계산기 · 베이시스/헤지 체크" badge="선물/현물">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberField label="현물 가격" value={spotPrice} onChange={setSpotPrice} suffix="USD" />
        <NumberField label="선물 가격" value={futuresPrice} onChange={setFuturesPrice} suffix="USD" />
        <NumberField label="자본금" value={capitalUsd} onChange={setCapitalUsd} suffix="USD" />
        <NumberField label="레버리지" value={leverage} onChange={setLeverage} suffix="x" />
        <NumberField label="현물 수수료" value={spotFeePct} onChange={setSpotFeePct} suffix="%" />
        <NumberField label="선물 수수료" value={futuresFeePct} onChange={setFuturesFeePct} suffix="%" />
        <NumberField label="예상 펀딩비/일" value={fundingPctPerDay} onChange={setFundingPctPerDay} suffix="%" />
        <NumberField label="보유 기간" value={holdingDays} onChange={setHoldingDays} suffix="일" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ValueCard label="현재 베이시스" value={fmtSignedPct(basisPct, 3)} sub="선물-현물 기준" />
        <ValueCard label="실제 달러 가격차" value={fmtSignedUsd(futuresPrice - spotPrice, 4)} sub="한 코인당 기준" />
        <ValueCard label="예상 수량" value={qty ? qty.toFixed(6) : "-"} sub={`${symLabel(item.symbol)} 기준`} valueClassName="text-[var(--brand)]" />
        <ValueCard label="비용 반영 순엣지" value={fmtSignedUsd(netEdge, 2)} sub={capitalUsd > 0 ? fmtSignedPct((netEdge / capitalUsd) * 100, 2) : undefined} />
        <ValueCard label="총 수수료" value={fmtUsd(feeCost, 2)} valueClassName="text-[var(--brand)]" />
        <ValueCard label="예상 펀딩비" value={fmtUsd(fundingCost, 2)} valueClassName="text-[var(--brand)]" />
        <ValueCard label="손익분기 베이시스" value={fmtPct(breakEvenBasisPct, 3)} sub="이 수치를 넘어야 비용을 이길 가능성이 있습니다." valueClassName="text-[var(--brand)]" />
        <ValueCard label="현재 판정" value={Math.abs(basisPct) > breakEvenBasisPct ? "구조 검토 가능" : "비용 우세 가능성"} sub="베이시스 방향보다 비용 포함 순엣지가 더 중요합니다." />
      </div>
    </Card>
  );
}

function unitText(unit: UnitKey, value: number | null, digits = 3) {
  if (value === null || !Number.isFinite(value)) return "-";
  if (unit === "usd") return fmtUsd(value, digits);
  if (unit === "krw") return fmtKrw(value);
  if (unit === "percent") return fmtSignedPct(value, digits);
  if (unit === "count") return `${Math.round(value).toLocaleString()}개`;
  if (unit === "score") return `${Math.round(value)}`;
  if (unit === "flag") return value > 0 ? "ON" : "OFF";
  if (unit === "dominance") {
    if (value > 0.1) return "국내 우위";
    if (value < -0.1) return "해외 우위";
    return "중립";
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatAxisTime(ts: string, range: RangeKey) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;

  if (range === "1h") {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  if (range === "24h") {
    return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (range === "7d") {
    return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function chartColor(index: number) {
  const palette = ["#22d3ee", "#34d399", "#f59e0b", "#a78bfa", "#f87171", "#60a5fa"];
  return palette[index % palette.length];
}

function boolToNumber(value: boolean | null | undefined) {
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
}

function dominanceToNumber(value: string | null | undefined) {
  const v = String(value || "").toUpperCase();
  if (!v) return null;
  if (["KR_ACTIVE", "KR", "DOMESTIC", "KOREA", "DOMESTIC_PREMIUM"].includes(v)) return 1;
  if (["GLOBAL_ACTIVE", "GLOBAL", "OVERSEAS", "INTL", "GLOBAL_DISCOUNT"].includes(v)) return -1;
  if (["WATCH", "NEUTRAL", "NOISE", "STABLE", "NORMAL"].includes(v)) return 0;
  return null;
}

function deriveCurrentValueForKey(item: AnyIndicator, key: string): number | null {
  switch (key) {
    case "global_avg_usd":
      return Number.isFinite(Number(item.global_avg_usd)) ? Number(item.global_avg_usd) : Number(item.global_spot_avg_usd ?? null);
    case "global_spread_pct":
      return Number(item.global_spread_pct ?? null);
    case "global_spread_usd":
      return Number(item.global_spread_usd ?? null);
    case "global_spread_krw":
      return null;
    case "volatility_ratio":
      return Number(item.volatility_ratio ?? null);
    case "premium_pct":
      return Number(item.premium_pct ?? null);
    case "premium_krw_gap":
      if (Number.isFinite(Number(item.domestic_avg_krw)) && Number.isFinite(Number(item.global_spot_avg_krw))) {
        return Number(item.domestic_avg_krw) - Number(item.global_spot_avg_krw);
      }
      return null;
    case "domestic_spread_krw":
      return Number(item.domestic_spread_krw ?? null);
    case "domestic_avg_krw":
      return Number(item.domestic_avg_krw ?? null);
    case "global_spot_avg_krw":
      return Number(item.global_spot_avg_krw ?? null);
    case "basis_pct":
      return Number(item.basis_pct ?? null);
    case "price_gap_usd":
      if (Number.isFinite(Number(item.global_futures_avg_usd)) && Number.isFinite(Number(item.global_spot_avg_usd))) {
        return Number(item.global_futures_avg_usd) - Number(item.global_spot_avg_usd);
      }
      return null;
    case "global_spot_avg_usd":
      return Number(item.global_spot_avg_usd ?? null);
    case "global_futures_avg_usd":
      return Number(item.global_futures_avg_usd ?? null);
    case "delay_proxy":
      return Number(item.delay_proxy ?? null);
    case "dominance":
      return dominanceToNumber(item.state);
    default:
      return null;
  }
}

function appendLivePoint(series: ApiChartSeries, item: AnyIndicator | null): ApiChartSeries {
  if (!item?.ts) return series;
  const currentValue = deriveCurrentValueForKey(item, series.key);
  if (currentValue === null || !Number.isFinite(currentValue)) return series;

  const liveTs = item.ts;
  const data = [...series.data];
  const lastTs = data[data.length - 1]?.ts;
  if (!lastTs) {
    data.push({ ts: liveTs, value: currentValue });
    return { ...series, data };
  }

  const lastMs = new Date(lastTs).getTime();
  const liveMs = new Date(liveTs).getTime();
  if (!Number.isFinite(lastMs) || !Number.isFinite(liveMs)) return series;

  if (liveMs > lastMs) {
    data.push({ ts: liveTs, value: currentValue });
    return { ...series, data };
  }

  if (liveTs === lastTs) {
    data[data.length - 1] = { ts: liveTs, value: currentValue };
    return { ...series, data };
  }

  return series;
}

function prepareSeries(
  chartData: ChartRes | null,
  item: AnyIndicator | null,
  range: RangeKey
) {
  const source = chartData?.series || [];

  if (range === "7d" || range === "30d" || range === "90d") {
    return source;
  }

  return source.map((entry) => appendLivePoint(entry, item));
}

function buildViews(type: MarketType, allSeries: ApiChartSeries[]) {
  const has = (key: string) => allSeries.some((entry) => entry.key === key && entry.data.some((p) => typeof p.value === "number" && Number.isFinite(p.value)));
  const views: ChartView[] = [];

  if (type === "domestic-global") {
    if (has("domestic_avg_krw") && has("global_spot_avg_krw")) {
      views.push({ key: "compare-krw", label: "국내 vs 해외 환산가", description: "국내 평균가와 해외 환산가를 비교합니다.", seriesKeys: ["domestic_avg_krw", "global_spot_avg_krw"] });
    }
    if (has("premium_pct")) {
      views.push({ key: "premium", label: "괴리율", description: "국내/해외 괴리율 흐름을 봅니다.", seriesKeys: ["premium_pct"] });
    }
    if (has("premium_krw_gap")) {
      views.push({ key: "gap-krw", label: "실제 원화 차이", description: "퍼센트가 아니라 실제 원화 차이를 봅니다.", seriesKeys: ["premium_krw_gap"] });
    }
    if (has("domestic_spread_krw")) {
      views.push({ key: "domestic-spread", label: "국내 분산", description: "국내 거래소 내부 가격 차를 봅니다.", seriesKeys: ["domestic_spread_krw"] });
    }
    if (has("dominance")) {
      views.push({ key: "dominance", label: "주도권", description: "국내 우위/해외 우위 상태를 봅니다.", seriesKeys: ["dominance"] });
    }
  } else if (type === "futures-spot") {
    if (has("global_spot_avg_usd") && has("global_futures_avg_usd")) {
      views.push({ key: "spot-vs-futures", label: "현물 vs 선물", description: "현물 평균가와 선물 평균가를 함께 비교합니다.", seriesKeys: ["global_spot_avg_usd", "global_futures_avg_usd"] });
    }
    if (has("basis_pct")) {
      views.push({ key: "basis", label: "베이시스", description: "선물-현물 기준 베이시스 흐름을 봅니다.", seriesKeys: ["basis_pct"] });
    }
    if (has("price_gap_usd")) {
      views.push({ key: "gap-usd", label: "실제 달러 가격차", description: "한 코인 기준 실제 달러 가격 차이를 봅니다.", seriesKeys: ["price_gap_usd"] });
    }
    if (has("delay_proxy")) {
      views.push({ key: "delay", label: "동조/지연", description: "현물·선물 동조/지연 상태를 봅니다.", seriesKeys: ["delay_proxy"] });
    }
  } else {
    if (has("global_avg_usd")) {
      views.push({ key: "price", label: "글로벌 평균가", description: "글로벌 평균가 흐름을 봅니다.", seriesKeys: ["global_avg_usd"] });
    }
    if (has("global_spread_pct")) {
      views.push({
        key: "spread-pct",
        label: "거래소 벌어짐",
        description: "거래소 간 가격 차 비율을 봅니다. 툴팁에서 USD 차이도 함께 확인할 수 있습니다.",
        seriesKeys: ["global_spread_pct"],
        tooltipSeriesKeys: ["global_spread_usd"],
      });
    }
    if (has("global_spread_usd")) {
      views.push({ key: "spread-usd", label: "실제 USD 차이", description: "거래소 간 실제 달러 차이를 봅니다.", seriesKeys: ["global_spread_usd"] });
    }
  }

  if (!views.length && allSeries.length) {
    views.push({ key: allSeries[0].key, label: allSeries[0].label, description: allSeries[0].description || "기본 차트입니다.", seriesKeys: [allSeries[0].key] });
  }

  return views;
}

function buildVisualPoints(series: ApiChartSeries[]) {
  const map = new Map<string, SeriesVisualPoint>();
  series.forEach((entry) => {
    entry.data.forEach((point) => {
      const found = map.get(point.ts) || { ts: point.ts, values: {} };
      found.values[entry.key] = point.value;
      map.set(point.ts, found);
    });
  });
  return Array.from(map.values()).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

function getFirstNumericValue(series?: ApiChartSeries | null) {
  if (!series) return null;
  const hit = series.data.find(
    (point) => typeof point.value === "number" && Number.isFinite(point.value)
  );
  return typeof hit?.value === "number" ? hit.value : null;
}

function getLastNumericValue(series?: ApiChartSeries | null) {
  if (!series) return null;
  const hit = [...series.data]
    .reverse()
    .find((point) => typeof point.value === "number" && Number.isFinite(point.value));
  return typeof hit?.value === "number" ? hit.value : null;
}

function getMinMax(series?: ApiChartSeries | null) {
  if (!series) {
    return { min: null as number | null, max: null as number | null };
  }
  const values = series.data
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return { min: null as number | null, max: null as number | null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function percentChange(first: number | null, last: number | null) {
  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first === 0
  ) {
    return null;
  }
  return ((last - first) / first) * 100;
}

function niceStep(raw: number) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const frac = raw / 10 ** exp;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * 10 ** exp;
}

function buildTicks(min: number, max: number, unit: UnitKey) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (unit === "flag") return [0, 1];
  if (unit === "dominance") return [-1, 0, 1];

  let yMin = min;
  let yMax = max;
  if (yMin === yMax) {
    const padding = Math.abs(yMin || 1) * 0.1 || 1;
    yMin -= padding;
    yMax += padding;
  }

  const desired = 4;
  const step = niceStep((yMax - yMin) / Math.max(1, desired - 1));
  const start = Math.floor(yMin / step) * step;
  const end = Math.ceil(yMax / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(8)));
    if (ticks.length > 8) break;
  }
  return ticks;
}

function axisLabelText(unit: UnitKey, value: number) {
  if (!Number.isFinite(value)) return "-";
  if (unit === "usd") {
    const abs = Math.abs(value);
    const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
    return value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }
  if (unit === "krw") return Math.round(value).toLocaleString();
  if (unit === "percent") return `${value.toFixed(Math.abs(value) < 1 ? 2 : 1)}%`;
  if (unit === "flag" || unit === "count" || unit === "score") return `${Math.round(value)}`;
  if (unit === "dominance") {
    if (value > 0.5) return "국내";
    if (value < -0.5) return "해외";
    return "중립";
  }
  return `${value}`;
}

function svgPathLine(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function svgPathArea(points: { x: number; y: number }[], bottom: number) {
  if (!points.length) return "";
  const start = points[0];
  const end = points[points.length - 1];
  return `${svgPathLine(points)} L ${end.x} ${bottom} L ${start.x} ${bottom} Z`;
}

function TimeSeriesChart({
  title,
  series,
  range,
  item,
  latestState,
  extraTooltipSeries = [],
  exchangeRows,
}: {
  title: string;
  series: ApiChartSeries[];
  range: RangeKey;
  item: AnyIndicator;
  latestState?: ApiLatestState | null;
  extraTooltipSeries?: ApiChartSeries[];
  exchangeRows?: ExRow[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const points = useMemo(() => buildVisualPoints(series), [series]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);

  const numericValues = points.flatMap((point) =>
    series
      .map((entry) => point.values[entry.key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );

  const hasData = series.length > 0 && points.length > 0 && numericValues.length > 0;
  if (!hasData) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/60 p-6 text-sm opacity-60">
        선택한 차트 데이터가 아직 없습니다.
      </div>
    );
  }

  const width = 1100;
  const height = 360;
  const paddingLeft = 18;
  const paddingRight = 76;
  const paddingTop = 18;
  const paddingBottom = 38;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  let minValue = Math.min(...numericValues);
  let maxValue = Math.max(...numericValues);
  if (minValue === maxValue) {
    const pad = Math.abs(minValue || 1) * 0.1 || 1;
    minValue -= pad;
    maxValue += pad;
  }

  const yTicks = buildTicks(minValue, maxValue, series[0].unit);
  const yMin = Math.min(...yTicks);
  const yMax = Math.max(...yTicks);

  const xForIndex = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const yFor = (value: number) => {
    const ratio = (value - yMin) / (yMax - yMin || 1);
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  const zeroInRange = yMin <= 0 && yMax >= 0;
  const zeroY = zeroInRange ? yFor(0) : null;
  const activeIndex = clamp(lockedIndex ?? hoverIndex ?? (points.length - 1), 0, points.length - 1);
  const activePoint = points[activeIndex];
  const activeX = xForIndex(activeIndex);
  const xTickIndexes = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1];
  const exchangeExtremes = exchangeRows ? getExtremes(exchangeRows) : null;
  const extraTooltipRows = extraTooltipSeries
    .map((entry) => {
      const value = activePoint.values[entry.key];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return {
        key: entry.key,
        label: entry.label,
        color: "rgba(255,255,255,0.78)",
        value: unitText(entry.unit, value, 3),
      };
    })
    .filter((row): row is { key: string; label: string; color: string; value: string } => Boolean(row));

  const setIndexFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;

    const leftPadPx = rect.width * (paddingLeft / width);
    const rightPadPx = rect.width * (paddingRight / width);
    const usablePx = Math.max(1, rect.width - leftPadPx - rightPadPx);
    const localX = clamp(clientX - rect.left - leftPadPx, 0, usablePx);
    const ratio = localX / usablePx;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(index);
  };

  const latestTs = item.ts ? new Date(item.ts).getTime() : NaN;
  const chartLastTs = activePoint?.ts ? new Date(activePoint.ts).getTime() : NaN;
  const staleMinutes = Number.isFinite(latestTs) && Number.isFinite(chartLastTs) ? Math.round((latestTs - chartLastTs) / 60000) : 0;

  return (
    <div className="space-y-3">
      <div className="text-xs opacity-70">{title}</div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60"
        onMouseMove={(e) => {
          if (lockedIndex === null) setIndexFromClientX(e.clientX);
        }}
        onMouseLeave={() => {
          if (lockedIndex === null) setHoverIndex(points.length - 1);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch && lockedIndex === null) setIndexFromClientX(touch.clientX);
        }}
        onClick={(e) => {
          setIndexFromClientX(e.clientX);
          const el = containerRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const leftPadPx = rect.width * (paddingLeft / width);
          const rightPadPx = rect.width * (paddingRight / width);
          const usablePx = Math.max(1, rect.width - leftPadPx - rightPadPx);
          const localX = clamp(e.clientX - rect.left - leftPadPx, 0, usablePx);
          const ratio = localX / usablePx;
          setLockedIndex(Math.round(ratio * (points.length - 1)));
        }}
        onDoubleClick={() => setLockedIndex(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-h-[220px] w-full">
          {yTicks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 6"
            />
          ))}

          {zeroY !== null ? (
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={zeroY}
              y2={zeroY}
              stroke="rgba(255,255,255,0.14)"
              strokeDasharray="3 5"
            />
          ) : null}

          {series.map((entry, entryIndex) => {
            const color = chartColor(entryIndex);
            const drawPoints = points
              .map((point, pointIndex) => {
                const value = point.values[entry.key];
                if (typeof value !== "number" || !Number.isFinite(value)) return null;
                return { x: xForIndex(pointIndex), y: yFor(value) };
              })
              .filter((point): point is { x: number; y: number } => Boolean(point));

            if (!drawPoints.length) return null;
            const line = svgPathLine(drawPoints);
            const area = svgPathArea(drawPoints, paddingTop + chartHeight);

            return (
              <g key={entry.key}>
                {entry.chartType !== "line" ? <path d={area} fill={color} fillOpacity={0.08} /> : null}
                <path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                {typeof activePoint.values[entry.key] === "number" ? (
                  <circle cx={activeX} cy={yFor(activePoint.values[entry.key] as number)} r={4} fill={color} stroke="rgba(0,0,0,0.7)" strokeWidth={1.5} />
                ) : null}
              </g>
            );
          })}

          <line x1={activeX} x2={activeX} y1={paddingTop} y2={paddingTop + chartHeight} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />

          {yTicks.map((tick) => (
            <text key={`tick-${tick}`} x={width - 4} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.6)">
              {axisLabelText(series[0].unit, tick)}
            </text>
          ))}

          {xTickIndexes.map((idx, i) => {
            const safeIndex = clamp(idx, 0, points.length - 1);
            const point = points[safeIndex];
            const x = xForIndex(safeIndex);
            const anchor = i === 0 ? "start" : i === xTickIndexes.length - 1 ? "end" : "middle";
            return (
              <text key={`xtick-${i}`} x={x} y={height - 10} textAnchor={anchor} fontSize="11" fill="rgba(255,255,255,0.55)">
                {formatAxisTime(point.ts, range)}
              </text>
            );
          })}

          <g transform={`translate(${clamp(activeX - 90, paddingLeft + 4, width - paddingRight - 186)}, 16)`}>
            <rect x={0} y={0} width={186} height={34 + (series.length + extraTooltipRows.length + (exchangeExtremes?.highest && exchangeExtremes?.lowest ? 2 : 0)) * 18} rx={12} fill="rgba(0,0,0,0.82)" stroke="rgba(255,255,255,0.08)" />
            <text x={12} y={16} fontSize="11" fill="rgba(255,255,255,0.85)">
              {fmtDateTime(activePoint.ts)}
            </text>
            {series.map((entry, entryIndex) => {
              const value = activePoint.values[entry.key];
              return (
                <g key={`tip-${entry.key}`} transform={`translate(12, ${30 + entryIndex * 18})`}>
                  <circle cx={4} cy={-4} r={4} fill={chartColor(entryIndex)} />
                  <text x={14} y={0} fontSize="11" fill="rgba(255,255,255,0.8)">{entry.label}</text>
                  <text x={174} y={0} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.92)">
                    {unitText(entry.unit, typeof value === "number" ? value : null, 3)}
                  </text>
                </g>
              );
            })}
            {extraTooltipRows.map((row, extraIndex) => {
              const y = 30 + (series.length + extraIndex) * 18;
              return (
                <g key={`tip-extra-${row.key}`} transform={`translate(12, ${y})`}>
                  <circle cx={4} cy={-4} r={4} fill={row.color} />
                  <text x={14} y={0} fontSize="11" fill="rgba(255,255,255,0.78)">{row.label}</text>
                  <text x={174} y={0} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.90)">{row.value}</text>
                </g>
              );
            })}
            {exchangeExtremes?.highest && exchangeExtremes?.lowest ? (
              <>
                <g transform={`translate(12, ${30 + (series.length + extraTooltipRows.length) * 18})`}>
                  <text x={0} y={0} fontSize="11" fill="rgba(255,255,255,0.7)">최고 {exchangeExtremes.highest.name}</text>
                  <text x={174} y={0} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.88)">{fmtUsd(exchangeExtremes.highest.price, 4)}</text>
                </g>
                <g transform={`translate(12, ${30 + (series.length + extraTooltipRows.length + 1) * 18})`}>
                  <text x={0} y={0} fontSize="11" fill="rgba(255,255,255,0.7)">최저 {exchangeExtremes.lowest.name}</text>
                  <text x={174} y={0} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.88)">{fmtUsd(exchangeExtremes.lowest.price, 4)}</text>
                </g>
              </>
            ) : null}
          </g>
        </svg>
      </div>

      {range === "90d" && points.length < 90 ? (
        <div className="text-[11px] opacity-55">90d 구간은 누적 데이터가 충분하지 않아 일부 표기가 제한될 수 있습니다.</div>
      ) : null}
      {staleMinutes > 10 ? (
        <div className="text-[11px] opacity-55">차트 데이터 마지막 시점과 최신 상세값 시점 사이에 차이가 있습니다. 최신 상세값은 아래 거래소 가격/계산기에 즉시 반영됩니다.</div>
      ) : null}
    </div>
  );
}


const TRADING_VIEW_SUPPORTED_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "BNB",
  "DOGE",
  "ADA",
  "AVAX",
  "TON",
  "TRX",
]);

function getTradingViewBaseSymbol(symbol: string) {
  const normalized = normalizeSpotSymbol(symbol);
  return TRADING_VIEW_SUPPORTED_SYMBOLS.has(normalized) ? normalized : "BTC";
}

function getTradingViewSymbol(symbol: string, marketType: MarketType) {
  const base = getTradingViewBaseSymbol(symbol);
  if (marketType === "futures-spot") return `BINANCE:${base}USDT.P`;
  return `BINANCE:${base}USDT`;
}

function getTradingViewChartHref(symbol: string, marketType: MarketType) {
  const base = getTradingViewBaseSymbol(symbol);
  const tvSymbol = getTradingViewSymbol(symbol, marketType);

  const query = new URLSearchParams({
    symbol: base,
    tvSymbol,
  });

  return `/charts?${query.toString()}`;
}

function ChartWorkspace({
  marketType,
  item,
  symbol,
  chartData,
  chartLoading,
  chartRefreshing,
  chartRange,
  setChartRange,
}: {
  marketType: MarketType;
  item: AnyIndicator;
  symbol: string;
  chartData: ChartRes | null;
  chartLoading: boolean;
  chartRefreshing: boolean;
  chartRange: RangeKey;
  setChartRange: (value: RangeKey) => void;
}) {
  const allSeries = useMemo(() => prepareSeries(chartData, item, chartRange), [chartData, item, chartRange]);
  const views = useMemo(() => buildViews(marketType, allSeries), [marketType, allSeries]);
  const [activeViewKey, setActiveViewKey] = useState("");

  useEffect(() => {
    if (!views.length) return;
    if (!views.some((view) => view.key === activeViewKey)) {
      setActiveViewKey(views[0].key);
    }
  }, [views, activeViewKey]);

  const activeView = views.find((view) => view.key === activeViewKey) || views[0] || null;
  const activeSeries = useMemo(() => {
    if (!activeView) return [] as ApiChartSeries[];
    return activeView.seriesKeys
      .map((key) => allSeries.find((entry) => entry.key === key))
      .filter((entry): entry is ApiChartSeries => Boolean(entry));
  }, [activeView, allSeries]);

  const extraTooltipSeries = useMemo(() => {
    if (!activeView?.tooltipSeriesKeys?.length) return [] as ApiChartSeries[];
    return activeView.tooltipSeriesKeys
      .map((key) => allSeries.find((entry) => entry.key === key))
      .filter((entry): entry is ApiChartSeries => Boolean(entry));
  }, [activeView, allSeries]);

  const exchangeRows = marketType === "spot"
    ? item.exchanges?.global_spot_usd || []
    : marketType === "futures-spot"
      ? item.exchanges?.global_futures_usd || []
      : undefined;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {views.map((view) => {
            const active = view.key === activeView?.key;
            return (
              <button
                key={view.key}
                type="button"
                onClick={() => setActiveViewKey(view.key)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-[var(--brand)]/40 bg-black/80 text-white"
                    : "border-white/10 bg-black/60 text-white/70 hover:bg-black/80"
                }`}
              >
                {view.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={getTradingViewChartHref(symbol, marketType)}
            className="rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-black/90"
          >
            트레이딩뷰 차트 열기
          </Link>
          <SectionPills
            options={(["1h", "24h", "7d", "30d", "90d"] as RangeKey[]).map((value) => ({ key: value, label: value }))}
            value={chartRange}
            onChange={(value) => setChartRange(value as RangeKey)}
            disabledKeys={["90d"]}
          />
        </div>
      </div>

      <div className="mt-3 text-[11px] opacity-65">
        {activeView?.description || "선택한 차트 흐름을 표시합니다."}
        {chartRefreshing ? <span className="ml-2">· 차트 새로고침 중…</span> : null}
      </div>

      <div className="mt-4">
        {chartLoading && !chartData ? (
          <div className="rounded-xl border border-white/10 bg-black/60 p-6 text-sm opacity-60">
            차트 데이터를 불러오는 중입니다…
          </div>
        ) : activeSeries.length ? (
          <TimeSeriesChart
            title={activeView?.label || "차트"}
            series={activeSeries}
            range={chartRange}
            item={item}
            latestState={chartData?.latestState}
            extraTooltipSeries={extraTooltipSeries}
            exchangeRows={exchangeRows}
          />
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/60 p-6 text-sm opacity-60">
            선택한 차트 데이터가 아직 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function hasSparkPoints(points: number[] | null | undefined): points is number[] {
  return Array.isArray(points) && points.length >= 2;
}

function getSpotRepresentativePriceUsd(item: AnyIndicator, fallbackUsd: number) {
  if (Number.isFinite(Number(item.price_usd))) return n(item.price_usd);
  if (Number.isFinite(Number(item.global_avg_usd))) return n(item.global_avg_usd);
  if (Number.isFinite(Number(item.global_spot_avg_usd))) return n(item.global_spot_avg_usd);
  return fallbackUsd;
}

function getSpotRepresentativePriceKrw(item: AnyIndicator, priceUsd: number, fx: number) {
  if (Number.isFinite(Number(item.price_krw))) return n(item.price_krw);
  if (Number.isFinite(Number(item.price))) return n(item.price);
  return priceUsd > 0 && fx > 0 ? priceUsd * fx : 0;
}

function getSpotMarketCapUsd(item: AnyIndicator, priceUsd: number, fx: number) {
  const live = n(item.market_cap_live);
  const meta = n(item.market_cap_meta);
  const supply = n(item.circulating_supply);

  if (meta > 0 && meta < 10_000_000_000_000) return meta;
  if (live > 0 && fx > 0) return live / fx;
  if (supply > 0 && priceUsd > 0) return supply * priceUsd;
  return 0;
}

function getSpotVolumeUsd(item: AnyIndicator) {
  return n(item.total_volume);
}

function getSpotMarketCapRank(item: AnyIndicator) {
  const rank = n(item.market_cap_rank);
  return rank > 0 ? `#${Math.round(rank).toLocaleString()}` : "-";
}

function getSpotChangeValue(item: AnyIndicator, key: "1h" | "24h" | "7d") {
  if (key === "1h") return Number.isFinite(Number(item.change_1h)) ? n(item.change_1h) : null;
  if (key === "24h") {
    if (Number.isFinite(Number(item.change_24h))) return n(item.change_24h);
    if (Number.isFinite(Number(item.price_change_percentage_24h))) return n(item.price_change_percentage_24h);
    return null;
  }
  return Number.isFinite(Number(item.change_7d)) ? n(item.change_7d) : null;
}

function getSpotSparkPoints(item: AnyIndicator, chartData: ChartRes | null, displayUnit: CurrencyMode, fx: number) {
  const directKrw = item.spark_spot_7d_krw || item.sparkline_krw;
  const directUsd = item.spark_spot_7d_usd || item.sparkline_usd;

  let baseUsdPoints: number[] = [];
  let baseKrwPoints: number[] = [];

  if (hasSparkPoints(directUsd)) {
    baseUsdPoints = directUsd;
  } else if (hasSparkPoints(directKrw) && fx > 0) {
    baseUsdPoints = directKrw.map((value) => value / fx);
  }

  if (hasSparkPoints(directKrw)) {
    baseKrwPoints = directKrw;
  } else if (hasSparkPoints(baseUsdPoints) && fx > 0) {
    baseKrwPoints = baseUsdPoints.map((value) => value * fx);
  }

  if (hasSparkPoints(baseUsdPoints) || hasSparkPoints(baseKrwPoints)) {
    if (displayUnit === "KRW") {
      if (hasSparkPoints(baseUsdPoints) && fx > 0) return baseUsdPoints.map((value) => value * fx);
      return baseKrwPoints;
    }

    if (hasSparkPoints(baseUsdPoints)) return baseUsdPoints;
    if (hasSparkPoints(baseKrwPoints) && fx > 0) return baseKrwPoints.map((value) => value / fx);
    return baseKrwPoints;
  }

  const chartSeries = chartData?.range === "7d"
    ? chartData.series?.find((entry) => entry.key === "global_avg_usd")
    : null;

  const chartPoints = chartSeries?.data
    ?.map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (hasSparkPoints(chartPoints)) {
    return displayUnit === "KRW" && fx > 0 ? chartPoints.map((value) => value * fx) : chartPoints;
  }

  return [] as number[];
}

function MiniSparkline({ points }: { points: number[] }) {
  if (!hasSparkPoints(points)) {
    return <div className="w-full text-center text-xs text-white/35">7D 데이터 부족</div>;
  }

  const width = 220;
  const height = 42;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const first = points[0];
  const last = points[points.length - 1];
  const stroke = last >= first ? "#22c55e" : "#ef4444";

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="flex h-[42px] w-full items-center justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[42px] w-full overflow-visible" preserveAspectRatio="none">
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
      </svg>
    </div>
  );
}

function SpotSnapshotMetric({
  label,
  value,
  sub,
  valueClassName = "text-[var(--brand)]",
  children,
}: {
  label: string;
  value?: string;
  sub?: string;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[86px] flex-col justify-center rounded-xl border border-white/10 bg-black/60 p-3">
      <div className="text-[11px] text-white/55">{label}</div>
      {children ? (
        <div className="mt-2 flex w-full items-center justify-center">{children}</div>
      ) : (
        <div className={`mt-1 truncate text-base font-semibold ${valueClassName}`}>{value || "-"}</div>
      )}
      {sub ? <div className="mt-1 truncate text-[11px] text-white/45">{sub}</div> : null}
    </div>
  );
}

function SpotMarketSnapshot({ item, chartData }: { item: AnyIndicator; chartData: ChartRes | null }) {
  const [displayUnit, setDisplayUnit] = useState<CurrencyMode>("KRW");
  const fx = n(item.rate_krw_usd);
  const spotRows = item.exchanges?.global_spot_usd || [];
  const fallbackUsd = n(item.global_avg_usd) || avg(spotRows.map((row) => row.price));
  const priceUsd = getSpotRepresentativePriceUsd(item, fallbackUsd);
  const priceKrw = getSpotRepresentativePriceKrw(item, priceUsd, fx);
  const marketCapUsd = getSpotMarketCapUsd(item, priceUsd, fx);
  const volumeUsd = getSpotVolumeUsd(item);
  const sparkPoints = getSpotSparkPoints(item, chartData, displayUnit, fx);

  const formatByUnit = (usdValue: number, krwValue?: number) => {
    if (displayUnit === "KRW") {
      const resolvedKrw = Number.isFinite(Number(krwValue)) ? n(krwValue) : fx > 0 ? usdValue * fx : 0;
      return resolvedKrw > 0 ? fmtKrw(resolvedKrw) : "-";
    }
    return usdValue > 0 ? fmtUsd(usdValue, 2) : "-";
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--brand)]">SPOT 핵심 시세 요약</div>
          <div className="mt-1 text-[11px] text-white/55">현재가·시가총액·거래량·변동률·최근 7일 흐름을 한눈에 봅니다.</div>
        </div>
        <CurrencyInlineToggle value={displayUnit} onChange={setDisplayUnit} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SpotSnapshotMetric label="현재가" value={formatByUnit(priceUsd, priceKrw)} />
        <SpotSnapshotMetric label="시가총액" value={formatByUnit(marketCapUsd)} />
        <SpotSnapshotMetric label="24H 거래량" value={formatByUnit(volumeUsd)} />
        <SpotSnapshotMetric label="최근 평균가 7일">
          <MiniSparkline points={sparkPoints} />
        </SpotSnapshotMetric>
        <SpotSnapshotMetric
          label="1H"
          value={getSpotChangeValue(item, "1h") === null ? "-" : fmtSignedPct(getSpotChangeValue(item, "1h"), 3)}
          valueClassName={signedTextClassFromRaw(fmtSignedPct(getSpotChangeValue(item, "1h"), 3))}
        />
        <SpotSnapshotMetric
          label="24H"
          value={getSpotChangeValue(item, "24h") === null ? "-" : fmtSignedPct(getSpotChangeValue(item, "24h"), 3)}
          valueClassName={signedTextClassFromRaw(fmtSignedPct(getSpotChangeValue(item, "24h"), 3))}
        />
        <SpotSnapshotMetric
          label="7D"
          value={getSpotChangeValue(item, "7d") === null ? "-" : fmtSignedPct(getSpotChangeValue(item, "7d"), 3)}
          valueClassName={signedTextClassFromRaw(fmtSignedPct(getSpotChangeValue(item, "7d"), 3))}
        />
        <SpotSnapshotMetric label="시총 순위" value={getSpotMarketCapRank(item)} />
      </div>
    </section>
  );
}


function MobileDetailMetricCard({
  label,
  value,
  sub,
  valueClassName,
  children,
}: {
  label: string;
  value?: string;
  sub?: string;
  valueClassName?: string;
  children?: ReactNode;
}) {
  const inferredClassName =
    valueClassName ||
    (String(value || "").trim().startsWith("+") || String(value || "").trim().startsWith("-")
      ? signedTextClassFromRaw(value)
      : "text-white");

  return (
    <div className="min-h-[72px] rounded-xl border border-white/10 bg-black/60 p-3">
      <div className="text-[11px] text-white/45">{label}</div>
      {children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <div className={`mt-1 truncate text-sm font-semibold ${inferredClassName}`}>{value || "-"}</div>
      )}
      {sub ? <div className="mt-1 truncate text-[11px] text-white/40">{sub}</div> : null}
    </div>
  );
}

function MobileDetailOverviewShell({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--brand)]">{title}</div>
          <div className="mt-1 text-[11px] leading-5 text-white/50">{description}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MobileSpotDetailOverview({
  item,
  chartData,
}: {
  item: AnyIndicator;
  chartData: ChartRes | null;
}) {
  const [displayUnit, setDisplayUnit] = useState<CurrencyMode>("KRW");
  const [changeMode, setChangeMode] = useState<"1h" | "24h" | "7d">("24h");
  const [sizeMode, setSizeMode] = useState<"marketcap" | "volume">("marketcap");

  const fx = n(item.rate_krw_usd);
  const spotRows = item.exchanges?.global_spot_usd || [];
  const fallbackUsd = n(item.global_avg_usd) || avg(spotRows.map((row) => row.price));
  const priceUsd = getSpotRepresentativePriceUsd(item, fallbackUsd);
  const priceKrw = getSpotRepresentativePriceKrw(item, priceUsd, fx);
  const marketCapUsd = getSpotMarketCapUsd(item, priceUsd, fx);
  const volumeUsd = getSpotVolumeUsd(item);
  const sparkPoints = getSpotSparkPoints(item, chartData, displayUnit, fx);

  const avgUsd = n(item.global_avg_usd) || avg(spotRows.map((row) => row.price));
  let maxDeviationUsd = 0;
  let maxDeviationName = "-";

  for (const row of spotRows) {
    const diff = Math.abs(n(row.price) - avgUsd);
    if (diff > maxDeviationUsd) {
      maxDeviationUsd = diff;
      maxDeviationName = getExchangeMeta(row.name).label;
    }
  }

  const formatByUnit = (usdValue: number, krwValue?: number) => {
    if (displayUnit === "KRW") {
      const resolvedKrw = Number.isFinite(Number(krwValue)) ? n(krwValue) : fx > 0 ? usdValue * fx : 0;
      return resolvedKrw > 0 ? fmtKrw(resolvedKrw) : "-";
    }
    return usdValue > 0 ? fmtUsd(usdValue, 2) : "-";
  };

  const selectedChange = getSpotChangeValue(item, changeMode);
  const selectedSizeUsd = sizeMode === "volume" ? volumeUsd : marketCapUsd;
  const selectedSizeLabel = sizeMode === "volume" ? "24H 거래량" : "시가총액";
  const deviationText =
    displayUnit === "KRW" && fx > 0 ? fmtKrw(maxDeviationUsd * fx) : fmtUsd(maxDeviationUsd, 4);

  return (
    <MobileDetailOverviewShell
      title="모바일 핵심 지표"
      description="메인 목록에서는 가격과 7일 흐름만 보고, 상세에서 등락률·시총·거래량·분산·변동성·최대 이탈을 확인합니다."
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-2">
        <span className="text-[11px] text-white/50">가격</span>
        <CurrencyInlineToggle value={displayUnit} onChange={setDisplayUnit} />

        <span className="ml-1 text-[11px] text-white/50">변동</span>
        <MobileSegmentedToggle
          value={changeMode}
          options={[
            { value: "1h", label: "1H" },
            { value: "24h", label: "24H" },
            { value: "7d", label: "7D" },
          ]}
          onChange={setChangeMode}
        />

        <span className="ml-1 text-[11px] text-white/50">규모</span>
        <MobileSegmentedToggle
          value={sizeMode}
          options={[
            { value: "marketcap", label: "시총" },
            { value: "volume", label: "거래량" },
          ]}
          onChange={setSizeMode}
        />
      </div>

      <div className="mt-3 rounded-xl border border-[color:rgba(0,229,255,0.22)] bg-black/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-white/45">현재가</div>
            <div className="mt-1 truncate text-xl font-semibold text-[var(--brand)]">
              {formatByUnit(priceUsd, priceKrw)}
            </div>
            <div className="mt-1 text-[11px] text-white/40">
              {getSpotMarketCapRank(item)} · 거래소 {spotRows.length}개 기준
            </div>
          </div>

          <div className="w-[116px] shrink-0">
            <MiniSparkline points={sparkPoints} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MobileDetailMetricCard label={selectedSizeLabel} value={formatByUnit(selectedSizeUsd)} />
        <MobileDetailMetricCard
          label={changeMode.toUpperCase()}
          value={selectedChange === null ? "-" : fmtSignedPct(selectedChange, 3)}
          valueClassName={signedTextClassFromRaw(fmtSignedPct(selectedChange, 3))}
        />
        <MobileDetailMetricCard
          label="분산"
          value={fmtPct(item.global_spread_pct, 3)}
          sub={displayUnit === "KRW" && fx > 0 ? fmtKrw(n(item.global_spread_usd) * fx) : fmtUsd(item.global_spread_usd, 4)}
          valueClassName="text-[var(--brand)]"
        />
        <MobileDetailMetricCard
          label="변동성"
          value={fmtPct(item.volatility_ratio, 3)}
          sub={item.volatility_warn ? "주의" : "안정"}
          valueClassName={item.volatility_warn ? "text-[#ef4444]" : "text-[#22c55e]"}
        />
        <MobileDetailMetricCard
          label="최대 이탈"
          value={deviationText}
          sub={maxDeviationName}
          valueClassName="text-[var(--brand)]"
        />
        <MobileDetailMetricCard
          label="시총 순위"
          value={getSpotMarketCapRank(item)}
          sub="CoinGecko 기준"
          valueClassName="text-[var(--brand)]"
        />
      </div>
    </MobileDetailOverviewShell>
  );
}

function MobileDomesticGlobalOverview({ item }: { item: AnyIndicator }) {
  const domesticRows = item.exchanges?.domestic_krw || [];
  const globalRows = item.exchanges?.global_spot_usd || [];
  const premium = n(item.premium_pct);
  const sideText = premium > 0 ? "국내 우위" : premium < 0 ? "해외 우위" : "중립";
  const globalGapKrw = n(item.domestic_avg_krw) - n(item.global_spot_avg_krw);

  return (
    <MobileDetailOverviewShell
      title="모바일 핵심 지표"
      description="국내/해외 가격 차이와 거래소 분산을 먼저 확인합니다."
    >
      <div className="grid grid-cols-2 gap-2">
        <MobileDetailMetricCard
          label="괴리율"
          value={fmtSignedPct(item.premium_pct, 3)}
          sub={sideText}
          valueClassName={signedTextClassFromRaw(fmtSignedPct(item.premium_pct, 3))}
        />
        <MobileDetailMetricCard
          label="실제 원화 차이"
          value={fmtSignedKrw(globalGapKrw)}
          sub="국내-해외 환산"
        />
        <MobileDetailMetricCard label="국내 평균가" value={fmtKrw(item.domestic_avg_krw)} sub={`${domesticRows.length}개 거래소`} />
        <MobileDetailMetricCard label="해외 환산 평균가" value={fmtKrw(item.global_spot_avg_krw)} sub={`환율 ${fmtKrw(item.rate_krw_usd)}`} />
        <MobileDetailMetricCard label="국내 내부 분산" value={fmtKrw(item.domestic_spread_krw)} sub={`${domesticRows.length}개 거래소`} valueClassName="text-[var(--brand)]" />
        <MobileDetailMetricCard label="해외 거래소 수" value={`${globalRows.length}개`} sub="현물 기준" valueClassName="text-[var(--brand)]" />
      </div>
    </MobileDetailOverviewShell>
  );
}

function MobileFuturesSpotOverview({ item }: { item: AnyIndicator }) {
  const spotRows = item.exchanges?.global_spot_usd || [];
  const futuresRows = item.exchanges?.global_futures_usd || [];
  const spotAvg = n(item.global_spot_avg_usd);
  const futuresAvg = n(item.global_futures_avg_usd);
  const priceGap = futuresAvg - spotAvg;
  const basis = n(item.basis_pct);
  const sideText = basis >= 0 ? "선물 프리미엄" : "선물 할인";

  return (
    <MobileDetailOverviewShell
      title="모바일 핵심 지표"
      description="선물과 현물의 가격 차이, 베이시스, 지연 상태를 먼저 확인합니다."
    >
      <div className="grid grid-cols-2 gap-2">
        <MobileDetailMetricCard
          label="베이시스"
          value={fmtSignedPct(item.basis_pct, 3)}
          sub={sideText}
          valueClassName={signedTextClassFromRaw(fmtSignedPct(item.basis_pct, 3))}
        />
        <MobileDetailMetricCard label="실제 달러 가격차" value={fmtSignedUsd(priceGap, 6)} sub="선물-현물" />
        <MobileDetailMetricCard label="현물 평균가" value={fmtUsd(item.global_spot_avg_usd, 6)} sub={`${spotRows.length}개 거래소`} />
        <MobileDetailMetricCard label="선물 평균가" value={fmtUsd(item.global_futures_avg_usd, 6)} sub={`${futuresRows.length}개 거래소`} />
        <MobileDetailMetricCard label="동조/지연" value={fmtPct(item.delay_proxy, 3)} sub="현물·선물 반응 차이" valueClassName="text-[var(--brand)]" />
        <MobileDetailMetricCard label="거래소 수" value={`${spotRows.length}/${futuresRows.length}개`} sub="현물/선물" valueClassName="text-[var(--brand)]" />
      </div>
    </MobileDetailOverviewShell>
  );
}

function SpotDetail({
  item,
  chartData,
  chartLoading,
  chartRefreshing,
  chartRange,
  setChartRange,
}: {
  item: AnyIndicator;
  chartData: ChartRes | null;
  chartLoading: boolean;
  chartRefreshing: boolean;
  chartRange: RangeKey;
  setChartRange: (value: RangeKey) => void;
}) {
  const spotRows = item.exchanges?.global_spot_usd || [];
  const spreadUsd = n(item.global_spread_usd);
  const avgUsd = n(item.global_avg_usd) || avg(spotRows.map((row) => row.price));
  const maxGapPct = avgUsd > 0 ? (spreadUsd / avgUsd) * 100 : 0;
  const extremes = getExtremes(spotRows);

  return (
    <>
      <div className="grid gap-3 xl:hidden">
        <MobileSpotDetailOverview item={item} chartData={chartData} />

        <ChartWorkspace
          marketType="spot"
          item={item}
          symbol={symLabel(item.symbol)}
          chartData={chartData}
          chartLoading={chartLoading}
          chartRefreshing={chartRefreshing}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />

        <ExchangeList title="글로벌 현물 거래소 가격" rows={spotRows} unit="USD" rate={item.rate_krw_usd} />

        <SpotPlanCalculator item={item} />
      </div>

      <div className="hidden gap-4 xl:grid">
        <SpotMarketSnapshot item={item} chartData={chartData} />

        <ChartWorkspace
          marketType="spot"
          item={item}
          symbol={symLabel(item.symbol)}
          chartData={chartData}
          chartLoading={chartLoading}
          chartRefreshing={chartRefreshing}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />

        <SummaryStrip
          items={[
            { label: "현재 상태", value: item.state || "-", sub: stateSummaryText("spot", item) },
            { label: "글로벌 평균가", value: fmtUsd(item.global_avg_usd, 6), sub: `거래소 ${spotRows.length}개 기준` },
            { label: "거래소 벌어짐", value: fmtPct(item.global_spread_pct, 3), sub: fmtUsd(item.global_spread_usd, 6) },
            { label: "최고-최저 차이", value: fmtUsd(extremes.spread, 6), sub: `${getExchangeMeta(extremes.highest?.name || "").label || "-"} ↔ ${getExchangeMeta(extremes.lowest?.name || "").label || "-"} · ${fmtPct(maxGapPct, 3)}` },
            { label: "단기 흔들림", value: fmtPct(item.volatility_ratio, 3), sub: item.volatility_warn ? "주의 플래그 ON" : "주의 플래그 OFF" },
            { label: "경고 상태", value: item.volatility_warn ? "주의" : "양호", sub: `거래소 ${spotRows.length}개 기준` },
          ]}
        />

        <ExchangeList title="글로벌 현물 거래소 가격" rows={spotRows} unit="USD" rate={item.rate_krw_usd} />

        <SpotPlanCalculator item={item} />
      </div>
    </>
  );
}

function DomesticGlobalDetail({
  item,
  chartData,
  chartLoading,
  chartRefreshing,
  chartRange,
  setChartRange,
}: {
  item: AnyIndicator;
  chartData: ChartRes | null;
  chartLoading: boolean;
  chartRefreshing: boolean;
  chartRange: RangeKey;
  setChartRange: (value: RangeKey) => void;
}) {
  const domesticRows = item.exchanges?.domestic_krw || [];
  const globalRows = item.exchanges?.global_spot_usd || [];
  const premium = n(item.premium_pct);
  const sideText = premium > 0 ? "국내가 더 높은 편" : premium < 0 ? "해외가 더 높은 편" : "중립";
  const globalGapKrw = n(item.domestic_avg_krw) - n(item.global_spot_avg_krw);
  const preparedSeries = useMemo(() => prepareSeries(chartData, item, chartRange), [chartData, item, chartRange]);
  const premiumSeries = preparedSeries.find((entry) => entry.key === "premium_pct");
  const premiumPosition = useMemo(
    () => positionVsAverageText(getLastNumericValue(premiumSeries), averageOfSeries(premiumSeries), "percent"),
    [premiumSeries],
  );

  return (
    <>
      <div className="grid gap-3 xl:hidden">
        <MobileDomesticGlobalOverview item={item} />

        <ChartWorkspace
          marketType="domestic-global"
          item={item}
          symbol={symLabel(item.symbol)}
          chartData={chartData}
          chartLoading={chartLoading}
          chartRefreshing={chartRefreshing}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />

        <div className="grid gap-3">
          <ExchangeList title="국내 거래소 가격" rows={domesticRows} unit="KRW" rate={item.rate_krw_usd} />
          <ExchangeList title="해외 현물 거래소 가격" rows={globalRows} unit="USD" rate={item.rate_krw_usd} />
        </div>

        <DomesticArbCalculator item={item} />
      </div>

      <div className="hidden gap-4 xl:grid">
        <ChartWorkspace
          marketType="domestic-global"
          item={item}
          symbol={symLabel(item.symbol)}
          chartData={chartData}
          chartLoading={chartLoading}
          chartRefreshing={chartRefreshing}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />

        <SummaryStrip
          items={[
            { label: "현재 상태", value: item.state || "-", sub: stateSummaryText("domestic-global", item) },
            { label: "괴리율", value: fmtSignedPct(item.premium_pct, 3), sub: sideText },
            { label: "실제 원화 차이", value: fmtSignedKrw(globalGapKrw), sub: "국내 평균가 - 해외 환산 평균가" },
            { label: "국내 평균가", value: fmtKrw(item.domestic_avg_krw), sub: `국내 거래소 ${domesticRows.length}개` },
            { label: "해외 환산 평균가", value: fmtKrw(item.global_spot_avg_krw), sub: `환율 ${fmtKrw(item.rate_krw_usd)}` },
            { label: "괴리율 vs 24h 평균", value: premiumPosition.value, sub: premiumPosition.sub },
            { label: "국내 내부 분산", value: fmtKrw(item.domestic_spread_krw), sub: `국내 거래소 ${domesticRows.length}개` },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ExchangeList title="국내 거래소 가격" rows={domesticRows} unit="KRW" rate={item.rate_krw_usd} />
          <ExchangeList title="해외 현물 거래소 가격" rows={globalRows} unit="USD" rate={item.rate_krw_usd} />
        </div>

        <DomesticArbCalculator item={item} />
      </div>
    </>
  );
}

function FuturesSpotDetail({
  item,
  chartData,
  chartLoading,
  chartRefreshing,
  chartRange,
  setChartRange,
}: {
  item: AnyIndicator;
  chartData: ChartRes | null;
  chartLoading: boolean;
  chartRefreshing: boolean;
  chartRange: RangeKey;
  setChartRange: (value: RangeKey) => void;
}) {
  const spotRows = item.exchanges?.global_spot_usd || [];
  const futuresRows = item.exchanges?.global_futures_usd || [];
  const basis = n(item.basis_pct);
  const spotAvg = n(item.global_spot_avg_usd);
  const futuresAvg = n(item.global_futures_avg_usd);
  const priceGap = futuresAvg - spotAvg;
  const sideText = basis >= 0 ? "선물 프리미엄" : "선물 할인";
  const preparedSeries = useMemo(() => prepareSeries(chartData, item, chartRange), [chartData, item, chartRange]);
  const basisSeries = preparedSeries.find((entry) => entry.key === "basis_pct");
  const basisPosition = useMemo(
    () => positionVsAverageText(getLastNumericValue(basisSeries), averageOfSeries(basisSeries), "percent"),
    [basisSeries],
  );

  return (
    <>
      <div className="grid gap-3 xl:hidden">
        <MobileFuturesSpotOverview item={item} />

        <ChartWorkspace
          marketType="futures-spot"
          item={item}
          symbol={symLabel(item.symbol)}
          chartData={chartData}
          chartLoading={chartLoading}
          chartRefreshing={chartRefreshing}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />

        <div className="grid gap-3">
          <ExchangeList title="글로벌 현물 거래소 가격" rows={spotRows} unit="USD" rate={item.rate_krw_usd} />
          <ExchangeList title="글로벌 선물 거래소 가격" rows={futuresRows} unit="USD" rate={item.rate_krw_usd} />
        </div>

        <FuturesBasisCalculator item={item} />
      </div>

      <div className="hidden gap-4 xl:grid">
        <ChartWorkspace
          marketType="futures-spot"
          item={item}
          symbol={symLabel(item.symbol)}
          chartData={chartData}
          chartLoading={chartLoading}
          chartRefreshing={chartRefreshing}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />

        <SummaryStrip
          items={[
            { label: "현재 상태", value: item.state || "-", sub: stateSummaryText("futures-spot", item) },
            { label: "베이시스", value: fmtSignedPct(item.basis_pct, 3), sub: sideText },
            { label: "실제 달러 가격차", value: fmtSignedUsd(priceGap, 6), sub: "선물 평균가 - 현물 평균가" },
            { label: "현물 평균가", value: fmtUsd(item.global_spot_avg_usd, 6), sub: `현물 ${spotRows.length}개` },
            { label: "선물 평균가", value: fmtUsd(item.global_futures_avg_usd, 6), sub: `선물 ${futuresRows.length}개` },
            { label: "베이시스 vs 24h 평균", value: basisPosition.value, sub: basisPosition.sub },
            { label: "동조/지연", value: fmtPct(item.delay_proxy, 3), sub: `현물 ${spotRows.length}개 / 선물 ${futuresRows.length}개` },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ExchangeList title="글로벌 현물 거래소 가격" rows={spotRows} unit="USD" rate={item.rate_krw_usd} />
          <ExchangeList title="글로벌 선물 거래소 가격" rows={futuresRows} unit="USD" rate={item.rate_krw_usd} />
        </div>

        <FuturesBasisCalculator item={item} />
      </div>
    </>
  );
}

export default function TypedPersonalMarketDetailClient({
  type,
  symbol,
}: {
  type: string;
  symbol: string;
}) {
  const marketType = normalizeType(type);
  const sym = useMemo(() => String(symbol || "").toUpperCase().trim(), [symbol]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DetailRes | null>(null);
  const [spotSupplement, setSpotSupplement] = useState<AnyIndicator | null>(null);
  const hasLoadedRef = useRef(false);

  const [chartLoading, setChartLoading] = useState(true);
  const [chartRefreshing, setChartRefreshing] = useState(false);
  const [chartData, setChartData] = useState<ChartRes | null>(null);
  const chartLoadedRef = useRef(false);
  const [chartRange, setChartRange] = useState<RangeKey>("24h");

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${marketType}:${sym}`;

    async function load(opts?: { silent?: boolean }) {
      const silent = !!opts?.silent;
      const seed = readDetailSeed(marketType, sym);

      if (seed && !hasLoadedRef.current) {
        detailCache.set(cacheKey, { ts: Date.now(), data: seed });
        setData(seed);
        hasLoadedRef.current = true;
        setLoading(false);
      }

      const cached = detailCache.get(cacheKey);
      const fresh = cached && Date.now() - cached.ts < detailCacheTtl();

      if (cached && !hasLoadedRef.current) {
        setData(cached.data);
        hasLoadedRef.current = true;
        setLoading(false);
      }

      if (fresh) {
        if (!cancelled) {
          setRefreshing(false);
          setLoading(false);
        }
        return;
      }

      if (!hasLoadedRef.current) setLoading(true);
      else if (silent) setRefreshing(true);

      try {
        const detailUrl = pmApi(`/detail?type=${encodeURIComponent(marketType)}&symbol=${encodeURIComponent(sym)}`);
        const res = await fetch(detailUrl);
        const j = (await res.json()) as DetailRes;
        detailCache.set(cacheKey, { ts: Date.now(), data: j });
        if (!cancelled) {
          setData(j);
          hasLoadedRef.current = true;
        }
      } catch {
        if (!cancelled && !hasLoadedRef.current) {
          setData({ ok: false, error: { code: "fetch_failed", message: "detail fetch failed" } });
          hasLoadedRef.current = true;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    hasLoadedRef.current = false;
    load({ silent: false });
    const timer = window.setInterval(() => load({ silent: true }), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [marketType, sym]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `spot-supplement:${sym}`;

    async function loadSpotSupplement() {
      if (marketType !== "spot") {
        if (!cancelled) setSpotSupplement(null);
        return;
      }

      const cached = spotSupplementCache.get(cacheKey);
      const fresh = cached && Date.now() - cached.ts < 30_000;

      if (cached) {
        setSpotSupplement(cached.data);
        if (fresh) return;
      }

      try {
        const marketUrl = pmApi(`/markets?currency=krw&limit=30&offset=0&only_live=0&q=${encodeURIComponent(sym)}&include_change_7d=1`);
        const indicatorUrl = pmApi(`/indicators?type=spot`);

        const [marketResult, indicatorResult] = await Promise.allSettled([
          fetch(marketUrl).then((res) => res.json()),
          fetch(indicatorUrl).then((res) => res.json()),
        ]);

        const marketItem =
          marketResult.status === "fulfilled"
            ? findSpotSupplementFromResponse(marketResult.value as SpotSupplementRes, sym)
            : null;
        const indicatorItem =
          indicatorResult.status === "fulfilled"
            ? findSpotSupplementFromResponse(indicatorResult.value as SpotSupplementRes, sym)
            : null;

        const merged = marketItem && indicatorItem
          ? mergeSpotSupplement(indicatorItem, marketItem)
          : marketItem || indicatorItem || null;

        spotSupplementCache.set(cacheKey, { ts: Date.now(), data: merged });

        if (!cancelled) {
          setSpotSupplement(merged);
        }
      } catch {
        if (!cancelled) {
          setSpotSupplement(cached?.data || null);
        }
      }
    }

    loadSpotSupplement();
    const timer = window.setInterval(loadSpotSupplement, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [marketType, sym]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${marketType}:${sym}:${chartRange}`;

    async function loadChart(opts?: { silent?: boolean }) {
      const silent = !!opts?.silent;
      const cached = chartCache.get(cacheKey);
      const ttl = chartCacheTtl(chartRange);
      const fresh = cached && ttl > 0 && Date.now() - cached.ts < ttl;

      if (cached && !chartLoadedRef.current) {
        setChartData(cached.data);
        chartLoadedRef.current = true;
        setChartLoading(false);
      }

      if (fresh) {
        if (!cancelled) {
          setChartRefreshing(false);
          setChartLoading(false);
        }
        return;
      }

      if (!chartLoadedRef.current) setChartLoading(true);
      else if (silent) setChartRefreshing(true);

      try {
        const chartUrl = pmApi(`/chart?type=${encodeURIComponent(marketType)}&symbol=${encodeURIComponent(sym)}&range=${encodeURIComponent(chartRange)}`);
        const res = await fetch(chartUrl);
        const j = (await res.json()) as ChartRes;
        chartCache.set(cacheKey, { ts: Date.now(), data: j });
        if (!cancelled) {
          setChartData(j);
          chartLoadedRef.current = true;
        }
      } catch {
        if (!cancelled && !chartLoadedRef.current) {
          setChartData({ ok: false, error: "chart fetch failed" });
          chartLoadedRef.current = true;
        }
      } finally {
        if (!cancelled) {
          setChartLoading(false);
          setChartRefreshing(false);
        }
      }
    }

    chartLoadedRef.current = false;
    loadChart({ silent: false });
    const timer = window.setInterval(() => loadChart({ silent: true }), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [marketType, sym, chartRange]);

  const item = useMemo(() => resolveDetailItem(data), [data]);
  const effectiveItem = useMemo(() => {
    if (!item) return null;
    return marketType === "spot" ? mergeSpotSupplement(item, spotSupplement) : item;
  }, [item, marketType, spotSupplement]);

  useEffect(() => {
    if (!sym) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;

      const ranges: RangeKey[] = ["1h", "7d", "30d"];
      for (const range of ranges) {
        if (range !== chartRange) {
          void prefetchChartData(marketType, sym, range);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [marketType, sym, chartRange]);

  useEffect(() => {
    if (marketType !== "spot" || !sym) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;

      void prefetchDetailData("domestic-global", sym);
      void prefetchDetailData("futures-spot", sym);
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [marketType, sym]);

  const aiContext = useMemo(() => {
    const item = effectiveItem;
    if (!item) return null;
    return {
      type: "personal-market-detail",
      market_type: marketType,
      market_type_label: typeLabel(marketType),
      symbol: sym,
      canonical_symbol: item.canonical_symbol || null,
      description: heroDescription(marketType),
      summary_mode: "rules-based-state-summary",
      summary_text: stateSummaryText(marketType, item),
      score: n(item.score),
      state: item.state || null,
      ts: item.ts || null,
      source: item.source || data?.history?.source || null,
      rate_krw_usd: item.rate_krw_usd ?? null,
      domestic_avg_krw: item.domestic_avg_krw ?? null,
      global_avg_usd: item.global_avg_usd ?? null,
      global_spot_avg_usd: item.global_spot_avg_usd ?? null,
      global_spot_avg_krw: item.global_spot_avg_krw ?? null,
      global_futures_avg_usd: item.global_futures_avg_usd ?? null,
      premium_pct: item.premium_pct ?? null,
      domestic_spread_krw: item.domestic_spread_krw ?? null,
      global_spread_usd: item.global_spread_usd ?? null,
      global_spread_pct: item.global_spread_pct ?? null,
      basis_pct: item.basis_pct ?? null,
      delay_proxy: item.delay_proxy ?? null,
      volatility_ratio: item.volatility_ratio ?? null,
      volatility_warn: item.volatility_warn ?? null,
      domestic_exchange_count: item.domestic_exchange_count ?? null,
      global_spot_exchange_count: item.global_spot_exchange_count ?? null,
      global_perp_exchange_count: item.global_perp_exchange_count ?? null,
      exchanges: item.exchanges || null,
    };
  }, [data?.history?.source, effectiveItem, marketType, sym]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/personal-markets/${marketType}`} className="text-sm opacity-75 hover:opacity-100">
          ← {typeLabel(marketType)} 리스트로 돌아가기
        </Link>
        <TypeTabs type={marketType} symbol={sym} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold text-[var(--brand)]">{sym} · {typeLabel(marketType)} 실전 상세</div>
            <div className="mt-2 text-white/75">{heroDescription(marketType)}</div>
          </div>
          <div className="flex items-center gap-2">
            {effectiveItem?.state ? (
              <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs uppercase tracking-wide">
                {effectiveItem.state}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {loading && !effectiveItem ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm opacity-65">로딩 중…</div>
      ) : !effectiveItem ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm opacity-65">
          지표 데이터를 찾지 못했습니다.<br />
          예: SPOT에는 있지만 국내/해외나 선물/현물 조건을 만족하지 않는 코인일 수 있습니다.
        </div>
      ) : (
        <>
          {marketType === "domestic-global" ? (
            <DomesticGlobalDetail
              item={effectiveItem}
              chartData={chartData}
              chartLoading={chartLoading}
              chartRefreshing={chartRefreshing}
              chartRange={chartRange}
              setChartRange={setChartRange}
            />
          ) : marketType === "futures-spot" ? (
            <FuturesSpotDetail
              item={effectiveItem}
              chartData={chartData}
              chartLoading={chartLoading}
              chartRefreshing={chartRefreshing}
              chartRange={chartRange}
              setChartRange={setChartRange}
            />
          ) : (
            <SpotDetail
              item={effectiveItem}
              chartData={chartData}
              chartLoading={chartLoading}
              chartRefreshing={chartRefreshing}
              chartRange={chartRange}
              setChartRange={setChartRange}
            />
          )}

          {aiContext ? (
            <AiBox
              context={aiContext}
              title={aiTitle(marketType)}
              buttonLabel="AI로 분석하기"
              placeholder={aiPlaceholder(marketType)}
              helperText={aiHelperText(marketType)}
              defaultPrompt={aiDefaultPrompt(marketType)}
              showDebug={false}
            />
          ) : null}

          <CoinGeckoAttribution />
        </>
      )}
    </div>
  );
}