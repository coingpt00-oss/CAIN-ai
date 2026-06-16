//src/app/personal-markets/TypedPersonalMarketsClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { pmApi } from "@/lib/personalMarketsApi";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";
import PremiumBanner from "@/components/PremiumBanner";

type MarketType = "spot" | "domestic-global" | "futures-spot";
type CurrencyMode = "KRW" | "USD";
type PremiumDisplayMode = "pct" | "gap";
type BasisDisplayMode = "pct" | "gap";
type SpotChangeMode = "1h" | "24h" | "7d";
type SpotSizeMode = "marketcap" | "volume";

type ExRow = {
  name: string;
  price: number;
};

type BaseIndicator = {
  symbol: string;
  canonical_symbol?: string | null;
  type?: MarketType;
  score?: number;
  state?: string;
  ts?: string;
  source?: string;

  market_cap_rank?: number | null;
  rank_name?: string | null;
  rank_cg_id?: string | null;
  icon_url?: string | null;
  is_ranked?: boolean;
  sort_priority?: number;

  spark_spot_7d_usd?: number[] | null;
  spark_spot_7d_krw?: number[] | null;
  spark_kimchi_3d?: number[] | null;
  spark_basis_3d?: number[] | null;

  sparkline_krw?: number[] | null;
  sparkline_usd?: number[] | null;
  sparkline_gap?: number[] | null;
  sparkline_basis?: number[] | null;
  sparkline_label?: string | null;
};

type SpotIndicator = BaseIndicator & {
  global_avg_usd?: number | null;
  global_spread_usd?: number | null;
  global_spread_pct?: number | null;
  volatility_ratio?: number | null;
  volatility_warn?: boolean;
  global_spot_exchange_count?: number | null;
  rate_krw_usd?: number | null;
  exchanges?: {
    global_spot_usd?: ExRow[];
  };
  price?: number | null;
  price_usd?: number | null;
  price_krw?: number | null;
  market_cap_live?: number | null;
  total_volume?: number | null;
  change_1h?: number | null;
  change_24h?: number | null;
  change_7d?: number | null;
  price_change_percentage_24h?: number | null;
  price_source_exchange?: string | null;
  price_source_type?: string | null;
  has_live_price?: boolean;
  circulating_supply?: number | null;
};

type MarketsV2ItemRes = {
  cg_id?: string | null;
  symbol?: string | null;
  symbol_upper?: string | null;
  canonical_symbol?: string | null;
  name?: string | null;
  image?: string | null;
  market_cap_rank?: number | null;
  price?: number | null;
  price_usd?: number | null;
  price_krw?: number | null;
  market_cap_live?: number | null;
  total_volume?: number | null;
  change_1h?: number | null;
  change_24h?: number | null;
  change_7d?: number | null;
  price_change_percentage_24h?: number | null;
  fx_usdkrw?: number | null;
  has_live_price?: boolean;
  price_source_exchange?: string | null;
  price_source_type?: string | null;
  circulating_supply?: number | null;
};

type MarketsV2Res = {
  ok: boolean;
  ts?: string;
  total?: number;
  items?: MarketsV2ItemRes[];
};

type DomesticGlobalIndicator = BaseIndicator & {
  rate_krw_usd?: number | null;
  domestic_avg_krw?: number | null;
  global_spot_avg_usd?: number | null;
  global_spot_avg_krw?: number | null;
  premium_pct?: number | null;
  side?: "DOMESTIC_HIGHER" | "GLOBAL_HIGHER";
  domestic_spread_krw?: number | null;
  dispersion_krw_domestic_spread?: number | null;
  global_spread_krw?: number | null;
  dispersion_krw_global_spread?: number | null;
  domestic_exchange_count?: number | null;
  global_spot_exchange_count?: number | null;
  dominance?: string | null;
};

type FuturesSpotIndicator = BaseIndicator & {
  rate_krw_usd?: number | null;
  global_spot_avg_usd?: number | null;
  global_futures_avg_usd?: number | null;
  basis_pct?: number | null;
  futures_basis_pct?: number | null;
  side?: "FUTURES_PREMIUM" | "FUTURES_DISCOUNT";
  delay_proxy?: number | null;
  global_spot_exchange_count?: number | null;
  global_perp_exchange_count?: number | null;
};

type AnyIndicator = SpotIndicator | DomesticGlobalIndicator | FuturesSpotIndicator;

type ApiRes = {
  ok: boolean;
  type?: MarketType;
  ts?: string;
  payload?: {
    type?: MarketType;
    ts?: string;
    base_ts?: string;
    indicators?: Record<string, AnyIndicator>;
    items?: AnyIndicator[];
  };
};

type FavoritesApiRes = {
  ok: boolean;
  favorites?: string[];
  rows?: Array<{ coin_id?: string | null }>;
  favorite?: string;
  action?: "added" | "removed";
  error?: string;
};

type SortKey =
  | "rank"
  | "favorite"
  | "symbol"
  | "avg"
  | "price"
  | "change1h"
  | "change24h"
  | "change7d"
  | "marketcap"
  | "volume"
  | "premium"
  | "spread"
  | "volatility"
  | "basis"
  | "delay"
  | "gap"
  | "deviation";

type InfoKey =
  | "avg"
  | "price"
  | "change1h"
  | "change24h"
  | "change7d"
  | "marketcap"
  | "volume"
  | "domesticAvg"
  | "globalAvg"
  | "spread"
  | "globalSpread"
  | "volatility"
  | "premium"
  | "dominance"
  | "basis"
  | "delay"
  | "sparkline"
  | "gap"
  | "deviation";

const COLOR_BRAND_TEXT = "text-[var(--brand)]";
const COLOR_POS_TEXT = "text-[#22c55e]";
const COLOR_NEG_TEXT = "text-[#ef4444]";
const COLOR_ZERO_TEXT = "text-white";
const COLOR_WHITE_TEXT = "text-white";
const COLOR_YELLOW_TEXT = "text-[#facc15]";
const COLOR_NEUTRAL_SUBTEXT = "text-white/55";

const COLOR_BRAND_STROKE = "var(--brand)";
const COLOR_POS_STROKE = "#22c55e";
const COLOR_NEG_STROKE = "#ef4444";
const COLOR_ZERO_STROKE = "#ffffff";

