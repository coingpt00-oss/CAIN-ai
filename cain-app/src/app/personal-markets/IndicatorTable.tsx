// src/app/personal-markets/IndicatorTable.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type PriceDisplayMode = "krw" | "usd";

type Indicator = {
  symbol: string;
  kimchi_premium: number;
  dominance: "KR" | "GLOBAL";
  volatility_warn: boolean;
  volatility_ratio: number;
  dispersion_krw: number;
  delay_proxy: number;
  score: number;
  futures_basis_pct: number | null;
  kimchi_trend?: "up" | "flat" | "down";
  market_cap_rank?: number | null;
  icon_url?: string | null;
  global_avg_usd?: number | null;
  korea_avg_krw?: number | null;
};

type InfoKey =
  | "price"
  | "importance"
  | "kimchi"
  | "dominance"
  | "volatility"
  | "dispersion"
  | "basis"
  | "reliability"
  | `importance-badge-${string}`
  | `reliability-badge-${string}`;

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(v: any, digits = 2) {
  const x = n(v);
  return `${x.toFixed(digits)}%`;
}

function money(v: any) {
  const x = Math.round(n(v));
  return x.toLocaleString();
}

function formatUsd(v: any) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";

  return `$${x.toLocaleString(undefined, {
    minimumFractionDigits: x >= 1 ? 2 : 4,
    maximumFractionDigits: x >= 1 ? 2 : 4,
  })}`;
}

function formatKrw(v: any) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "-";
  return `₩${Math.round(x).toLocaleString()}`;
}

function kimchiArrow(t?: "up" | "flat" | "down") {
  if (t === "up") return "↗";
  if (t === "down") return "↘";
  return "→";
}

function kimchiColor(v: any) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "";
  if (x < 0) return "text-red-300";
  if (x > 0) return "text-sky-300";
  return "";
}

function importanceMeta(score: number) {
  if (score >= 80) {
    return {
      text: "매우높음",
      cls: "bg-red-900/30 border-red-700/40 text-red-200",
      desc: "여러 신호가 동시에 강하게 나타난 상태입니다. 지금 가장 먼저 볼 가치가 큰 코인입니다.",
    };
  }
  if (score >= 50) {
    return {
      text: "높음",
      cls: "bg-orange-900/25 border-orange-700/40 text-orange-200",
      desc: "의미 있는 이상 신호가 비교적 뚜렷합니다. 우선 확인할 가치가 높습니다.",
    };
  }
  if (score >= 25) {
    return {
      text: "관찰",
      cls: "bg-yellow-900/20 border-yellow-700/30 text-yellow-200",
      desc: "아직 강한 경고는 아니지만 흐름을 계속 지켜볼 필요가 있는 상태입니다.",
    };
  }
  return {
    text: "낮음",
    cls: "bg-emerald-900/20 border-emerald-700/30 text-emerald-200",
    desc: "현재는 특이점이 크지 않습니다. 우선순위는 낮지만, 시장 상황에 따라 바뀔 수 있습니다.",
  };
}

function reliabilityMeta(x: Indicator) {
  const vol = Math.abs(n(x.volatility_ratio));
  const basis = Math.abs(n(x.futures_basis_pct));
  const kimchi = Math.abs(n(x.kimchi_premium));
  const dispersion = Math.abs(n(x.dispersion_krw));

  let risk = 0;

  if (vol >= 0.12) risk += 2;
  else if (vol >= 0.06) risk += 1;

  if (basis >= 0.12) risk += 2;
  else if (basis >= 0.05) risk += 1;

  if (kimchi >= 1.5) risk += 1;
  else if (kimchi >= 0.8) risk += 0.5;

  if (dispersion >= 100000) risk += 1;
  else if (dispersion >= 10000) risk += 0.5;

  if (risk <= 1) {
    return {
      text: "높음",
      cls: "bg-emerald-900/20 border-emerald-700/30 text-emerald-200",
      desc: "거래소 간 가격 합의가 비교적 안정적입니다. 현재 구조를 해석하기에 무리가 적은 편입니다.",
    };
  }

  if (risk <= 2.5) {
    return {
      text: "보통",
      cls: "bg-yellow-900/20 border-yellow-700/30 text-yellow-200",
      desc: "대체로 참고 가능하지만 일부 괴리나 불안정 요소가 있습니다. 해석 시 주의가 필요합니다.",
    };
  }

  return {
    text: "낮음",
    cls: "bg-red-900/25 border-red-700/40 text-red-200",
    desc: "거래소 간 괴리나 변동이 커서 현재 구조 해석 신뢰도가 떨어질 수 있습니다.",
  };
}

