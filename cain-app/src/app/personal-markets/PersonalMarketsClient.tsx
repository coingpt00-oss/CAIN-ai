// src/app/personal-markets/PersonalMarketsClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import IndicatorTable from "./IndicatorTable";
import { pmApi } from "@/lib/personalMarketsApi";

export type Indicator = {
  symbol: string;
  rate_krw_usd: number;
  kimchi_premium: number;
  dominance: "KR" | "GLOBAL";
  volatility_ratio: number;
  volatility_warn: boolean;
  dispersion_krw: number;
  delay_proxy: number;
  score: number;
  global_avg_usd: number;
  korea_avg_krw: number;
  futures_basis_pct: number | null;
  kimchi_trend?: "up" | "flat" | "down";

  market_cap_rank?: number | null;
  rank_name?: string | null;
  rank_cg_id?: string | null;
  icon_url?: string | null;
  is_ranked?: boolean;
  sort_priority?: number;
};

type ApiRes = {
  ok: boolean;
  ts: string;
  payload: {
    ts: string;
    base_ts: string;
    indicators: Record<string, Indicator>;
    items?: Indicator[];
  };
};

type SortKey = "marketCap" | "score" | "kimchi" | "dispersion" | "vol";
type PriceDisplayMode = "krw" | "usd";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function trendOf(prev: number, next: number): "up" | "flat" | "down" {
  const d = next - prev;
  if (Math.abs(d) < 0.05) return "flat";
  return d > 0 ? "up" : "down";
}

function marketCapRankOf(x: Indicator) {
  const rank = Number(x.market_cap_rank);
  return Number.isFinite(rank) && rank > 0 ? rank : 999999;
}

export default function PersonalMarketsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Indicator[]>([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [priceDisplayMode, setPriceDisplayMode] = useState<PriceDisplayMode>("krw");

  const prevKimchiRef = useRef<Record<string, number>>({});

  async function load(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;

    if (!silent) setLoading(true);

    try {
      const res = await fetch(pmApi("/indicators"), { cache: "no-store" });
      const j = (await res.json()) as ApiRes;
      if (!j.ok) throw new Error("fetch_failed");

      const map = j.payload?.indicators || {};
      const arr = Object.values(map);

      const prevMap = prevKimchiRef.current;
      for (const it of arr) {
        const prev = prevMap[it.symbol];
        if (typeof prev === "number") {
          it.kimchi_trend = trendOf(prev, n(it.kimchi_premium));
        } else {
          it.kimchi_trend = "flat";
        }
        prevMap[it.symbol] = n(it.kimchi_premium);
      }
      prevKimchiRef.current = prevMap;

      arr.sort((a, b) => {
        const aRank = marketCapRankOf(a);
        const bRank = marketCapRankOf(b);
        if (aRank !== bRank) return aRank - bRank;
        return n(b.score) - n(a.score);
      });

      setItems(arr);
    } catch (_e) {
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load({ silent: false });
    const t = setInterval(() => load({ silent: true }), 10_000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase();
    let arr = items;
    if (s) arr = arr.filter((x) => x.symbol.includes(s));

    const sorted = [...arr];
    switch (sortKey) {
      case "marketCap":
        sorted.sort((a, b) => {
          const aRank = marketCapRankOf(a);
          const bRank = marketCapRankOf(b);
          if (aRank !== bRank) return aRank - bRank;
          return n(b.score) - n(a.score);
        });
        break;
      case "score":
        sorted.sort((a, b) => n(b.score) - n(a.score));
        break;
      case "kimchi":
        sorted.sort((a, b) => n(b.kimchi_premium) - n(a.kimchi_premium));
        break;
      case "dispersion":
        sorted.sort((a, b) => n(b.dispersion_krw) - n(a.dispersion_krw));
        break;
      case "vol":
        sorted.sort((a, b) => n(b.volatility_ratio) - n(a.volatility_ratio));
        break;
    }
    return sorted;
  }, [items, q, sortKey]);

  const togglePriceDisplayMode = () => {
    setPriceDisplayMode((prev) => (prev === "krw" ? "usd" : "krw"));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold mb-2 text-[var(--brand)]">
          CAIN 지표
        </h1>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="심볼 검색 (예: BTC, ETH...)"
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none sm:w-56"
            >
              <option value="marketCap">정렬: 시총</option>
              <option value="score">정렬: 중요도</option>
              <option value="kimchi">정렬: 김프</option>
              <option value="dispersion">정렬: 분산도</option>
              <option value="vol">정렬: 변동성</option>
            </select>
          </div>
        </div>
      </section>

      <IndicatorTable
        loading={loading}
        items={filtered}
        priceDisplayMode={priceDisplayMode}
        onTogglePriceDisplayMode={togglePriceDisplayMode}
      />
    </div>
  );
}