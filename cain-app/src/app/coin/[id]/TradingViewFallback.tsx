// src/app/coin/[id]/TradingViewFallback.tsx
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView?: any;
  }
}

interface Props {
  symbol: string; // 예: "BINANCE:BTCUSDT" 또는 "KRAKEN:STETHUSD"
}

// 간단 TradingView 차트 위젯
export default function TradingViewFallback({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerId = `tv_${symbol.replace(/[:/]/g, "_")}`;

  useEffect(() => {
    if (!containerRef.current) return;

    // 이미 스크립트가 있으면 재사용
    const existed = document.querySelector(
      'script[src="https://s3.tradingview.com/tv.js"]'
    ) as HTMLScriptElement | null;

    function createWidget() {
      if (!window.TradingView) return;
      new window.TradingView.widget({
        symbol,
        interval: "60",
        timezone: "Asia/Seoul",
        theme: "dark",
        style: "1",
        locale: "kr",
        hide_top_toolbar: true,
        hide_legend: true,
        autosize: true,
        container_id: containerId,
      });
    }

    if (existed) {
      createWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      document.head.appendChild(script);
    }

    return () => {
      // 위젯 정리까지 완벽히 안 해도 됨(페이지 이동 시 자동 정리)
    };
  }, [symbol, containerId]);

  return (
    <div className="w-full h-72 md:h-80 rounded-2xl border border-zinc-800 bg-zinc-950/70">
      <div ref={containerRef} id={containerId} className="w-full h-full" />
    </div>
  );
}
