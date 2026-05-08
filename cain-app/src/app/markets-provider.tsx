"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type MarketItem = any; // 나중에 타입 좁혀도 됨
type GlobalInfo = any;

type Snapshot = {
  updatedAt: number;        // ms 기준 타임스탬프
  markets: MarketItem[];    // 시세 리스트
  global: GlobalInfo | null;
};

type MarketsContextValue = {
  snapshot: Snapshot | null;
  loading: boolean;
};

const MarketsContext = createContext<MarketsContextValue>({
  snapshot: null,
  loading: true,
});

const LS_KEY = "cain_markets_snapshot_v1";
const FRESH_MS = 3 * 60 * 1000 - 10 * 1000; // 3분 - 10초 버퍼
const VS = "krw";
const PER_PAGE = 250;

// ─────────────────────────────
// 시세 JSON 한 번 가져와서 Snapshot으로 변환하는 헬퍼
// ─────────────────────────────
async function fetchSnapshot(): Promise<Snapshot | null> {
  try {
    const res = await fetch(
      `/api/public/markets?vs=${VS}&per_page=${PER_PAGE}`,
      {
        // 클라이언트 호출이라 캐시는 크게 상관 없지만
        // 혹시 모를 중간 캐싱 방지용
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`http ${res.status}`);
    }

    const j = await res.json();

    if (!j?.ok) {
      throw new Error(j?.error || "markets_error");
    }

    const next: Snapshot = {
      // 워커에서 ISO 문자열로 내려준다 가정
      updatedAt: j.updatedAt ? Date.parse(j.updatedAt) : Date.now(),
      markets: j.items ?? [],
      // 글로벌 메타는 추후 /api/public/markets-global 붙이면 채우기
      global: null,
    };

    return next;
  } catch (e) {
    // dev 오버레이 뜨지 않게 error 대신 warn 사용
    console.warn("[MarketsProvider] fetchSnapshot failed, fallback to cache", e);
    return null;
  }
}

// ─────────────────────────────
// Provider
// ─────────────────────────────
export function MarketsProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) 처음 진입 시 localStorage에서 먼저 읽기 + 부족하면 서버 한 번 호출
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1-1. localStorage 캐시 확인
        const raw =
          typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

        if (raw) {
          try {
            const parsed: Snapshot = JSON.parse(raw);
            const age = Date.now() - parsed.updatedAt;

            if (age < FRESH_MS) {
              if (!cancelled) {
                setSnapshot(parsed);
                setLoading(false);
              }
              // 신선하면 여기서 끝
              return;
            }
          } catch {
            // 캐시 깨져 있으면 그냥 무시
          }
        }

        // 1-2. 서버에서 최신 스냅샷 한 번 가져오기
        const next = await fetchSnapshot();
        if (!next || cancelled) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        setSnapshot(next);
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_KEY, JSON.stringify(next));
        }
        setLoading(false);
      } catch (e) {
        console.warn("[MarketsProvider] init failed", e);
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) 3분마다 백그라운드에서 갱신 (사용자는 이전 데이터 계속 봄)
  useEffect(() => {
    const id = setInterval(async () => {
      const next = await fetchSnapshot();
      if (!next) return;
      setSnapshot(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      }
    }, FRESH_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <MarketsContext.Provider value={{ snapshot, loading }}>
      {children}
    </MarketsContext.Provider>
  );
}

// ─────────────────────────────
// Hook
// ─────────────────────────────
export function useMarkets() {
  return useContext(MarketsContext);
}
