"use client";

import { useEffect, useRef } from "react";

type Props = {
  symbol?: string;       // 예: "BINANCE:BTCUSDT"
  interval?: string;     // "60", "240", "D" 등
  locale?: string;       // "kr", "en"
  height?: number;       // px
};

export default function TVAdvancedChart({
  symbol = "BINANCE:BTCUSDT",
  interval = "60",
  locale = "kr",
  height = 620,
}: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    // 이전 위젯/스크립트 정리
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Asia/Seoul",
      theme: "dark",
      style: "1",
      locale,
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
      ],
    });

    container.current.appendChild(script);
    scriptRef.current = script;

    // 언마운트/리렌더 시 깔끔하게 제거
    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      if (container.current) {
        container.current.innerHTML = "";
      }
    };
  }, [symbol, interval, locale]);

  return (
    <div
      className="w-full rounded-2xl border border-white/10 overflow-hidden"
      style={{ height }}
    >
      <div
        className="tradingview-widget-container h-full"
        ref={container}
      />
    </div>
  );
}
