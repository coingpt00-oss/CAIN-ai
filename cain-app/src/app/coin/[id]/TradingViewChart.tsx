// src/app/coin/[id]/TradingViewChart.tsx
"use client";

import { useEffect, useRef } from "react";
import { BINANCE_MAP } from "@/lib/binanceMap";
import { TRADINGVIEW_MAP } from "@/lib/tradingviewMap";

declare global {
  interface Window {
    TradingView?: any;
  }
}

type TradingViewChartProps = {
  cgId: string; // CoinGecko id (예: "bitcoin", "usds")
  symbol?: string; // 코인 심볼 (예: "btc", "usds")
};

export default function TradingViewChart({
  cgId,
  symbol,
}: TradingViewChartProps) {
  const containerId = `tv-chart-${cgId}`;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!cgId) return;

    const slug = cgId.toLowerCase();
    const upperSym = (symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

    // ─────────────────────────────────────
    // ① TradingView 심볼 결정
    //    1순위: TRADINGVIEW_MAP[slug]
    //    2순위: BINANCE_MAP / "SYMUSDT" → BINANCE:PAIR
    // ─────────────────────────────────────
    let tvSymbol: string | null = null;

    // 1) 명시적으로 지정한 매핑 (예: usds → COINBASE:USDSUSDC)
    const mapped = TRADINGVIEW_MAP[slug];
    if (mapped) {
      tvSymbol = mapped;
    } else {
      // 2) Binance 기준 자동 매핑
      const binancePair =
        BINANCE_MAP[slug] || (upperSym ? `${upperSym}USDT` : null);

      if (binancePair) {
        tvSymbol = `BINANCE:${binancePair}`;
      }
    }

    if (!tvSymbol) {
      console.warn("[TV] no TradingView symbol for", cgId, symbol);
      const el = document.getElementById(containerId);
      if (el) {
        el.innerHTML =
          '<div style="color:#9ca3af;font-size:12px;text-align:center;padding:24px 0;">해당 코인의 TradingView 차트 심볼을 찾지 못했습니다.</div>';
      }
      return;
    }

    function createWidget() {
      if (!window.TradingView) return;
      const el = document.getElementById(containerId);
      if (!el) return;
      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        new window.TradingView.widget({
          symbol: tvSymbol, // 예: "BINANCE:BTCUSDT" 또는 "COINBASE:USDSUSDC"
          interval: "60", // 1시간봉
          container_id: containerId,
          autosize: true,
          timezone: "Asia/Seoul",
          theme: "dark",
          style: "1",
          locale: "kr",
          withdateranges: true,
          range: "1D",
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: true, // ✅ 상세페이지에서도 심볼 바꿔보기 가능
          toolbar_bg: "#020617",
          studies_overrides: {},
        });

        console.log("[TV] widget created for", tvSymbol);
      } catch (e: any) {
        console.error("[TV] widget error", e?.message || e);
      }
    }

    // 스크립트 로드 여부 체크
    if (window.TradingView) {
      createWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        console.log("[TV] script loaded");
        createWidget();
      };
      script.onerror = () => {
        console.error("[TV] script load error");
      };
      document.body.appendChild(script);
    }

    // cleanup
    return () => {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
      initializedRef.current = false;
    };
  }, [cgId, symbol, containerId]);

  return (
    <div className="w-full h-[360px] md:h-[480px] rounded-2xl overflow-hidden border border-[#1f2933] bg-[#020617]">
      <div id={containerId} className="w-full h-full" />
    </div>
  );
}
