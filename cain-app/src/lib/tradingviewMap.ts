// src/app/lib/tradingviewMap.ts
// CoinGecko slug(코인 id) → TradingView 심볼 매핑

import { BINANCE_MAP } from "./binanceMap";

/**
 * TRADINGVIEW_MAP:
 *  - key   : CoinGecko slug (예: "bitcoin", "ethereum", "usds")
 *  - value : TradingView 심볼 "EXCHANGE:SYMBOL" (예: "BINANCE:BTCUSDT")
 */
export const TRADINGVIEW_MAP: Record<string, string> = {};

// -------------------------------------------------------------
// 1) 바이낸스에 존재하는 코인들은 자동으로 BINANCE:SYMBOL 매핑
//    예: "bitcoin" -> "BINANCE:BTCUSDT"
// -------------------------------------------------------------
for (const [slug, symbol] of Object.entries(BINANCE_MAP)) {
  const key = slug.toLowerCase();
  if (!TRADINGVIEW_MAP[key]) {
    TRADINGVIEW_MAP[key] = `BINANCE:${symbol}`;
  }
}

// -------------------------------------------------------------
// 2) 바이낸스에는 없지만 TradingView에 존재하는 코인들 (수동 추가)
//    거래소:심볼 형식으로만 넣어주면 바로 차트 작동
// -------------------------------------------------------------

// USDS — Coinbase 기준 심볼
// TradingView 실제 심볼: COINBASE:USDSUSD
TRADINGVIEW_MAP["usds"] = "COINBASE:USDSUSD";

// 예시 추가(필요하면 아래처럼 붙여넣으면 됨):
// TRADINGVIEW_MAP["wrapped-steth"] = "BINANCE:WSTETHUSDT";
// TRADINGVIEW_MAP["bonk"] = "BINANCE:BONKUSDT";
// TRADINGVIEW_MAP["ordi"] = "BINANCE:ORDIUSDT";
// TRADINGVIEW_MAP["taiko"] = "KUCOIN:TAIKOUSDT";
// TRADINGVIEW_MAP["notcoin"] = "BYBIT:NOTUSDT";

