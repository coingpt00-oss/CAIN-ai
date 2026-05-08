'use client';

import { useState } from 'react';
import TickerTape from '@/components/TickerTape';
import TVAdvancedChart from '@/components/TVAdvancedChart';

type TvInterval = '1' | '60' | '240' | 'D';

// 퀵 심볼(버튼) 정의
const QUICK_SYMBOLS: { label: string; tv: string }[] = [
  { label: 'BTC', tv: 'BINANCE:BTCUSDT' },
  { label: 'ETH', tv: 'BINANCE:ETHUSDT' },
  { label: 'SOL', tv: 'BINANCE:SOLUSDT' },
  { label: 'XRP', tv: 'BINANCE:XRPUSDT' },
  { label: 'BNB', tv: 'BINANCE:BNBUSDT' },
  { label: 'DOGE', tv: 'BINANCE:DOGEUSDT' },
  { label: 'ADA', tv: 'BINANCE:ADAUSDT' },
  { label: 'AVAX', tv: 'BINANCE:AVAXUSDT' },
  { label: 'TON', tv: 'BINANCE:TONUSDT' },
  { label: 'TRX', tv: 'BINANCE:TRXUSDT' },
];

// 퀵 인터벌(버튼) 정의
const INTERVALS: { label: string; v: TvInterval }[] = [
  { label: '1H', v: '60' },
  { label: '4H', v: '240' },
  { label: '1D', v: 'D' },
];

export default function ChartsPage() {
  const [symbol, setSymbol] = useState<string>(QUICK_SYMBOLS[0].tv);
  const [interval, setInterval] = useState<TvInterval>('60');

  return (
    <div className="space-y-6">
      {/* 상단 섹션 타이틀 */}
      <h1 className="title-brand text-2xl font-semibold">차트</h1>

      {/* 티커(상단 흘러가는 시세 바) */}
      <TickerTape />

      {/* 심볼 스위처 */}
      <div className="flex items-center gap-2">
        {QUICK_SYMBOLS.map((s) => {
          const active = symbol === s.tv;
          return (
            <button
              key={s.tv}
              onClick={() => setSymbol(s.tv)}
              className={`rounded-full px-3 py-1 text-sm border transition
                ${active ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-white/20 text-white/80 hover:text-white'}
              `}
              aria-pressed={active}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 인터벌 스위처 */}
      <div className="flex items-center gap-2">
        {INTERVALS.map((i) => {
          const active = interval === i.v;
          return (
            <button
              key={i.v}
              onClick={() => setInterval(i.v)}
              className={`rounded-full px-3 py-1 text-sm border transition
                ${active ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-white/20 text-white/80 hover:text-white'}
              `}
              aria-pressed={active}
            >
              {i.label}
            </button>
          );
        })}
      </div>

      {/* 메인 차트 */}
      <TVAdvancedChart symbol={symbol} interval={interval} height={680} />

      {/* 출처(권장) */}
      <p className="text-xs text-white/40">
        Charts powered by TradingView.
      </p>
    </div>
  );
}
