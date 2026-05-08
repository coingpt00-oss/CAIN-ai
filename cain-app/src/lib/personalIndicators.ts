// src/lib/personalIndicators.ts
export type IndicatorRow = Record<string, any>;

export type IndicatorPoint = {
  ts: string;
  v: IndicatorRow;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function round(n: number, d = 4) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function pickBest(map: Record<string, number> | null | undefined) {
  const entries = Object.entries(map || {}).filter(([, v]) => typeof v === "number" && v > 0);
  if (!entries.length) return null;

  let best = entries[0];
  let worst = entries[0];
  for (const e of entries) {
    if (e[1] > best[1]) best = e;
    if (e[1] < worst[1]) worst = e;
  }
  return { bestEx: best[0], bestPx: best[1], worstEx: worst[0], worstPx: worst[1] };
}

function avgOf(map: Record<string, number> | null | undefined) {
  const vals = Object.values(map || {}).filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum / vals.length;
}

function spreadOf(map: Record<string, number> | null | undefined) {
  const vals = Object.values(map || {}).filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (vals.length < 2) return null;
  let mx = vals[0];
  let mn = vals[0];
  for (const v of vals) {
    if (v > mx) mx = v;
    if (v < mn) mn = v;
  }
  return mx - mn;
}

/**
 * (11) 보따리꾼 순수익 계산기 (UI 입력 기반)
 */
export function calcPeddlerNet({
  krwBuy,
  globalSellKrw,
  takerFeePctKR = 0.05,
  takerFeePctGlobal = 0.05,
  withdrawFeeKrw = 0,
  fxFeePct = 0,
  slippagePct = 0.03,
}: {
  krwBuy: number;
  globalSellKrw: number;
  takerFeePctKR?: number;
  takerFeePctGlobal?: number;
  withdrawFeeKrw?: number;
  fxFeePct?: number;
  slippagePct?: number;
}) {
  const buyCost = krwBuy * (1 + (takerFeePctKR + slippagePct) / 100);
  const sellProceeds = globalSellKrw * (1 - (takerFeePctGlobal + slippagePct + fxFeePct) / 100);
  const net = sellProceeds - buyCost - withdrawFeeKrw;
  const netPct = buyCost > 0 ? (net / buyCost) * 100 : 0;
  return { net: Math.round(net), netPct: round(netPct, 4) };
}

export function detectStateChange(series: IndicatorPoint[]) {
  if (series.length < 2) return { changed: false, from: null, to: null };

  const prev = series[series.length - 2]?.v;
  const curr = series[series.length - 1]?.v;

  const prevState = classifyState(prev);
  const currState = classifyState(curr);

  return {
    changed: prevState !== currState,
    from: prevState,
    to: currState,
  };
}

export function classifyState(v: IndicatorRow) {
  const score = Number(v?.score ?? 0);
  const kimchi = Number(v?.kimchi_premium ?? 0);
  const vol = Number(v?.volatility_ratio ?? 0);

  if (score >= 75 && Math.abs(kimchi) <= 1.2 && vol <= 0.012) return "CALM_GOOD";
  if (score >= 60 && Math.abs(kimchi) <= 2.5) return "NORMAL";
  if (v?.volatility_warn) return "VOLATILE";
  if (Math.abs(kimchi) >= 5) return "KIMCHI_SPIKE";
  return "WATCH";
}

export function durationConfidence(series: IndicatorPoint[]) {
  if (!series.length) return { minutes: 0, confidence: 0 };

  const latestState = classifyState(series[series.length - 1].v);
  let mins = 0;

  for (let i = series.length - 1; i >= 0; i--) {
    const st = classifyState(series[i].v);
    if (st !== latestState) break;
    mins += 5;
  }

  const conf = clamp(mins / 180, 0, 1);
  return { minutes: mins, confidence: round(conf, 4), state: latestState };
}

export function historicalSimilarity(series: IndicatorPoint[]) {
  if (series.length < 10) return { bestAt: null, distance: null, similarScore: 0 };

  const cur = series[series.length - 1].v;
  const curVec = vec(cur);

  let best = { idx: -1, dist: Number.POSITIVE_INFINITY };

  for (let i = 0; i < series.length - 3; i++) {
    const d = dist(curVec, vec(series[i].v));
    if (d < best.dist) best = { idx: i, dist: d };
  }

  if (best.idx < 0) return { bestAt: null, distance: null, similarScore: 0 };

  const sim = clamp(100 - best.dist * 120, 0, 100);

  return {
    bestAt: series[best.idx].ts,
    distance: round(best.dist, 6),
    similarScore: Math.round(sim),
  };

  function vec(v: IndicatorRow) {
    return [
      Number(v?.kimchi_premium ?? 0) / 10,
      Number(v?.volatility_ratio ?? 0) * 100,
      Number(v?.score ?? 0) / 100,
    ];
  }
  function dist(a: number[], b: number[]) {
    const s = a.reduce((acc, x, k) => acc + (x - b[k]) ** 2, 0);
    return Math.sqrt(s);
  }
}

export function noTradeZone(v: IndicatorRow) {
  let r = 0;
  const kimchi = Math.abs(Number(v?.kimchi_premium ?? 0));
  const vol = Number(v?.volatility_ratio ?? 0);
  const disp = Number(v?.dispersion_krw ?? 0);
  const delay = Number(v?.delay_proxy ?? 0);
  const basis = Math.abs(Number(v?.futures_basis_pct ?? 0));

  if (kimchi >= 3) r += 25;
  if (kimchi >= 5) r += 20;

  if (vol >= 0.012) r += 20;
  if (vol >= 0.018) r += 20;

  if (disp >= 800000) r += 10;
  if (disp >= 1500000) r += 10;

  if (delay >= 0.004) r += 10;
  if (delay >= 0.007) r += 10;

  if (basis >= 1.2) r += 5;
  if (basis >= 2.0) r += 10;

  const score = clamp(Math.round(r), 0, 100);
  return { no_trade_score: score, is_no_trade: score >= 65 };
}

/**
 * 스캐너 rows 만들기 (Top100 리스트)
 * ✅ price/spread는 indicators가 아니라 pricesPayload로 계산
 */
export function buildScannerRows({
  indicators,
  pricesPayload,
  limit = 100,
}: {
  indicators: Record<string, IndicatorRow>;
  pricesPayload: any;
  limit?: number;
}) {
  const fx = Number(pricesPayload?.fx?.krw_per_usd ?? 1350);

  const symbolsAll = Object.keys(indicators);

  const symbols = symbolsAll
    .slice()
    .sort((a, b) => Number(indicators[b]?.score ?? 0) - Number(indicators[a]?.score ?? 0))
    .slice(0, limit);

  const rows = symbols.map((symbol) => {
    const v = indicators[symbol];
    const ntz = noTradeZone(v);
    const state = classifyState(v);

    const kSpot = pricesPayload?.korea?.spot?.[symbol] || null;
    const gSpot = pricesPayload?.global?.spot?.[symbol] || null;

    const kAvg = avgOf(kSpot);
    const gAvg = avgOf(gSpot);

    const displayKrw =
      kAvg && Number.isFinite(kAvg)
        ? Math.round(kAvg)
        : gAvg && Number.isFinite(gAvg)
          ? Math.round(gAvg * fx)
          : 0;

    const domesticSpread = spreadOf(kSpot);
    const globalSpreadUsd = spreadOf(gSpot);
    const globalSpreadKrw = globalSpreadUsd == null ? null : Math.round(globalSpreadUsd * fx);

    return {
      symbol,
      price_krw: displayKrw,

      kimchi_premium: v?.kimchi_premium ?? null,
      dominance: v?.dominance ?? null,

      volatility_warn: v?.volatility_warn ?? null,
      score: v?.score ?? null,

      spread_domestic_krw: domesticSpread == null ? null : Math.round(domesticSpread),
      spread_global_krw: globalSpreadKrw,

      state,
      no_trade_score: ntz.no_trade_score,
      is_no_trade: ntz.is_no_trade,
    };
  });

  return rows;
}

/**
 * 상세 payload 만들기
 */
export function buildDetailPayload({
  symbol,
  latest,
  series,
  pricesPayload,
}: {
  symbol: string;
  latest: IndicatorRow;
  series: IndicatorPoint[];
  pricesPayload: any;
}) {
  const stateChange = detectStateChange(series);
  const duration = durationConfidence(series);
  const similarity = historicalSimilarity(series);
  const ntz = noTradeZone(latest);

  const fx = Number(pricesPayload?.fx?.krw_per_usd ?? latest?.rate_krw_usd ?? 1350);

  const gSpot = pricesPayload?.global?.spot?.[symbol] || null;
  const gFut = pricesPayload?.global?.futures?.[symbol] || null;
  const kSpot = pricesPayload?.korea?.spot?.[symbol] || null;

  const gPick = pickBest(gSpot);
  const kPick = pickBest(kSpot);

  const globalBestKrw = gPick ? gPick.bestPx * fx : null;
  const krBestKrw = kPick ? kPick.bestPx : null;

  const grossEdge = krBestKrw && globalBestKrw ? krBestKrw - globalBestKrw : null;
  const grossPct =
    krBestKrw && globalBestKrw && globalBestKrw > 0
      ? (krBestKrw / globalBestKrw - 1) * 100
      : null;

  // ✅ indicators에 exchanges가 있으면 우선 사용, 없으면 pricesPayload 기반으로 구성
  const evidenceFromLatest = latest?.exchanges ?? null;
  const evidenceFromPrices = pricesPayload
    ? {
        kr_spot_krw: kSpot ?? null,
        global_spot_usd: gSpot ?? null,
        global_futures_usd: gFut ?? null,
      }
    : null;

  const evidence = evidenceFromLatest
    ? {
        kr_spot_krw: evidenceFromLatest?.kr_spot_krw ?? null,
        global_spot_usd: evidenceFromLatest?.global_spot_usd ?? null,
        global_futures_usd: evidenceFromLatest?.global_futures_usd ?? null,
      }
    : evidenceFromPrices;

  return {
    ...latest,

    state_change: stateChange,
    duration_confidence: duration,
    historical_similarity: similarity,
    no_trade_zone: ntz,

    spread_domestic_krw: spreadOf(kSpot),
    spread_global_krw: (() => {
      const s = spreadOf(gSpot);
      return s == null ? null : Math.round(s * fx);
    })(),

    // ✅ 프론트가 거래소별 수치 뽑아쓰기 쉽게 항상 넣어줌
    exchange_evidence: evidence ?? null,

    peddler_material: {
      fx_krw_usd: fx,
      global_best: gPick ? { exchange: gPick.bestEx, price_usd: gPick.bestPx, price_krw: Math.round(globalBestKrw!) } : null,
      global_worst: gPick ? { exchange: gPick.worstEx, price_usd: gPick.worstPx } : null,
      korea_best: kPick ? { exchange: kPick.bestEx, price_krw: Math.round(kPick.bestPx) } : null,
      korea_worst: kPick ? { exchange: kPick.worstEx, price_krw: Math.round(kPick.worstPx) } : null,
      gross_edge_krw: grossEdge == null ? null : Math.round(grossEdge),
      gross_edge_pct: grossPct == null ? null : round(grossPct, 4),
    },

    series: series.map((p) => ({
      ts: p.ts,
      kimchi: p.v?.kimchi_premium ?? null,
      score: p.v?.score ?? null,
      vol: p.v?.volatility_ratio ?? null,
      disp: p.v?.dispersion_krw ?? null,
      delay: p.v?.delay_proxy ?? null,
    })),
  };
}
