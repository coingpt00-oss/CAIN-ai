// src/lib/clientCache.ts
// 브라우저 로컬 캐시 (markets + coin detail/tickers 간단 버전)

type Vs = "krw" | "usd";

export type MarketsCache = {
  vs: Vs;
  updatedAt: string; // 워커에서 내려온 시간
  items: any[];      // /api/public/markets 결과
  global: any | null; // /api/public/markets/global 결과
};

// 코인 상세/티커 캐시
export type CoinCacheItem = {
  summary: any | null;
  detail: any | null;
  tickers: any[]; // 거래소별 시세
  chart24h: any | null; // 24h 차트 데이터 (원하면 추가로 1M,3M 등 확장 가능)
  updatedAt: string;
};

type CainCacheShape = {
  markets: {
    krw?: MarketsCache;
    usd?: MarketsCache;
  };
  coins: Record<string, CoinCacheItem>; // key: `${coinId}_${vs}`
};

const STORAGE_KEY = "cain_cache_v1";

function readStorage(): CainCacheShape {
  if (typeof window === "undefined") {
    return { markets: {}, coins: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { markets: {}, coins: {} };
    return JSON.parse(raw) as CainCacheShape;
  } catch {
    return { markets: {}, coins: {} };
  }
}

function writeStorage(data: CainCacheShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 용량 초과 등은 무시
  }
}

// ─────────────────────────────────────
// ① 마켓 리스트 + 글로벌 메타 캐시
//   - 최대 3분까지만 새로 가져오고
//   - 그 안에서는 API 재호출 안 함
// ─────────────────────────────────────
export async function getMarketsCache(vs: Vs): Promise<MarketsCache | null> {
  const cache = readStorage();
  const existed = cache.markets[vs];

  // 이미 있고, 3분 이내면 그대로 사용
  if (existed) {
    const ageMs = Date.now() - new Date(existed.updatedAt).getTime();
    if (ageMs < 3 * 60 * 1000) {
      return existed;
    }
  }

  // 없거나 오래된 경우 → Next API 한 번만 호출
  const [gRes, lRes] = await Promise.all([
    fetch(`/api/public/markets?global=1&vs=${vs}`, { cache: "no-store" }),
    fetch(`/api/public/markets?vs=${vs}&per_page=250&sparkline=0`, {
      cache: "no-store",
    }),
  ]);

  const g = await gRes.json();
  const l = await lRes.json();

  const data: MarketsCache = {
    vs,
    updatedAt: l?.updatedAt || new Date().toISOString(),
    items: l?.ok && Array.isArray(l.items) ? l.items : [],
    global: g?.ok ? g.data ?? null : null,
  };

  cache.markets[vs] = data;
  writeStorage(cache);
  return data;
}

// ─────────────────────────────────────
// ② 코인 상세 + 티커 + 차트 캐시
//   - 코인별/통화별 최초 1회만 API 호출
//   - 이후 왔다갔다 할 때는 로컬만 사용
// ─────────────────────────────────────
export async function getCoinCache(
  coinId: string,
  vs: Vs,
): Promise<CoinCacheItem | null> {
  const key = `${coinId}_${vs}`;
  const cache = readStorage();
  const existed = cache.coins[key];

  // 3분 이내면 그대로 사용
  if (existed) {
    const ageMs = Date.now() - new Date(existed.updatedAt).getTime();
    if (ageMs < 3 * 60 * 1000) {
      return existed;
    }
  }

  // 없거나 오래된 경우 → 서버 API 한 번씩 호출
  const qs = `id=${encodeURIComponent(coinId)}&vs=${vs}`;

  const [summaryRes, detailRes, tickersRes, chartRes] = await Promise.all([
    fetch(`/api/public/coin/summary?${qs}`, { cache: "no-store" }),
    fetch(`/api/public/coin/detail?${qs}`, { cache: "no-store" }),
    fetch(`/api/public/coin/tickers?id=${encodeURIComponent(coinId)}`, {
      cache: "no-store",
    }),
    fetch(`/api/public/coin/${encodeURIComponent(coinId)}/chart?range=24h&vs=${vs}`, {
      cache: "no-store",
    }),
  ]);

  const summaryJson = await summaryRes.json().catch(() => null);
  const detailJson = await detailRes.json().catch(() => null);
  const tickersJson = await tickersRes.json().catch(() => null);
  const chartJson = await chartRes.json().catch(() => null);

  const item: CoinCacheItem = {
    summary: summaryJson?.ok ? summaryJson.data ?? null : null,
    detail: detailJson?.ok ? detailJson.data ?? null : null,
    tickers: tickersJson?.ok && Array.isArray(tickersJson.items)
      ? tickersJson.items
      : [],
    chart24h: chartJson?.ok ? chartJson : null,
    updatedAt: new Date().toISOString(),
  };

  cache.coins[key] = item;
  writeStorage(cache);
  return item;
}
