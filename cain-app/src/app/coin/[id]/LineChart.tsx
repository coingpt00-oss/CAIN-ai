// src/app/coin/[id]/LineChart.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { TRADINGVIEW_MAP } from "@/lib/tradingviewMap";

type Props = {
  coinId: string;
  vs: string; // 화면 라벨용 (USD / KRW 등)
  days?: string; // 지금은 크게 안 쓰지만 타입 유지
};

// days → 기본 interval 힌트 (필요하면 조정 가능)
function mapDaysToInterval(days?: string): string {
  switch (days) {
    case "30":
      return "60"; // 1시간
    case "90":
      return "240"; // 4시간
    case "365":
      return "D"; // 1일
    default:
      return "60"; // 기본 1시간
  }
}

// CoinGecko slug → TradingView full symbol
function resolveTradingViewSymbol(coinId: string): string | null {
  const slug = coinId.toLowerCase();

  // 1) 수동/자동 매핑 우선
  const mapped = TRADINGVIEW_MAP[slug];
  if (mapped) {
    return mapped;
  }

  // 2) fallback: BINANCE:SYMBOLUSDT 패턴으로 추측
  const guessedSymbol =
    slug
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") + "USDT";

  const full = `BINANCE:${guessedSymbol}`;
  console.warn("[TV] no explicit map for", slug, "→ using fallback:", full);
  return full;
}

declare global {
  interface Window {
    TradingView?: any;
  }
}

export default function LineChart({ coinId, vs, days }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerId] = useState(
    () => `tv-chart-${Math.random().toString(36).slice(2)}`
  );
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const interval = mapDaysToInterval(days);
  const fullSymbol = resolveTradingViewSymbol(coinId);

  // ✅ TradingView 스크립트 로딩
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.TradingView) {
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]'
    );
    if (existing) {
      // 이미 로드 중/완료
      existing.addEventListener("load", () => setScriptLoaded(true), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // ✅ 위젯 생성
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!scriptLoaded) return;
    if (!containerRef.current) return;
    if (!fullSymbol) return;

    // 기존 위젯 제거
    containerRef.current.innerHTML = "";

    try {
      // TradingView 위젯 생성
      new window.TradingView!.widget({
        autosize: true,
        symbol: fullSymbol,
        interval, // "60", "240", "D" 등
        timezone: "Etc/UTC",
        theme: "dark",
        style: 1,
        locale: "kr",
        toolbar_bg: "#000000",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        container_id: containerId,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        withdateranges: true,
        details: true,
        studies: [],
      });
    } catch (e) {
      console.error("[TV] widget create error for", fullSymbol, e);
    }
  }, [scriptLoaded, fullSymbol, interval, containerId]);

  // SSR or 심볼 못 찾았을 때
  if (typeof window === "undefined" || !fullSymbol) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
          <span>가격 차트</span>
          <span className="text-[10px] text-white/30">· source: TradingView</span>
        </div>
        <div className="flex h-60 items-center justify-center text-xs text-white/40">
          차트를 준비 중입니다…
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="text-white/70">가격 차트</span>
          <span className="text-[10px] text-white/30">
            · source: TradingView
          </span>
        </div>
        <div className="text-[10px] text-white/35">
          기준 통화: {vs.toUpperCase()}
        </div>
      </div>

      {/* TradingView 차트 컨테이너 */}
      <div className="h-60 rounded-xl bg-black/60">
        <div
          id={containerId}
          ref={containerRef}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