function n(v: any, d = 0) {
  if (v === null || v === undefined || v === "") return d;
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function hasNum(v: any) {
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
}

function hasSparkline(v: any): v is number[] {
  return Array.isArray(v) && v.length >= 2;
}

function fmtUsd(v: any, digits = 2) {
  if (!hasNum(v)) return "-";
  const x = Number(v);
  return `$${x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })}`;
}

function fmtKrw(v: any) {
  if (!hasNum(v)) return "-";
  const x = Number(v);
  return `₩${Math.round(x).toLocaleString()}`;
}

function fmtPct(v: any, digits = 3) {
  if (!hasNum(v)) return "-";
  const x = Number(v);
  return `${x.toFixed(digits)}%`;
}

function getSignedTextClass(v: any) {
  if (!hasNum(v)) return COLOR_WHITE_TEXT;
  const x = Number(v);
  if (x > 0) return COLOR_POS_TEXT;
  if (x < 0) return COLOR_NEG_TEXT;
  return COLOR_ZERO_TEXT;
}

function getSparklineStrokeByPoints(points: number[] | null | undefined) {
  if (!hasSparkline(points)) return COLOR_BRAND_STROKE;
  const first = Number(points[0] ?? 0);
  const last = Number(points[points.length - 1] ?? 0);
  if (last > first) return COLOR_POS_STROKE;
  if (last < first) return COLOR_NEG_STROKE;
  return COLOR_ZERO_STROKE;
}

function getSpotSpreadTextClass() {
  return COLOR_POS_TEXT;
}

function getVolatilityTextClass() {
  return COLOR_WHITE_TEXT;
}

function getVolatilityStatusText(item: SpotIndicator) {
  return item.volatility_warn ? "주의" : "안정";
}

function getVolatilityStatusTextClass(item: SpotIndicator) {
  return item.volatility_warn ? COLOR_NEG_TEXT : COLOR_POS_TEXT;
}

function getDomesticDominanceText(item: DomesticGlobalIndicator) {
  const raw = String(item.dominance || "").toUpperCase();
  if (raw === "KR") return "국내";
  if (raw === "GLOBAL") return "해외";

  const p = n(item.premium_pct);
  if (p > 0) return "국내";
  if (p < 0) return "해외";
  return "중립";
}

function getDominanceTextClass(item: DomesticGlobalIndicator) {
  const text = getDomesticDominanceText(item);
  if (text === "국내") return COLOR_POS_TEXT;
  if (text === "해외") return COLOR_NEG_TEXT;
  return COLOR_ZERO_TEXT;
}

function getFuturesBasisPct(item: FuturesSpotIndicator) {
  return hasNum(item.basis_pct) ? n(item.basis_pct) : n(item.futures_basis_pct);
}

function getFuturesSideText(item: FuturesSpotIndicator) {
  const b = getFuturesBasisPct(item);
  if (b > 0.01) return "선물 우위";
  if (b < -0.01) return "현물 우위";
  return "중립";
}

function getFuturesSideTextClass(item: FuturesSpotIndicator) {
  const b = getFuturesBasisPct(item);
  if (b > 0.01) return COLOR_POS_TEXT;
  if (b < -0.01) return COLOR_NEG_TEXT;
  return "text-white/55";
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

function typeDescription(type: MarketType) {
  if (type === "domestic-global") {
    return "국내 시장과 해외 현물 시장의 괴리, 우세 방향, 국내/해외 분산을 한눈에 관찰합니다.";
  }
  if (type === "futures-spot") {
    return "글로벌 현물과 선물 구조의 베이시스, 가격차, 지연을 관찰합니다.";
  }
  return "글로벌 현물 시장의 실시간 대표 가격, 변동률, 시가총액, 거래량, 분산, 변동성, 최대 이탈, 최근 평균가 흐름을 관찰합니다.";
}

function defaultSortKey(_: MarketType): SortKey {
  return "rank";
}

function sortOptions(type: MarketType) {
  if (type === "domestic-global") {
    return [
      { value: "rank", label: "정렬: 시총" },
      { value: "favorite", label: "정렬: 즐겨찾기 우선" },
      { value: "avg", label: "정렬: 국내 평균가" },
      { value: "premium", label: "정렬: 괴리율" },
      { value: "spread", label: "정렬: 국내분산" },
      { value: "deviation", label: "정렬: 해외분산" },
    ] as { value: SortKey; label: string }[];
  }

  if (type === "futures-spot") {
    return [
      { value: "rank", label: "정렬: 시총" },
      { value: "favorite", label: "정렬: 즐겨찾기 우선" },
      { value: "avg", label: "정렬: 현물 평균가" },
      { value: "basis", label: "정렬: 베이시스" },
      { value: "delay", label: "정렬: 지연" },
      { value: "gap", label: "정렬: 가격차" },
    ] as { value: SortKey; label: string }[];
  }

  return [
    { value: "rank", label: "정렬: 시총" },
    { value: "favorite", label: "정렬: 즐겨찾기 우선" },
    { value: "avg", label: "정렬: 평균가" },
    { value: "spread", label: "정렬: 분산" },
    { value: "volatility", label: "정렬: 변동성" },
    { value: "deviation", label: "정렬: 최대 이탈" },
  ] as { value: SortKey; label: string }[];
}

function getFxFallback(items: AnyIndicator[]) {
  for (const item of items) {
    const fx =
      n((item as SpotIndicator).rate_krw_usd) ||
      n((item as DomesticGlobalIndicator).rate_krw_usd) ||
      n((item as FuturesSpotIndicator).rate_krw_usd);
    if (fx > 0) return fx;
  }
  return 0;
}

function getDomesticSpreadKrw(item: DomesticGlobalIndicator) {
  return n(item.domestic_spread_krw) || n(item.dispersion_krw_domestic_spread);
}

function getGlobalSpreadKrw(item: DomesticGlobalIndicator) {
  return n(item.global_spread_krw) || n(item.dispersion_krw_global_spread);
}

function getSpotDeviationValue(item: SpotIndicator, fx: number, currencyMode: CurrencyMode) {
  const rows = item.exchanges?.global_spot_usd || [];
  const avgUsd = n(item.global_avg_usd);
  if (!rows.length || !avgUsd) return { diff: 0, diffText: "-", name: "-" };

  let maxDiffUsd = 0;
  let name = "-";

  for (const row of rows) {
    const diff = Math.abs(n(row.price) - avgUsd);
    if (diff > maxDiffUsd) {
      maxDiffUsd = diff;
      name = row.name;
    }
  }

  return {
    diff: currencyMode === "KRW" && fx > 0 ? maxDiffUsd * fx : maxDiffUsd,
    diffText: currencyMode === "KRW" && fx > 0 ? fmtKrw(maxDiffUsd * fx) : fmtUsd(maxDiffUsd, 2),
    name,
  };
}

function getDomesticGapValue(item: DomesticGlobalIndicator) {
  return Math.abs(n(item.domestic_avg_krw) - n(item.global_spot_avg_krw));
}

function getDomesticGapText(item: DomesticGlobalIndicator, currencyMode: CurrencyMode, fx: number) {
  const diffKrw = getDomesticGapValue(item);
  if (currencyMode === "KRW") return fmtKrw(diffKrw);
  return fx > 0 ? fmtUsd(diffKrw / fx, 2) : "-";
}

function getFuturesGapUsd(item: FuturesSpotIndicator) {
  return Math.abs(n(item.global_spot_avg_usd) - n(item.global_futures_avg_usd));
}

function getFuturesGapText(
  item: FuturesSpotIndicator,
  fx: number,
  currencyMode: CurrencyMode
) {
  const diffUsd = getFuturesGapUsd(item);
  if (currencyMode === "KRW") {
    return fx > 0 ? fmtKrw(diffUsd * fx) : "-";
  }
  return fmtUsd(diffUsd, 2);
}

function normalizeFavoriteSymbol(value: any) {
  return String(value || "").trim().toUpperCase();
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const target = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : "";
}

function decodeBase64Url(value: string) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const encoded = Array.from(binary)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("");
    return decodeURIComponent(encoded);
  } catch {
    return "";
  }
}

function getClientAuthToken() {
  const session = getCookieValue("cain_sess");
  if (session) {
    const payloadRaw = session.split(".")[0] || "";
    const decoded = decodeBase64Url(payloadRaw);
    if (decoded) {
      try {
        const parsed = JSON.parse(decoded);
        if (typeof parsed?.token === "string" && parsed.token.trim()) {
          return parsed.token.trim();
        }
      } catch {}
    }
  }

  const legacy = getCookieValue("cain_token");
  if (legacy) return legacy.trim();

  try {
    if (typeof window !== "undefined") {
      const localToken = window.localStorage.getItem("cain_token");
      if (localToken && localToken.trim()) return localToken.trim();
    }
  } catch {}

  return "";
}

function useIsDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(mediaQuery.matches);

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isDesktop;
}