const INFO_TEXT: Record<
  Exclude<
    InfoKey,
    `importance-badge-${string}` | `reliability-badge-${string}`
  >,
  { title: string; body: string }
> = {
  price: {
    title: "평균가",
    body: "KRW 기준은 국내 평균가, USD 기준은 해외 평균가입니다. 버튼을 눌러 표시 기준을 바꿀 수 있습니다.",
  },
  importance: {
    title: "중요도",
    body: "여러 신호를 종합한 우선순위입니다. 높을수록 지금 먼저 볼 가치가 큰 코인입니다.",
  },
  kimchi: {
    title: "김프",
    body: "국내 평균가와 해외 평균가 차이입니다. 음수면 해외가 더 높고, 양수면 국내가 더 높은 상태입니다.",
  },
  dominance: {
    title: "주도",
    body: "현재 가격 흐름을 국내와 해외 중 어느 쪽이 더 강하게 끌고 가는지 보여줍니다.",
  },
  volatility: {
    title: "변동성",
    body: "거래소 간 가격 흔들림 정도입니다. 높을수록 가격 합의가 약하거나 해석 난도가 올라갈 수 있습니다.",
  },
  dispersion: {
    title: "분산도",
    body: "거래소별 가격 차이입니다. 값이 클수록 거래소 간 가격 합의가 약하다는 뜻입니다.",
  },
  basis: {
    title: "선물베이시스",
    body: "현물 대비 선물 가격 차이입니다. 양수면 선물이 더 비싸고, 음수면 선물이 더 싼 상태입니다.",
  },
  reliability: {
    title: "신뢰도",
    body: "현재 가격 구조를 얼마나 안정적으로 해석할 수 있는지 보여줍니다. 높을수록 현재 판을 읽기 수월합니다.",
  },
};

