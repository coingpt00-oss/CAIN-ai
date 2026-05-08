"use client";
import { useEffect, useState } from "react";

// 예: useTicker("btcusdt")
export function useTicker(symbol = "btcusdt") {
  const [tick, setTick] = useState<{ price: number; percent: number } | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      setTick({ price: Number(m.c), percent: Number(m.P) });
    };
    return () => ws.close();
  }, [symbol]);

  return tick;
}