function sortIndicators(
  arr: AnyIndicator[],
  type: MarketType,
  sortKey: SortKey,
  fxFallback: number,
  favoriteSet: Set<string>
) {
  const out = [...arr];

  out.sort((a, b) => {
    const aSymbol = normalizeFavoriteSymbol(a.symbol);
    const bSymbol = normalizeFavoriteSymbol(b.symbol);
    const aFavorite = favoriteSet.has(aSymbol);
    const bFavorite = favoriteSet.has(bSymbol);

    if (sortKey === "symbol") return String(a.symbol).localeCompare(String(b.symbol));

    if (sortKey === "favorite") {
      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
      const aRank = hasNum(a.market_cap_rank) ? Number(a.market_cap_rank) : 999999;
      const bRank = hasNum(b.market_cap_rank) ? Number(b.market_cap_rank) : 999999;
      if (aRank !== bRank) return aRank - bRank;
      return String(a.symbol).localeCompare(String(b.symbol));
    }

    if (sortKey === "rank") {
      const aRank = hasNum(a.market_cap_rank) ? Number(a.market_cap_rank) : 999999;
      const bRank = hasNum(b.market_cap_rank) ? Number(b.market_cap_rank) : 999999;
      if (aRank !== bRank) return aRank - bRank;
      return String(a.symbol).localeCompare(String(b.symbol));
    }

    if (sortKey === "avg") {
      if (type === "domestic-global") {
        return (
          n((b as DomesticGlobalIndicator).domestic_avg_krw) -
          n((a as DomesticGlobalIndicator).domestic_avg_krw)
        );
      }
      if (type === "futures-spot") {
        return (
          n((b as FuturesSpotIndicator).global_spot_avg_usd) -
          n((a as FuturesSpotIndicator).global_spot_avg_usd)
        );
      }
      return n((b as SpotIndicator).global_avg_usd) - n((a as SpotIndicator).global_avg_usd);
    }

    if (sortKey === "price") {
      return getSpotPriceValue(b as SpotIndicator, "KRW", fxFallback) - getSpotPriceValue(a as SpotIndicator, "KRW", fxFallback);
    }

    if (sortKey === "change1h") {
      return n((b as SpotIndicator).change_1h) - n((a as SpotIndicator).change_1h);
    }

    if (sortKey === "change24h") {
      return getSpotChange24h(b as SpotIndicator) - getSpotChange24h(a as SpotIndicator);
    }

    if (sortKey === "change7d") {
      return n((b as SpotIndicator).change_7d) - n((a as SpotIndicator).change_7d);
    }

    if (sortKey === "marketcap") {
      return getSpotMarketCapValue(b as SpotIndicator, "KRW", fxFallback) - getSpotMarketCapValue(a as SpotIndicator, "KRW", fxFallback);
    }

    if (sortKey === "volume") {
      return getSpotVolumeValue(b as SpotIndicator, "USD", fxFallback) - getSpotVolumeValue(a as SpotIndicator, "USD", fxFallback);
    }

    if (sortKey === "premium") {
      return (
        Math.abs(n((b as DomesticGlobalIndicator).premium_pct)) -
        Math.abs(n((a as DomesticGlobalIndicator).premium_pct))
      );
    }

    if (sortKey === "basis") {
      return (
        Math.abs(getFuturesBasisPct(b as FuturesSpotIndicator)) -
        Math.abs(getFuturesBasisPct(a as FuturesSpotIndicator))
      );
    }

    if (sortKey === "delay") {
      return (
        Math.abs(n((b as FuturesSpotIndicator).delay_proxy)) -
        Math.abs(n((a as FuturesSpotIndicator).delay_proxy))
      );
    }

    if (sortKey === "volatility") {
      return n((b as SpotIndicator).volatility_ratio) - n((a as SpotIndicator).volatility_ratio);
    }

    if (sortKey === "spread") {
      if (type === "domestic-global") {
        return (
          getDomesticSpreadKrw(b as DomesticGlobalIndicator) -
          getDomesticSpreadKrw(a as DomesticGlobalIndicator)
        );
      }
      return n((b as SpotIndicator).global_spread_pct) - n((a as SpotIndicator).global_spread_pct);
    }

    if (sortKey === "gap") {
      if (type === "domestic-global") {
        return (
          getDomesticGapValue(b as DomesticGlobalIndicator) -
          getDomesticGapValue(a as DomesticGlobalIndicator)
        );
      }
      return getFuturesGapUsd(b as FuturesSpotIndicator) - getFuturesGapUsd(a as FuturesSpotIndicator);
    }

    if (sortKey === "deviation") {
      if (type === "domestic-global") {
        return (
          getGlobalSpreadKrw(b as DomesticGlobalIndicator) -
          getGlobalSpreadKrw(a as DomesticGlobalIndicator)
        );
      }
      const aDev = getSpotDeviationValue(a as SpotIndicator, fxFallback, "KRW").diff;
      const bDev = getSpotDeviationValue(b as SpotIndicator, fxFallback, "KRW").diff;
      return bDev - aDev;
    }

    return String(a.symbol).localeCompare(String(b.symbol));
  });

  return out;
}

