"use client";

import { useEffect, useRef } from "react";

export default function TickerTape() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "BINANCE:BTCUSDT", title: "BTC" },
        { proName: "BINANCE:ETHUSDT", title: "ETH" },
        { proName: "BINANCE:SOLUSDT", title: "SOL" },
        { proName: "BINANCE:XRPUSDT", title: "XRP" },
        { proName: "BINANCE:BNBUSDT", title: "BNB" },
      ],
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "kr",
    });
    ref.current.appendChild(script);
  }, []);
  return <div className="tradingview-widget-container" ref={ref} />;
}