function InfoButton({
  infoKey,
  openKey,
  setOpenKey,
  title,
  body,
  align = "center",
}: {
  infoKey: InfoKey;
  openKey: InfoKey | null;
  setOpenKey: React.Dispatch<React.SetStateAction<InfoKey | null>>;
  title: string;
  body: string;
  align?: "center" | "right";
}) {
  const isOpen = openKey === infoKey;

  const popupPositionClass =
    align === "right"
      ? "absolute right-0 top-6"
      : "absolute left-1/2 top-6 -translate-x-1/2";

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`${title} 설명`}
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey((prev) => (prev === infoKey ? null : infoKey));
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400/30 bg-black/90 text-[10px] font-semibold text-cyan-300 hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-cyan-200"
      >
        ?
      </button>

      {isOpen ? (
        <div
          className={`${popupPositionClass} z-30 w-64 rounded-xl border border-cyan-400/30 bg-black p-3 text-left shadow-2xl`}
        >
          <div className="mb-1 text-xs font-semibold text-cyan-300">{title}</div>
          <div className="text-[11px] leading-5 text-cyan-100">{body}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function IndicatorTable({
  loading,
  items,
  priceDisplayMode,
  onTogglePriceDisplayMode,
}: {
  loading: boolean;
  items: Indicator[];
  priceDisplayMode: PriceDisplayMode;
  onTogglePriceDisplayMode: () => void;
}) {
  const [openKey, setOpenKey] = useState<InfoKey | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const headerInfo = useMemo(
    () => ({
      price: INFO_TEXT.price,
      importance: INFO_TEXT.importance,
      kimchi: INFO_TEXT.kimchi,
      dominance: INFO_TEXT.dominance,
      volatility: INFO_TEXT.volatility,
      dispersion: INFO_TEXT.dispersion,
      basis: INFO_TEXT.basis,
      reliability: INFO_TEXT.reliability,
    }),
    []
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/80">
        로딩 중…
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="overflow-hidden rounded-2xl border border-white/10 bg-black/30"
    >
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-sm">
          <thead className="bg-black/40 text-xs text-white/80">
            <tr>
              <th className="px-4 py-3 text-left">코인</th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onTogglePriceDisplayMode}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/5"
                  >
                    <span>평균가</span>
                    <span className="text-[10px] text-white/60">
                      {priceDisplayMode === "krw" ? "▼ KRW" : "▼ USD"}
                    </span>
                  </button>
                  <InfoButton
                    infoKey="price"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.price.title}
                    body={headerInfo.price.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>중요도</span>
                  <InfoButton
                    infoKey="importance"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.importance.title}
                    body={headerInfo.importance.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>김프</span>
                  <InfoButton
                    infoKey="kimchi"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.kimchi.title}
                    body={headerInfo.kimchi.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>주도</span>
                  <InfoButton
                    infoKey="dominance"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.dominance.title}
                    body={headerInfo.dominance.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>변동성</span>
                  <InfoButton
                    infoKey="volatility"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.volatility.title}
                    body={headerInfo.volatility.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>분산도</span>
                  <InfoButton
                    infoKey="dispersion"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.dispersion.title}
                    body={headerInfo.dispersion.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>선물베이시스</span>
                  <InfoButton
                    infoKey="basis"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.basis.title}
                    body={headerInfo.basis.body}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center">
                  <span>신뢰도</span>
                  <InfoButton
                    infoKey="reliability"
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    title={headerInfo.reliability.title}
                    body={headerInfo.reliability.body}
                    align="right"
                  />
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((x) => {
              const score = Math.round(n(x.score));
              const importance = importanceMeta(score);
              const reliability = reliabilityMeta(x);
              const kimchiCls = kimchiColor(x.kimchi_premium);

              const importanceInfoKey = `importance-badge-${x.symbol}` as const;
              const reliabilityInfoKey = `reliability-badge-${x.symbol}` as const;

              return (
                <tr
                  key={x.symbol}
                  className="border-t border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/personal-markets/${encodeURIComponent(x.symbol)}`}
                      className="block"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/50">
                          {x.icon_url ? (
                            <img
                              src={x.icon_url}
                              alt={x.symbol}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white/70">
                              {x.symbol.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-cyan-200">{x.symbol}</div>
                          <div className="text-[11px] text-white/70">
                            클릭 → 상세(11개 지표)
                          </div>
                        </div>
                      </div>
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <div className="font-semibold">
                      {priceDisplayMode === "krw"
                        ? formatKrw(x.korea_avg_krw)
                        : formatUsd(x.global_avg_usd)}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <div className="relative inline-flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKey((prev) =>
                            prev === importanceInfoKey ? null : importanceInfoKey
                          );
                        }}
                        className={`inline-block rounded-full border px-2 py-1 text-xs ${importance.cls}`}
                      >
                        {importance.text}
                      </button>

                      {openKey === importanceInfoKey ? (
                        <div className="absolute top-9 z-30 w-64 rounded-xl border border-cyan-400/30 bg-black p-3 text-left shadow-2xl">
                          <div className="mb-1 text-xs font-semibold text-cyan-300">
                            중요도 · {importance.text}
                          </div>
                          <div className="text-[11px] leading-5 text-cyan-100">
                            {importance.desc}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <span className={`font-semibold ${kimchiCls}`}>
                      {kimchiArrow(x.kimchi_trend)} {pct(x.kimchi_premium, 2)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <span className="inline-flex min-w-[46px] justify-center rounded-full border border-white/10 bg-black/50 px-2 py-1 text-xs">
                      {x.dominance === "KR" ? "국내" : "해외"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <span className={x.volatility_warn ? "text-red-300" : ""}>
                      {pct(x.volatility_ratio, 3)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    {money(x.dispersion_krw)}
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    {x.futures_basis_pct == null ? "-" : pct(x.futures_basis_pct, 3)}
                  </td>

                  <td className="px-4 py-3 text-center align-middle">
                    <div className="relative inline-flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKey((prev) =>
                            prev === reliabilityInfoKey ? null : reliabilityInfoKey
                          );
                        }}
                        className={`inline-block rounded-full border px-2 py-1 text-xs ${reliability.cls}`}
                      >
                        {reliability.text}
                      </button>

                      {openKey === reliabilityInfoKey ? (
                        <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-cyan-400/30 bg-black p-3 text-left shadow-2xl">
                          <div className="mb-1 text-xs font-semibold text-cyan-300">
                            신뢰도 · {reliability.text}
                          </div>
                          <div className="text-[11px] leading-5 text-cyan-100">
                            {reliability.desc}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}