function TypeTabs({ type }: { type: MarketType }) {
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
            href={`/personal-markets/${tab.type}`}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-[var(--brand)] bg-[color:rgba(0,229,255,0.10)] text-[var(--brand)] shadow-[0_0_0_1px_rgba(0,229,255,0.15),0_0_18px_rgba(0,229,255,0.08)]"
                : "border-[color:rgba(0,229,255,0.38)] bg-black/60 text-white/85 hover:bg-black/80 hover:text-[var(--brand)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
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
      >
        ?
      </button>
      {open ? (
        <div
          className={`absolute top-6 z-20 w-64 rounded-xl border border-[color:rgba(0,229,255,0.25)] bg-[#071015] p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${
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

function HeaderCell({
  label,
  infoKey,
  infoTitle,
  infoContent,
  activeInfoKey,
  setActiveInfoKey,
  align = "left",
  popoverSide = "left",
  extra,
}: {
  label: string;
  infoKey?: InfoKey;
  infoTitle?: string;
  infoContent?: string;
  activeInfoKey: string | null;
  setActiveInfoKey: (key: string | null) => void;
  align?: "left" | "center";
  popoverSide?: "left" | "right";
  extra?: ReactNode;
}) {
  const isOpen = !!infoKey && activeInfoKey === infoKey;

  return (
    <div className={`flex items-center gap-1 ${align === "center" ? "justify-center" : ""}`}>
      <span>{label}</span>
      {extra}
      {infoKey && infoTitle && infoContent ? (
        <InfoPopover
          title={infoTitle}
          content={infoContent}
          open={isOpen}
          onToggle={() => setActiveInfoKey(isOpen ? null : infoKey)}
          side={popoverSide}
        />
      ) : null}
    </div>
  );
}

function CurrencyInlineToggle({
  value,
  onChange,
}: {
  value: CurrencyMode;
  onChange: (v: CurrencyMode) => void;
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

function MiniModeToggle({
  value,
  leftLabel,
  rightLabel,
  onChange,
}: {
  value: "pct" | "gap";
  leftLabel: string;
  rightLabel: string;
  onChange: (v: "pct" | "gap") => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-[color:rgba(0,229,255,0.32)] bg-black/60">
      <button
        type="button"
        onClick={() => onChange("pct")}
        className={`px-2 py-0.5 text-[10px] transition ${
          value === "pct"
            ? "bg-[color:rgba(0,229,255,0.14)] text-[var(--brand)]"
            : "text-white/70 hover:text-white"
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("gap")}
        className={`px-2 py-0.5 text-[10px] transition ${
          value === "gap"
            ? "bg-[color:rgba(0,229,255,0.14)] text-[var(--brand)]"
            : "text-white/70 hover:text-white"
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}

function SpotChangeToggle({
  value,
  onChange,
}: {
  value: SpotChangeMode;
  onChange: (v: SpotChangeMode) => void;
}) {
  const options: { value: SpotChangeMode; label: string }[] = [
    { value: "1h", label: "1H" },
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
  ];

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

function SpotSizeToggle({
  value,
  onChange,
}: {
  value: SpotSizeMode;
  onChange: (v: SpotSizeMode) => void;
}) {
  const options: { value: SpotSizeMode; label: string }[] = [
    { value: "marketcap", label: "시총" },
    { value: "volume", label: "거래량" },
  ];

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

function getSpotSizeLabel(mode: SpotSizeMode) {
  return mode === "volume" ? "24H 거래량" : "시가총액";
}

function getInfoText(type: MarketType, key: InfoKey) {
  const map: Record<MarketType, Partial<Record<InfoKey, { title: string; content: string }>>> = {
    spot: {
      avg: {
        title: "평균가",
        content:
          "글로벌 현물 거래소들의 현재 가격 평균입니다.\n상단 KRW / USD 공통 토글로 표시 단위를 바꿉니다.",
      },
      spread: {
        title: "분산",
        content:
          "거래소 간 현재 가격 차이가 얼마나 벌어져 있는지 보여줍니다.\n값이 클수록 거래소별 가격 차가 큽니다.",
      },
      volatility: {
        title: "변동성",
        content:
          "현재 시점 기준 가격 흔들림 강도를 간단히 보여주는 값입니다.\n높을수록 시장이 거칠게 움직인다는 뜻입니다.",
      },
      deviation: {
        title: "최대 이탈",
        content:
          "현재 평균가에서 가장 많이 벗어난 거래소와 그 차이를 보여줍니다.\n이상하게 튀는 거래소를 빠르게 찾는 데 유용합니다.",
      },
      sparkline: {
        title: "최근 평균가 7일",
        content:
          "최근 7일 평균가 흐름을 작은 그래프로 보여줍니다.\nSPOT 탭에서는 가격 흐름 자체를 직관적으로 보기 위한 자리입니다.",
      },
    },
    "domestic-global": {
      domesticAvg: {
        title: "국내 평균가",
        content:
          "업비트·빗썸 등 국내 거래소 가격 평균입니다.\n상단 KRW / USD 공통 토글로 표시 단위를 바꿉니다.",
      },
      globalAvg: {
        title: "해외 평균가",
        content:
          "해외 현물 거래소 평균가입니다.\nKRW 모드에서는 환율 반영 원화 값으로, USD 모드에서는 달러 값으로 표시됩니다.",
      },
      dominance: {
        title: "우세",
        content:
          "현재 국내 가격이 우세한지, 해외 가격이 우세한지 한눈에 보여줍니다.\n중립이면 양쪽이 크게 치우치지 않은 상태입니다.",
      },
      premium: {
        title: "괴리율 / 가격차",
        content:
          "괴리율은 국내 평균가와 해외 평균가의 비율 차이입니다.\n토글을 바꾸면 같은 정보를 절대 금액 차이로도 볼 수 있습니다.",
      },
      spread: {
        title: "국내분산",
        content:
          "국내 거래소들끼리의 가격 차이입니다.\n값이 크면 국내 시장 안에서도 가격 차가 벌어져 있다는 뜻입니다.",
      },
      globalSpread: {
        title: "해외분산",
        content:
          "해외 거래소들끼리의 가격 차이입니다.\n값이 크면 해외 평균가 자체의 균일성이 낮다는 뜻입니다.",
      },
      sparkline: {
        title: "괴리율 추이 3일",
        content:
          "최근 3일간 괴리율이 확대되는지 줄어드는지 보여줍니다.\n국내/해외 탭에서는 가격보다 괴리 구조를 보는 자리입니다.",
      },
    },
    "futures-spot": {
      avg: {
        title: "현물 평균가",
        content:
          "글로벌 현물 거래소 평균가입니다.\n상단 KRW / USD 공통 토글로 표시 단위를 바꿉니다.",
      },
      globalAvg: {
        title: "선물 평균가",
        content:
          "글로벌 선물 거래소 평균가입니다.\n상단 KRW / USD 공통 토글로 표시 단위를 바꿉니다.",
      },
      basis: {
        title: "베이시스 / 가격차",
        content:
          "베이시스는 선물 평균가와 현물 평균가의 퍼센트 차이입니다.\n토글을 바꾸면 절대 금액 차이로도 볼 수 있습니다.\n하단 문구는 선물 우위 / 현물 우위 상태를 뜻합니다.",
      },
      delay: {
        title: "지연",
        content:
          "현물과 선물 가격 반응 차이를 간단히 나타내는 보조 지표입니다.\n값이 클수록 둘의 움직임이 덜 맞물린다는 뜻입니다.",
      },
      sparkline: {
        title: "베이시스 추이 3일",
        content:
          "최근 3일간 베이시스가 확대되는지 축소되는지 보여줍니다.\n선물/현물 탭에서는 구조적 상태 변화를 보는 자리입니다.",
      },
      gap: {
        title: "가격차",
        content:
          "현물 평균가와 선물 평균가의 절대 금액 차이입니다.\n퍼센트가 아닌 실제 차액으로 보는 방식입니다.",
      },
    },
  };

  return map[type][key] || { title: "", content: "" };
}

function formatPriceByCurrency(
  usdValue: number | null | undefined,
  krwValue: number | null | undefined,
  fx: number | null | undefined,
  currencyMode: CurrencyMode
) {
  if (currencyMode === "KRW") {
    if (hasNum(krwValue)) return fmtKrw(krwValue);
    if (hasNum(usdValue) && hasNum(fx) && n(fx) > 0) return fmtKrw(n(usdValue) * n(fx));
    return "-";
  }

  if (hasNum(usdValue)) return fmtUsd(usdValue, 2);
  if (hasNum(krwValue) && hasNum(fx) && n(fx) > 0) return fmtUsd(n(krwValue) / n(fx), 2);
  return "-";
}

function fmtUsdInt(v: any) {
  if (!hasNum(v)) return "-";
  const x = Number(v);
  return `$${Math.round(x).toLocaleString()}`;
}

function getSpotPriceValue(item: SpotIndicator, currencyMode: CurrencyMode, fx: number) {
  return currencyMode === "KRW"
    ? (hasNum(item.price_krw) ? n(item.price_krw) : hasNum(item.price_usd) && fx > 0 ? n(item.price_usd) * fx : 0)
    : (hasNum(item.price_usd) ? n(item.price_usd) : hasNum(item.price_krw) && fx > 0 ? n(item.price_krw) / fx : 0);
}

function getSpotPriceText(item: SpotIndicator, currencyMode: CurrencyMode, fx: number) {
  return formatPriceByCurrency(item.price_usd, item.price_krw ?? item.price, fx, currencyMode);
}

function getSpotChange24h(item: SpotIndicator) {
  if (hasNum(item.change_24h)) return n(item.change_24h);
  if (hasNum(item.price_change_percentage_24h)) return n(item.price_change_percentage_24h);
  return 0;
}

function getSpotMarketCapValue(item: SpotIndicator, currencyMode: CurrencyMode, fx: number) {
  const supply = hasNum(item.circulating_supply) ? n(item.circulating_supply) : 0;
  if (currencyMode === "KRW") {
    if (hasNum(item.market_cap_live)) return n(item.market_cap_live);
    const priceKrw = hasNum(item.price_krw) ? n(item.price_krw) : hasNum(item.price_usd) && fx > 0 ? n(item.price_usd) * fx : 0;
    return supply > 0 ? priceKrw * supply : 0;
  }

  const priceUsd = hasNum(item.price_usd) ? n(item.price_usd) : hasNum(item.price_krw) && fx > 0 ? n(item.price_krw) / fx : 0;
  return supply > 0 ? priceUsd * supply : 0;
}

function getSpotMarketCapText(item: SpotIndicator, currencyMode: CurrencyMode, fx: number) {
  const value = getSpotMarketCapValue(item, currencyMode, fx);
  return currencyMode === "KRW" ? fmtKrw(value) : fmtUsdInt(value);
}

function getSpotVolumeValue(item: SpotIndicator, currencyMode: CurrencyMode, fx: number) {
  const base = hasNum(item.total_volume) ? n(item.total_volume) : 0;
  if (currencyMode === "KRW") return fx > 0 ? base * fx : 0;
  return base;
}

function getSpotVolumeText(item: SpotIndicator, currencyMode: CurrencyMode, fx: number) {
  const value = getSpotVolumeValue(item, currencyMode, fx);
  return currencyMode === "KRW" ? fmtKrw(value) : fmtUsdInt(value);
}

function getSpotChangeValue(item: SpotIndicator, mode: SpotChangeMode) {
  if (mode === "1h") return n(item.change_1h);
  if (mode === "7d") return n(item.change_7d);
  return getSpotChange24h(item);
}

function getSpotChangeLabel(_: SpotChangeMode) {
  return "변동률";
}

function mergeSpotIndicatorsWithMarkets(
  indicatorItems: AnyIndicator[],
  marketItems: MarketsV2ItemRes[]
): SpotIndicator[] {
  const marketMap = new Map<string, SpotIndicator>();

  for (const row of marketItems) {
    const normalized = normalizeSpotMarketItem(row);
    const symbol = normalizeFavoriteSymbol(normalized.symbol);
    const canonical = normalizeFavoriteSymbol(normalized.canonical_symbol);
    if (symbol) marketMap.set(symbol, normalized);
    if (canonical) marketMap.set(canonical, normalized);
  }

  return indicatorItems.map((raw) => {
    const indicator = raw as SpotIndicator;
    const symbol = normalizeFavoriteSymbol(indicator.symbol);
    const canonical = normalizeFavoriteSymbol(indicator.canonical_symbol);
    const market = marketMap.get(symbol) || marketMap.get(canonical) || null;

    return {
      ...indicator,
      symbol: indicator.symbol || market?.symbol || "",
      canonical_symbol: indicator.canonical_symbol || market?.canonical_symbol || undefined,

      market_cap_rank: indicator.market_cap_rank ?? market?.market_cap_rank ?? null,
      rank_name: indicator.rank_name || market?.rank_name || indicator.symbol,
      rank_cg_id: indicator.rank_cg_id || market?.rank_cg_id || null,
      icon_url: indicator.icon_url || market?.icon_url || null,
      is_ranked: indicator.is_ranked ?? market?.is_ranked ?? false,
      sort_priority: indicator.sort_priority ?? market?.sort_priority ?? 999999,

      price: market?.price ?? indicator.price ?? null,
      price_usd: market?.price_usd ?? indicator.price_usd ?? indicator.global_avg_usd ?? null,
      price_krw: market?.price_krw ?? indicator.price_krw ?? null,
      market_cap_live: market?.market_cap_live ?? indicator.market_cap_live ?? null,
      total_volume: market?.total_volume ?? indicator.total_volume ?? null,
      change_1h: market?.change_1h ?? indicator.change_1h ?? null,
      change_24h: market?.change_24h ?? indicator.change_24h ?? null,
      change_7d: market?.change_7d ?? indicator.change_7d ?? null,
      price_change_percentage_24h:
        market?.price_change_percentage_24h ?? indicator.price_change_percentage_24h ?? null,
      price_source_exchange:
        market?.price_source_exchange ?? indicator.price_source_exchange ?? null,
      price_source_type:
        market?.price_source_type ?? indicator.price_source_type ?? null,
      has_live_price: market?.has_live_price ?? indicator.has_live_price ?? false,
      circulating_supply: market?.circulating_supply ?? indicator.circulating_supply ?? null,
      rate_krw_usd: indicator.rate_krw_usd ?? market?.rate_krw_usd ?? null,
    };
  });
}

function normalizeSpotMarketItem(row: MarketsV2ItemRes): SpotIndicator {
  const symbol = String(row?.symbol_upper || row?.symbol || "").toUpperCase();
  return {
    symbol,
    canonical_symbol: row?.canonical_symbol || `${symbol}USDT`,
    type: "spot",
    market_cap_rank: hasNum(row?.market_cap_rank) ? n(row?.market_cap_rank) : null,
    rank_name: row?.name || symbol,
    rank_cg_id: row?.cg_id || null,
    icon_url: row?.image || null,
    price: hasNum(row?.price) ? n(row?.price) : null,
    price_usd: hasNum(row?.price_usd) ? n(row?.price_usd) : null,
    price_krw: hasNum(row?.price_krw) ? n(row?.price_krw) : null,
    market_cap_live: hasNum(row?.market_cap_live) ? n(row?.market_cap_live) : null,
    total_volume: hasNum(row?.total_volume) ? n(row?.total_volume) : null,
    change_1h: hasNum(row?.change_1h) ? n(row?.change_1h) : null,
    change_24h: hasNum(row?.change_24h)
      ? n(row?.change_24h)
      : hasNum(row?.price_change_percentage_24h)
      ? n(row?.price_change_percentage_24h)
      : null,
    change_7d: hasNum(row?.change_7d) ? n(row?.change_7d) : null,
    price_change_percentage_24h: hasNum(row?.price_change_percentage_24h)
      ? n(row?.price_change_percentage_24h)
      : null,
    rate_krw_usd: hasNum(row?.fx_usdkrw) ? n(row?.fx_usdkrw) : null,
    has_live_price: !!row?.has_live_price,
    price_source_exchange: row?.price_source_exchange || null,
    price_source_type: row?.price_source_type || null,
    circulating_supply: hasNum(row?.circulating_supply) ? n(row?.circulating_supply) : null,
  };
}

function CoinCell({ item }: { item: AnyIndicator }) {
  const rankName = item.rank_name || item.canonical_symbol || "";

  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/60">
        {item.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.icon_url} alt={item.symbol} className="h-7 w-7 object-contain" />
        ) : (
          <span className="text-xs font-semibold opacity-70">{item.symbol?.slice(0, 3)}</span>
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{item.symbol}</div>
        <div className="mt-0.5 truncate text-[11px] opacity-55">{rankName || "-"}</div>
      </div>
    </div>
  );
}

function FavoriteButton({
  active,
  busy,
  onToggle,
}: {
  active: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={active}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition ${
        active
          ? "border-[color:rgba(0,229,255,0.45)] bg-[color:rgba(0,229,255,0.12)] text-[var(--brand)]"
          : "border-white/10 bg-black/60 text-white/60 hover:text-[var(--brand)]"
      } ${busy ? "cursor-not-allowed opacity-60" : ""}`}
      title={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

function MetricCell({
  top,
  bottom,
  topClassName = COLOR_WHITE_TEXT,
  bottomClassName = COLOR_NEUTRAL_SUBTEXT,
}: {
  top: ReactNode;
  bottom?: ReactNode;
  topClassName?: string;
  bottomClassName?: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-sm font-semibold ${topClassName}`}>{top}</div>
      {bottom ? <div className={`mt-1 text-[10px] ${bottomClassName}`}>{bottom}</div> : null}
    </div>
  );
}

function Sparkline({
  points,
  height = 34,
  stroke = COLOR_BRAND_STROKE,
}: {
  points: number[] | null | undefined;
  height?: number;
  stroke?: string;
}) {
  if (!hasSparkline(points)) {
    return <div className="text-center text-xs text-white/35">-</div>;
  }

  const width = 140;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[34px] w-[140px] overflow-visible"
        preserveAspectRatio="none"
      >
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

function DesktopTable({
  items,
  type,
  currencyMode,
  setCurrencyMode,
  premiumDisplayMode,
  setPremiumDisplayMode,
  basisDisplayMode,
  setBasisDisplayMode,
  spotChangeMode,
  setSpotChangeMode,
  spotSizeMode,
  setSpotSizeMode,
  activeInfoKey,
  setActiveInfoKey,
  fxFallback,
  favoriteSet,
  favoriteBusySymbol,
  onToggleFavorite,
}: {
  items: AnyIndicator[];
  type: MarketType;
  currencyMode: CurrencyMode;
  setCurrencyMode: (v: CurrencyMode) => void;
  premiumDisplayMode: PremiumDisplayMode;
  setPremiumDisplayMode: (v: PremiumDisplayMode) => void;
  basisDisplayMode: BasisDisplayMode;
  setBasisDisplayMode: (v: BasisDisplayMode) => void;
  spotChangeMode: SpotChangeMode;
  setSpotChangeMode: (v: SpotChangeMode) => void;
  spotSizeMode: SpotSizeMode;
  setSpotSizeMode: (v: SpotSizeMode) => void;
  activeInfoKey: string | null;
  setActiveInfoKey: (key: string | null) => void;
  fxFallback: number;
  favoriteSet: Set<string>;
  favoriteBusySymbol: string | null;
  onToggleFavorite: (symbol: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/40 xl:block">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="border-b border-white/10 bg-black/60">
            <tr className="text-left text-[12px] text-white/75">
              <th className="w-[230px] px-4 py-3 font-medium">
                <div className="flex items-center justify-start gap-3">
                  <CurrencyInlineToggle value={currencyMode} onChange={setCurrencyMode} />
                  <HeaderCell
                    label="코인"
                    activeInfoKey={activeInfoKey}
                    setActiveInfoKey={setActiveInfoKey}
                  />
                </div>
              </th>

              {type === "spot" ? (
                <>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="가격"
                      infoKey="price"
                      infoTitle={getInfoText(type, "price").title}
                      infoContent={getInfoText(type, "price").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                      <SpotChangeToggle value={spotChangeMode} onChange={setSpotChangeMode} />
                      <HeaderCell
                        label={getSpotChangeLabel(spotChangeMode)}
                        infoKey={
                          spotChangeMode === "1h"
                            ? "change1h"
                            : spotChangeMode === "7d"
                            ? "change7d"
                            : "change24h"
                        }
                        infoTitle={
                          getInfoText(
                            type,
                            spotChangeMode === "1h"
                              ? "change1h"
                              : spotChangeMode === "7d"
                              ? "change7d"
                              : "change24h"
                          ).title
                        }
                        infoContent={
                          getInfoText(
                            type,
                            spotChangeMode === "1h"
                              ? "change1h"
                              : spotChangeMode === "7d"
                              ? "change7d"
                              : "change24h"
                          ).content
                        }
                        activeInfoKey={activeInfoKey}
                        setActiveInfoKey={setActiveInfoKey}
                        align="center"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                      <SpotSizeToggle value={spotSizeMode} onChange={setSpotSizeMode} />
                      <HeaderCell
                        label={getSpotSizeLabel(spotSizeMode)}
                        infoKey={spotSizeMode === "volume" ? "volume" : "marketcap"}
                        infoTitle={
                          getInfoText(type, spotSizeMode === "volume" ? "volume" : "marketcap").title
                        }
                        infoContent={
                          getInfoText(type, spotSizeMode === "volume" ? "volume" : "marketcap").content
                        }
                        activeInfoKey={activeInfoKey}
                        setActiveInfoKey={setActiveInfoKey}
                        align="center"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="분산"
                      infoKey="spread"
                      infoTitle={getInfoText(type, "spread").title}
                      infoContent={getInfoText(type, "spread").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="변동성"
                      infoKey="volatility"
                      infoTitle={getInfoText(type, "volatility").title}
                      infoContent={getInfoText(type, "volatility").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="최대 이탈"
                      infoKey="deviation"
                      infoTitle={getInfoText(type, "deviation").title}
                      infoContent={getInfoText(type, "deviation").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="w-[170px] px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="최근 평균가 7일"
                      infoKey="sparkline"
                      infoTitle={getInfoText(type, "sparkline").title}
                      infoContent={getInfoText(type, "sparkline").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                      popoverSide="right"
                    />
                  </th>
                </>
              ) : type === "domestic-global" ? (
                <>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="국내 평균가"
                      infoKey="domesticAvg"
                      infoTitle={getInfoText(type, "domesticAvg").title}
                      infoContent={getInfoText(type, "domesticAvg").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="해외 평균가"
                      infoKey="globalAvg"
                      infoTitle={getInfoText(type, "globalAvg").title}
                      infoContent={getInfoText(type, "globalAvg").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="우세"
                      infoKey="dominance"
                      infoTitle={getInfoText(type, "dominance").title}
                      infoContent={getInfoText(type, "dominance").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                      <MiniModeToggle
                        value={premiumDisplayMode}
                        leftLabel="%"
                        rightLabel="₩"
                        onChange={setPremiumDisplayMode}
                      />
                      <HeaderCell
                        label={premiumDisplayMode === "pct" ? "괴리율" : "가격차"}
                        infoKey="premium"
                        infoTitle={getInfoText(type, "premium").title}
                        infoContent={getInfoText(type, "premium").content}
                        activeInfoKey={activeInfoKey}
                        setActiveInfoKey={setActiveInfoKey}
                        align="center"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="국내분산"
                      infoKey="spread"
                      infoTitle={getInfoText(type, "spread").title}
                      infoContent={getInfoText(type, "spread").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="해외분산"
                      infoKey="globalSpread"
                      infoTitle={getInfoText(type, "globalSpread").title}
                      infoContent={getInfoText(type, "globalSpread").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                      popoverSide="right"
                    />
                  </th>
                  <th className="w-[170px] px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="괴리율 추이 3일"
                      infoKey="sparkline"
                      infoTitle={getInfoText(type, "sparkline").title}
                      infoContent={getInfoText(type, "sparkline").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                      popoverSide="right"
                    />
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="현물 평균가"
                      infoKey="avg"
                      infoTitle={getInfoText(type, "avg").title}
                      infoContent={getInfoText(type, "avg").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="선물 평균가"
                      infoKey="globalAvg"
                      infoTitle={getInfoText(type, "globalAvg").title}
                      infoContent={getInfoText(type, "globalAvg").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                      <MiniModeToggle
                        value={basisDisplayMode}
                        leftLabel="%"
                        rightLabel="₩"
                        onChange={setBasisDisplayMode}
                      />
                      <HeaderCell
                        label={basisDisplayMode === "pct" ? "베이시스" : "가격차"}
                        infoKey="basis"
                        infoTitle={getInfoText(type, "basis").title}
                        infoContent={getInfoText(type, "basis").content}
                        activeInfoKey={activeInfoKey}
                        setActiveInfoKey={setActiveInfoKey}
                        align="center"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="지연"
                      infoKey="delay"
                      infoTitle={getInfoText(type, "delay").title}
                      infoContent={getInfoText(type, "delay").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                      popoverSide="right"
                    />
                  </th>
                  <th className="w-[170px] px-4 py-3 font-medium text-center">
                    <HeaderCell
                      label="베이시스 추이 3일"
                      infoKey="sparkline"
                      infoTitle={getInfoText(type, "sparkline").title}
                      infoContent={getInfoText(type, "sparkline").content}
                      activeInfoKey={activeInfoKey}
                      setActiveInfoKey={setActiveInfoKey}
                      align="center"
                      popoverSide="right"
                    />
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {items.map((item, idx) => {
              const rowCls =
                idx % 2 === 0
                  ? "border-b border-white/5 bg-black/20 hover:bg-white/[0.03]"
                  : "border-b border-white/5 bg-black/10 hover:bg-white/[0.03]";

              const fx =
                n((item as SpotIndicator).rate_krw_usd) ||
                n((item as DomesticGlobalIndicator).rate_krw_usd) ||
                n((item as FuturesSpotIndicator).rate_krw_usd) ||
                fxFallback;

              const spotSpark =
                currencyMode === "KRW"
                  ? (item as SpotIndicator).sparkline_krw
                  : (item as SpotIndicator).sparkline_usd;

              const dgSpark = (item as DomesticGlobalIndicator).sparkline_gap;
              const futuresSpark = (item as FuturesSpotIndicator).sparkline_basis;

              const normalizedSymbol = normalizeFavoriteSymbol(item.symbol);
              const isFavorite = favoriteSet.has(normalizedSymbol);
              const favoriteBusy = favoriteBusySymbol === normalizedSymbol;

              return (
                <tr
                          key={`${item.canonical_symbol || item.rank_cg_id || item.rank_name || item.symbol}-${type}-${idx}`}
                          className={rowCls}
                        >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <FavoriteButton
                        active={isFavorite}
                        busy={favoriteBusy}
                        onToggle={() => onToggleFavorite(item.symbol)}
                      />
                      <Link
                        href={`/personal-markets/${type}/${encodeURIComponent(item.symbol)}`}
                        className="block min-w-0 flex-1 hover:opacity-90"
                      >
                        <CoinCell item={item} />
                      </Link>
                    </div>
                  </td>

                  {type === "spot" ? (
                    <>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={getSpotPriceText(item as SpotIndicator, currencyMode, fx)}
                          topClassName={COLOR_BRAND_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={fmtPct(getSpotChangeValue(item as SpotIndicator, spotChangeMode), 3)}
                          bottom={getSpotChangeLabel(spotChangeMode)}
                          topClassName={getSignedTextClass(
                            getSpotChangeValue(item as SpotIndicator, spotChangeMode)
                          )}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={
                            spotSizeMode === "volume"
                              ? getSpotVolumeText(item as SpotIndicator, currencyMode, fx)
                              : getSpotMarketCapText(item as SpotIndicator, currencyMode, fx)
                          }
                          bottom={getSpotSizeLabel(spotSizeMode)}
                          topClassName={COLOR_BRAND_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={fmtPct((item as SpotIndicator).global_spread_pct, 3)}
                          bottom={
                            currencyMode === "KRW" && fx > 0
                              ? fmtKrw(n((item as SpotIndicator).global_spread_usd) * fx)
                              : fmtUsd((item as SpotIndicator).global_spread_usd, 2)
                          }
                          topClassName={getSpotSpreadTextClass()}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={fmtPct((item as SpotIndicator).volatility_ratio, 3)}
                          bottom={getVolatilityStatusText(item as SpotIndicator)}
                          topClassName={getVolatilityTextClass()}
                          bottomClassName={getVolatilityStatusTextClass(item as SpotIndicator)}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={getSpotDeviationValue(item as SpotIndicator, fx, currencyMode).diffText}
                          bottom={getSpotDeviationValue(item as SpotIndicator, fx, currencyMode).name}
                          topClassName={COLOR_BRAND_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Sparkline
                          points={spotSpark}
                          stroke={getSparklineStrokeByPoints(spotSpark)}
                        />
                      </td>
                    </>
                  ) : type === "domestic-global" ? (
                    <>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={formatPriceByCurrency(
                            null,
                            (item as DomesticGlobalIndicator).domestic_avg_krw,
                            fx,
                            currencyMode
                          )}
                          topClassName={COLOR_WHITE_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={formatPriceByCurrency(
                            (item as DomesticGlobalIndicator).global_spot_avg_usd,
                            (item as DomesticGlobalIndicator).global_spot_avg_krw,
                            fx,
                            currencyMode
                          )}
                          topClassName={COLOR_YELLOW_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={getDomesticDominanceText(item as DomesticGlobalIndicator)}
                          topClassName={getDominanceTextClass(item as DomesticGlobalIndicator)}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={
                            premiumDisplayMode === "pct"
                              ? fmtPct((item as DomesticGlobalIndicator).premium_pct, 3)
                              : getDomesticGapText(
                                  item as DomesticGlobalIndicator,
                                  currencyMode,
                                  fx
                                )
                          }
                          bottom={getDomesticDominanceText(item as DomesticGlobalIndicator)}
                          topClassName={getSignedTextClass((item as DomesticGlobalIndicator).premium_pct)}
                          bottomClassName={getDominanceTextClass(item as DomesticGlobalIndicator)}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={
                            currencyMode === "KRW"
                              ? fmtKrw(getDomesticSpreadKrw(item as DomesticGlobalIndicator))
                              : fx > 0
                              ? fmtUsd(getDomesticSpreadKrw(item as DomesticGlobalIndicator) / fx, 2)
                              : "-"
                          }
                          topClassName={COLOR_BRAND_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={
                            currencyMode === "KRW"
                              ? fmtKrw(getGlobalSpreadKrw(item as DomesticGlobalIndicator))
                              : fx > 0
                              ? fmtUsd(getGlobalSpreadKrw(item as DomesticGlobalIndicator) / fx, 2)
                              : "-"
                          }
                          topClassName={COLOR_WHITE_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Sparkline
                          points={dgSpark}
                          stroke={getSparklineStrokeByPoints(dgSpark)}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={formatPriceByCurrency(
                            (item as FuturesSpotIndicator).global_spot_avg_usd,
                            null,
                            fx,
                            currencyMode
                          )}
                          topClassName={COLOR_WHITE_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={formatPriceByCurrency(
                            (item as FuturesSpotIndicator).global_futures_avg_usd,
                            null,
                            fx,
                            currencyMode
                          )}
                          topClassName={COLOR_BRAND_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={
                            basisDisplayMode === "pct"
                              ? fmtPct(getFuturesBasisPct(item as FuturesSpotIndicator), 3)
                              : getFuturesGapText(
                                  item as FuturesSpotIndicator,
                                  fx,
                                  currencyMode
                                )
                          }
                          bottom={getFuturesSideText(item as FuturesSpotIndicator)}
                          topClassName={getSignedTextClass(getFuturesBasisPct(item as FuturesSpotIndicator))}
                          bottomClassName={getFuturesSideTextClass(item as FuturesSpotIndicator)}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <MetricCell
                          top={fmtPct((item as FuturesSpotIndicator).delay_proxy, 3)}
                          topClassName={COLOR_WHITE_TEXT}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Sparkline
                          points={futuresSpark}
                          stroke={getSparklineStrokeByPoints(futuresSpark)}
                        />
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileSparkline({
  points,
  stroke = COLOR_BRAND_STROKE,
}: {
  points: number[] | null | undefined;
  stroke?: string;
}) {
  if (!hasSparkline(points)) {
    return <div className="text-right text-xs text-white/30">-</div>;
  }

  const width = 88;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-[88px] overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
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
  );
}

function MobileCards({
  items,
  type,
  currencyMode,
  premiumDisplayMode,
  basisDisplayMode,
  spotChangeMode,
  spotSizeMode,
  fxFallback,
  favoriteSet,
  favoriteBusySymbol,
  onToggleFavorite,
}: {
  items: AnyIndicator[];
  type: MarketType;
  currencyMode: CurrencyMode;
  premiumDisplayMode: PremiumDisplayMode;
  basisDisplayMode: BasisDisplayMode;
  spotChangeMode: SpotChangeMode;
  spotSizeMode: SpotSizeMode;
  fxFallback: number;
  favoriteSet: Set<string>;
  favoriteBusySymbol: string | null;
  onToggleFavorite: (symbol: string) => void;
}) {
  // PC 테이블은 그대로 두고, 모바일에서는 CMC식 압축 리스트만 보여줍니다.
  // 아래 값들은 상세페이지에서 다루기 위해 메인 모바일 목록에서는 의도적으로 숨깁니다.
  void premiumDisplayMode;
  void basisDisplayMode;
  void spotChangeMode;
  void spotSizeMode;

  return (
    <div className="xl:hidden overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(86px,0.72fr)_92px] items-center border-b border-white/10 bg-black/60 px-3 py-2 text-[11px] font-medium text-white/45">
        <div>코인</div>
        <div className="text-right">가격</div>
        <div className="text-right">7일</div>
      </div>

      <div className="divide-y divide-white/[0.07]">
        {items.map((item, idx) => {
          const fx =
            n((item as SpotIndicator).rate_krw_usd) ||
            n((item as DomesticGlobalIndicator).rate_krw_usd) ||
            n((item as FuturesSpotIndicator).rate_krw_usd) ||
            fxFallback;

          const spotSpark =
            currencyMode === "KRW"
              ? (item as SpotIndicator).sparkline_krw
              : (item as SpotIndicator).sparkline_usd;

          const dgSpark = (item as DomesticGlobalIndicator).sparkline_gap;
          const futuresSpark = (item as FuturesSpotIndicator).sparkline_basis;

          const sparkPoints =
            type === "spot" ? spotSpark : type === "domestic-global" ? dgSpark : futuresSpark;

          const priceText =
            type === "spot"
              ? getSpotPriceText(item as SpotIndicator, currencyMode, fx)
              : type === "domestic-global"
              ? formatPriceByCurrency(
                  null,
                  (item as DomesticGlobalIndicator).domestic_avg_krw,
                  fx,
                  currencyMode
                )
              : formatPriceByCurrency(
                  (item as FuturesSpotIndicator).global_spot_avg_usd,
                  null,
                  fx,
                  currencyMode
                );

          const priceSubLabel =
            type === "spot" ? "현재가" : type === "domestic-global" ? "국내 평균가" : "현물 평균가";

          const normalizedSymbol = normalizeFavoriteSymbol(item.symbol);
          const isFavorite = favoriteSet.has(normalizedSymbol);
          const favoriteBusy = favoriteBusySymbol === normalizedSymbol;
          const rankName = item.rank_name || item.canonical_symbol || "";
          const rankText = hasNum(item.market_cap_rank) ? `#${Number(item.market_cap_rank)}` : "";

          return (
            <div
              key={`${item.canonical_symbol || item.rank_cg_id || item.rank_name || item.symbol}-${type}-${idx}`}
              className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_minmax(86px,0.72fr)_92px] items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FavoriteButton
                  active={isFavorite}
                  busy={favoriteBusy}
                  onToggle={() => onToggleFavorite(item.symbol)}
                />

                <Link
                  href={`/personal-markets/${type}/${encodeURIComponent(item.symbol)}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/60">
                    {item.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.icon_url} alt={item.symbol} className="h-7 w-7 object-contain" />
                    ) : (
                      <span className="text-[10px] font-semibold text-white/55">
                        {item.symbol?.slice(0, 3)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{item.symbol}</span>
                      {rankText ? (
                        <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/45">
                          {rankText}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-white/45">{rankName || "-"}</div>
                  </div>
                </Link>
              </div>

              <Link
                href={`/personal-markets/${type}/${encodeURIComponent(item.symbol)}`}
                className="min-w-0 text-right"
              >
                <div className="truncate text-sm font-semibold text-[var(--brand)]">{priceText}</div>
                <div className="mt-0.5 text-[10px] text-white/35">{priceSubLabel}</div>
              </Link>

              <Link
                href={`/personal-markets/${type}/${encodeURIComponent(item.symbol)}`}
                className="flex justify-end"
              >
                <MobileSparkline
                  points={sparkPoints}
                  stroke={getSparklineStrokeByPoints(sparkPoints)}
                />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TypedPersonalMarketsClient({ type }: { type: string }) {
  const marketType = normalizeType(type);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AnyIndicator[]>([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey(marketType));
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("KRW");
  const [premiumDisplayMode, setPremiumDisplayMode] =
    useState<PremiumDisplayMode>("pct");
  const [basisDisplayMode, setBasisDisplayMode] =
    useState<BasisDisplayMode>("pct");
  const [spotChangeMode, setSpotChangeMode] = useState<SpotChangeMode>("24h");
  const [spotSizeMode, setSpotSizeMode] = useState<SpotSizeMode>("marketcap");
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favoriteSymbols, setFavoriteSymbols] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteBusySymbol, setFavoriteBusySymbol] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
  const favoriteSet = useMemo(
    () => new Set(favoriteSymbols.map((symbol) => normalizeFavoriteSymbol(symbol)).filter(Boolean)),
    [favoriteSymbols]
  );
  const isDesktopViewport = useIsDesktopViewport();

  async function loadFavorites(tokenOverride?: string) {
    const token = String(tokenOverride || authToken || getClientAuthToken() || "").trim();

    setFavoritesLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/me/favorites", {
        cache: "no-store",
        headers,
      });
      const j = (await res.json()) as FavoritesApiRes;
      if (!res.ok || !j?.ok) throw new Error(j?.error || "favorites_fetch_failed");

      const rawFavorites = Array.isArray(j.favorites)
        ? j.favorites
        : Array.isArray(j.rows)
        ? j.rows.map((row) => row?.coin_id || "")
        : [];

      setFavoriteSymbols(
        Array.from(
          new Set(rawFavorites.map((value) => normalizeFavoriteSymbol(value)).filter(Boolean))
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setFavoritesLoading(false);
    }
  }

  async function toggleFavorite(symbol: string) {
    const normalizedSymbol = normalizeFavoriteSymbol(symbol);
    if (!normalizedSymbol) return;

    const token = String(authToken || getClientAuthToken() || "").trim();
    if (token && token !== authToken) setAuthToken(token);

    const active = favoriteSet.has(normalizedSymbol);
    setFavoriteBusySymbol(normalizedSymbol);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/me/favorites", {
        method: active ? "DELETE" : "POST",
        headers,
        body: JSON.stringify({ coinId: normalizedSymbol }),
      });
      const j = (await res.json()) as FavoritesApiRes;
      if (!res.ok || !j?.ok) throw new Error(j?.error || "favorite_toggle_failed");

      setFavoriteSymbols((prev) => {
        const next = new Set(prev.map((value) => normalizeFavoriteSymbol(value)).filter(Boolean));
        if (active) next.delete(normalizedSymbol);
        else next.add(normalizedSymbol);
        return Array.from(next);
      });
    } catch (error) {
      console.error(error);
    } finally {
      setFavoriteBusySymbol(null);
    }
  }

  useEffect(() => {
    setSortKey(defaultSortKey(marketType));
    setActiveInfoKey(null);
  }, [marketType]);

  useEffect(() => {
    const token = getClientAuthToken();

    let hasLocalAuth = false;
    try {
      if (typeof window !== "undefined") {
        hasLocalAuth = !!(
          window.localStorage.getItem("cain_user") ||
          window.localStorage.getItem("cain_token")
        );
      }
    } catch {
      hasLocalAuth = false;
    }

    setAuthToken(token);
    setIsLoggedIn(!!token || hasLocalAuth);
    setAuthChecked(true);
    void loadFavorites(token);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(opts?: { silent?: boolean }) {
      const silent = !!opts?.silent;

      if (!hasLoadedRef.current) setLoading(true);
      else if (silent) setRefreshing(true);

      try {
        if (marketType === "spot") {
          const [indicatorsRes, marketsRes] = await Promise.all([
            fetch(pmApi(`/indicators?type=spot`)),
            fetch(pmApi(`/markets?currency=krw&limit=400&offset=0&only_live=0`)),
          ]);

          const indicatorsJson = (await indicatorsRes.json()) as ApiRes;
          const marketsJson = (await marketsRes.json()) as MarketsV2Res;

          if (!indicatorsRes.ok || !indicatorsJson?.ok || !marketsRes.ok || !marketsJson?.ok) {
            throw new Error("fetch_failed");
          }

          const indicatorArr = Array.isArray(indicatorsJson?.payload?.items)
            ? indicatorsJson.payload.items
            : Object.values(indicatorsJson?.payload?.indicators || {});

          const marketArr = Array.isArray(marketsJson.items) ? marketsJson.items : [];
          const arr = mergeSpotIndicatorsWithMarkets(indicatorArr, marketArr);

          if (!cancelled) {
            setItems(arr);
            hasLoadedRef.current = true;
          }
          return;
        }

        const res = await fetch(pmApi(`/indicators?type=${encodeURIComponent(marketType)}`));
        const j = (await res.json()) as ApiRes;
        if (!j?.ok) throw new Error("fetch_failed");

        const arr = Array.isArray(j?.payload?.items)
          ? j.payload.items
          : Object.values(j?.payload?.indicators || {});

        if (!cancelled) {
          setItems(arr);
          hasLoadedRef.current = true;
        }
      } catch {
        if (!cancelled && !hasLoadedRef.current) {
          setItems([]);
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
    const t = setInterval(() => load({ silent: true }), 10_000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [marketType]);

  const fxFallback = useMemo(() => getFxFallback(items), [items]);

  const filtered = useMemo(() => {
    const keyword = q.trim().toUpperCase();
    const searched = keyword
      ? items.filter((x) => {
          const sym = String(x.symbol || "").toUpperCase();
          const nm = String(x.rank_name || "").toUpperCase();
          return sym.includes(keyword) || nm.includes(keyword);
        })
      : items;

    const base = favoritesOnly
      ? searched.filter((item) => favoriteSet.has(normalizeFavoriteSymbol(item.symbol)))
      : searched;

    return sortIndicators(base, marketType, sortKey, fxFallback, favoriteSet);
  }, [items, q, marketType, sortKey, fxFallback, favoritesOnly, favoriteSet]);

  return (
    <div className="space-y-6">
      {authChecked && !isLoggedIn ? <PremiumBanner /> : null}

      <section className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--brand)]">CAIN 지표</h1>
            </div>

            {refreshing ? (
              <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[11px] opacity-80">
                새로고침 중…
              </span>
            ) : null}
          </div>

          <TypeTabs type={marketType} />
          <p className="text-sm opacity-70">{typeDescription(marketType)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr,240px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="심볼 검색 (예: BTC, ETH, XRP)"
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none"
            />

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none"
            >
              {sortOptions(marketType).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] transition ${
                favoritesOnly
                  ? "border-[color:rgba(0,229,255,0.45)] bg-[color:rgba(0,229,255,0.12)] text-[var(--brand)]"
                  : "border-white/10 bg-black/60 text-white/70 hover:text-white"
              }`}
            >
              {favoritesOnly ? "★ 즐겨찾기만" : "☆ 즐겨찾기만"}
            </button>

            {favoriteSymbols.length ? (
              <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] text-white/70">
                {favoriteSymbols.length}개
              </span>
            ) : null}

            {favoritesLoading ? (
              <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] text-white/70">
                즐겨찾기 불러오는 중…
              </span>
            ) : null}

            {favoriteBusySymbol ? (
              <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] text-white/70">
                저장 중…
              </span>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 md:hidden">
              <span className="text-[11px] text-white/60">가격 단위</span>
              <CurrencyInlineToggle value={currencyMode} onChange={setCurrencyMode} />
              {marketType === "domestic-global" ? (
                <>
                  <span className="ml-2 text-[11px] text-white/60">괴리 표시</span>
                  <MiniModeToggle
                    value={premiumDisplayMode}
                    leftLabel="%"
                    rightLabel="₩"
                    onChange={setPremiumDisplayMode}
                  />
                </>
              ) : null}
              {marketType === "futures-spot" ? (
                <>
                  <span className="ml-2 text-[11px] text-white/60">베이시스 표시</span>
                  <MiniModeToggle
                    value={basisDisplayMode}
                    leftLabel="%"
                    rightLabel="₩"
                    onChange={setBasisDisplayMode}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {loading && !items.length ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm opacity-70">
          {typeLabel(marketType)} 데이터를 불러오는 중입니다…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm opacity-70">
          조건에 맞는 코인이 없습니다.
        </div>
      ) : isDesktopViewport ? (
        <DesktopTable
          items={filtered}
          type={marketType}
          currencyMode={currencyMode}
          setCurrencyMode={setCurrencyMode}
          premiumDisplayMode={premiumDisplayMode}
          setPremiumDisplayMode={setPremiumDisplayMode}
          basisDisplayMode={basisDisplayMode}
          setBasisDisplayMode={setBasisDisplayMode}
          spotChangeMode={spotChangeMode}
          setSpotChangeMode={setSpotChangeMode}
          spotSizeMode={spotSizeMode}
          setSpotSizeMode={setSpotSizeMode}
          activeInfoKey={activeInfoKey}
          setActiveInfoKey={setActiveInfoKey}
          fxFallback={fxFallback}
          favoriteSet={favoriteSet}
          favoriteBusySymbol={favoriteBusySymbol}
          onToggleFavorite={toggleFavorite}
        />
      ) : (
        <MobileCards
          items={filtered}
          type={marketType}
          currencyMode={currencyMode}
          premiumDisplayMode={premiumDisplayMode}
          basisDisplayMode={basisDisplayMode}
          spotChangeMode={spotChangeMode}
          spotSizeMode={spotSizeMode}
          fxFallback={fxFallback}
          favoriteSet={favoriteSet}
          favoriteBusySymbol={favoriteBusySymbol}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}