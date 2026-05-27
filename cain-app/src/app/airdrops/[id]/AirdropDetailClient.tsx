// src/app/airdrops/[id]/AirdropDetailClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { rewardUsdText } from "@/lib/airdropReward";
import AiBox from "@/components/ai/AiBox";

type AirdropRow = {
  id: string;
  created_at: string;
  updated_at: string | null;

  source: string;
  source_id: string | null;

  title: string;
  description_short: string | null;
  summary_ko?: string | null;

  exchange: string | null; // "binance" | "okx" | "bitget" | "bybit"
  grade: string | null;

  reward_usd_lo?: number | null;
  reward_usd_hi?: number | null;
  reward_token?: string | null;
  reward_detail?: string | null;

  link_url?: string | null;
  detail_excerpt?: string | null;
  url?: string | null;

  chain?: string | null;
  countries?: string[] | null;

  kyc_required?: boolean | null;
  task_effort_mins?: number | null;
  claim_eta_days?: number | null;

  start_at?: string | null;
  end_at?: string | null;
  period_text?: string | null;

  eligibility?: string | null;
  participation_steps?: string[] | string | null;
  quality_score?: number | null;
  ai_brief?: any | null;

  risk_note?: string | null;
  pre_filter?: string | null;
  has_reward?: boolean | null;
  is_active?: boolean | null;
  publish_at?: string | null;
  last_checked_at?: string | null;
};

type ApiResponse =
  | { ok: true; item: AirdropRow; updatedAt?: string }
  | { ok: false; error: string; detail?: any };

export const dynamic = "force-dynamic";

function exchangeName(ex: string | null, source: string) {
  const v = (ex || "").toLowerCase();
  if (v === "binance") return "Binance";
  if (v === "okx") return "OKX";
  if (v === "bybit") return "Bybit";
  if (v === "bitget") return "Bitget";

  const s = (source || "").toLowerCase();
  if (s.includes("binance")) return "Binance";
  if (s.includes("okx")) return "OKX";
  if (s.includes("bybit")) return "Bybit";
  if (s.includes("bitget")) return "Bitget";
  return "Exchange";
}

function exchangeKey(ex: string | null, source: string) {
  const v = (ex || "").toLowerCase();
  if (v) return v;

  const s = (source || "").toLowerCase();
  if (s.includes("binance")) return "binance";
  if (s.includes("okx")) return "okx";
  if (s.includes("bybit")) return "bybit";
  if (s.includes("bitget")) return "bitget";
  return "unknown";
}

/** ✅ 목록과 동일: 거래소 텍스트 컬러 */
function exchangeTextClass(exKey: string) {
  switch (exKey) {
    case "binance":
      return "text-[#F0B90B]";
    case "okx":
      return "text-white";
    case "bitget":
      return "text-[#00D1FF]";
    case "bybit":
      return "text-[#7C6BFF]";
    default:
      return "text-white/80";
  }
}

/** ✅ 거래소 배지 배경도 살짝 맞춰주기 */
function exchangePillClass(exKey: string) {
  switch (exKey) {
    case "binance":
      return "border-[#F0B90B]/35 bg-[#F0B90B]/10";
    case "okx":
      return "border-white/20 bg-white/5";
    case "bitget":
      return "border-[#00D1FF]/35 bg-[#00D1FF]/10";
    case "bybit":
      return "border-[#7C6BFF]/35 bg-[#7C6BFF]/10";
    default:
      return "border-white/10 bg-white/5";
  }
}

function gradeBadge(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A") return "bg-red-500/15 text-red-200 border border-red-400/40";
  if (g === "B")
    return "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40";
  if (g === "C")
    return "bg-amber-500/15 text-amber-200 border border-amber-400/40";
  return "bg-slate-700/40 text-slate-200 border border-white/10";
}

function gradeText(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A") return "A 등급";
  if (g === "B") return "B 등급";
  if (g === "C") return "C 등급";
  return "등급 미정";
}

function normalizeText(txt: string | null | undefined) {
  const v = (txt || "").trim();
  if (!v) return "";

  const lower = v.toLowerCase();

  if (
    v === "-" ||
    v === "정보 없음" ||
    v === "정보없음" ||
    v === "정보 없음." ||
    lower === "null" ||
    lower === "undefined" ||
    lower.includes("no data") ||
    lower.includes("unknown") ||
    lower === "n/a"
  ) {
    return "";
  }

  return v;
}

function normalizeRewardText(txt: string) {
  const v = normalizeText(txt);
  if (!v) return "보상 규모는 원문 확인 필요";
  return v;
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function buildPeriodText(item: AirdropRow) {
  const direct = normalizeText(item.period_text);
  if (direct) return direct;

  const start = formatDateTime(item.start_at);
  const end = formatDateTime(item.end_at);

  if (start && end) return `${start} ~ ${end}`;
  if (start) return `${start} 시작`;
  if (end) return `${end} 종료`;

  return "기간 정보는 원문 확인 필요";
}

function normalizeSteps(v: AirdropRow["participation_steps"], exLabel: string) {
  if (Array.isArray(v)) {
    return v.map((x) => String(x || "").trim()).filter(Boolean);
  }

  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];

    // Supabase text[]가 문자열처럼 들어온 경우까지 방어
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((x) => x.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || "").trim()).filter(Boolean);
      }
    } catch {
      // plain text면 아래로 진행
    }

    return trimmed
      .split(/\n|;\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [
    `${exLabel} 계정으로 로그인합니다.`,
    "원문 이벤트 페이지에서 참여 가능 국가, KYC, 기간 조건을 확인합니다.",
    "입금·거래·퀘스트 조건이 있는 경우 손실 위험을 먼저 확인합니다.",
    "보상 지급 기준과 지급 일정을 확인한 뒤 참여 여부를 결정합니다.",
  ];
}

function qualityLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "검증 정보 부족";
  if (score >= 75) return "높음";
  if (score >= 55) return "보통";
  if (score >= 40) return "낮음";
  return "매우 낮음";
}

function qualityClass(score: number | null | undefined) {
  if (score === null || score === undefined) return "text-white/55 border-white/10 bg-white/5";
  if (score >= 75) return "text-emerald-200 border-emerald-400/40 bg-emerald-500/10";
  if (score >= 55) return "text-cyan-200 border-cyan-400/35 bg-cyan-500/10";
  if (score >= 40) return "text-amber-200 border-amber-400/40 bg-amber-500/10";
  return "text-red-200 border-red-400/40 bg-red-500/10";
}

function renderValue(v: string | null | undefined, fallback: string) {
  const n = normalizeText(v);
  return n || fallback;
}

function getAiBriefText(aiBrief: any) {
  if (!aiBrief) return "";

  if (typeof aiBrief === "string") {
    return normalizeText(aiBrief);
  }

  if (typeof aiBrief === "object") {
    const candidates = [
      aiBrief.summary,
      aiBrief.summary_ko,
      aiBrief.conclusion,
      aiBrief.risk,
      aiBrief.note,
    ];

    const picked = candidates.map((x) => normalizeText(String(x || ""))).find(Boolean);
    if (picked) return picked;
  }

  return "";
}

function DetailBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="mb-2 text-xs font-semibold text-white/50">{title}</div>
      <div className="text-sm leading-6 text-white/75">{children}</div>
    </section>
  );
}

export default function AirdropDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<AirdropRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/public/airdrops/${id}`, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) {
          if (!cancelled) {
            setError((json as any)?.error || `http_${res.status}`);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setItem(json.item);
          setLoading(false);
        }
      } catch (err) {
        console.error("[AIRDROP_DETAIL] fetch error", err);
        if (!cancelled) {
          setError("network_error");
          setLoading(false);
        }
      }
    }

    if (id) load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const outUrl = useMemo(() => item?.link_url ?? item?.url ?? null, [item]);

  const exLabel = useMemo(() => (item ? exchangeName(item.exchange, item.source) : ""), [item]);
  const exKey = useMemo(() => (item ? exchangeKey(item.exchange, item.source) : "unknown"), [item]);

  const summaryText = useMemo(() => {
    if (!item) return "";
    return (
      normalizeText(item.summary_ko) ||
      normalizeText(item.description_short) ||
      "자동 수집된 에어드랍 후보입니다. 보상 조건과 참여 가능 여부는 원문에서 최종 확인이 필요합니다."
    );
  }, [item]);

  const rewardText = useMemo(() => {
    if (!item) return "";
    const direct = normalizeText(item.reward_detail);
    if (direct) return direct;

    const raw = rewardUsdText(item as any);
    return normalizeRewardText(raw);
  }, [item]);

  const periodText = useMemo(() => {
    if (!item) return "";
    return buildPeriodText(item);
  }, [item]);

  const eligibilityText = useMemo(() => {
    if (!item) return "";
    return renderValue(
      item.eligibility,
      `${exLabel} 계정 및 KYC 인증이 필요할 수 있습니다. 국가/지역 제한이 있을 수 있으므로 원문 확인이 필요합니다.`
    );
  }, [item, exLabel]);

  const steps = useMemo(() => {
    if (!item) return [];
    return normalizeSteps(item.participation_steps, exLabel);
  }, [item, exLabel]);

  const riskText = useMemo(() => {
    if (!item) return "";
    return renderValue(
      item.risk_note,
      "거래량 조건, 입금 조건, 선물 거래 조건이 포함된 이벤트는 손실 위험이 있습니다. 보상만 보고 참여하지 말고 원문 조건을 반드시 확인하십시오."
    );
  }, [item]);

  const excerpt = useMemo(() => {
    const v = normalizeText(item?.detail_excerpt);
    if (v) return v;
    const d = normalizeText(item?.description_short);
    return d || "";
  }, [item]);

  const aiBriefText = useMemo(() => {
    if (!item) return "";
    return getAiBriefText(item.ai_brief);
  }, [item]);

  // ✅ AI로 보낼 컨텍스트(상세 필드까지 확장)
  const aiContext = useMemo(() => {
    if (!item) return null;
    return {
      type: "airdrop",
      id: item.id,
      source: item.source,
      source_id: item.source_id,
      title: item.title,
      exchange: item.exchange,
      grade: item.grade,
      quality_score: item.quality_score ?? null,
      has_reward: item.has_reward ?? null,
      pre_filter: item.pre_filter ?? null,
      reward_usd_lo: item.reward_usd_lo ?? null,
      reward_usd_hi: item.reward_usd_hi ?? null,
      reward_token: item.reward_token ?? null,
      reward_detail: item.reward_detail ?? null,
      summary_ko: item.summary_ko ?? null,
      eligibility: item.eligibility ?? null,
      period_text: item.period_text ?? null,
      participation_steps: item.participation_steps ?? null,
      risk_note: item.risk_note ?? null,
      description_short: item.description_short ?? null,
      excerpt: excerpt || null,
      url: outUrl,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }, [item, excerpt, outUrl]);

  return (
    <main className="w-full px-4 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[960px] space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/airdrops"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            ← 에어드랍 목록으로
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-6 text-sm text-white/70">
            에어드랍 정보를 불러오는 중입니다…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-5 py-6 text-sm text-red-200">
            에어드랍 정보를 불러오는 중 오류가 발생했습니다. (코드: {error})
          </div>
        )}

        {!loading && !error && item && (
          <>
            <article className="space-y-5 rounded-2xl border border-white/10 bg-gradient-to-br from-black/80 via-black/50 to-cyan-950/30 px-6 py-6">
              <header className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold ${exchangePillClass(
                      exKey
                    )}`}
                  >
                    <span className={exchangeTextClass(exKey)}>{exLabel}</span>
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold ${gradeBadge(
                      item.grade
                    )}`}
                    title="에어드랍 등급"
                  >
                    {gradeText(item.grade)}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold ${qualityClass(
                      item.quality_score
                    )}`}
                    title="자동 수집 품질 점수"
                  >
                    품질 {item.quality_score ?? "미정"}
                    {item.quality_score !== null && item.quality_score !== undefined ? "/100" : ""}
                    <span className="ml-1 text-white/45">· {qualityLabel(item.quality_score)}</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-white md:text-3xl">{item.title}</h1>
                  <p className="text-sm leading-6 text-white/70">{summaryText}</p>
                </div>
              </header>

              <section className="grid gap-4 md:grid-cols-2">
                <DetailBox title="예상 보상">
                  <p className={normalizeText(item.reward_detail) ? "text-emerald-100/90" : "text-white/60"}>
                    {rewardText}
                  </p>
                  {(item.reward_token || item.reward_usd_lo || item.reward_usd_hi) && (
                    <div className="mt-2 text-xs text-white/45">
                      {item.reward_token ? <div>토큰: {item.reward_token}</div> : null}
                      {item.reward_usd_lo || item.reward_usd_hi ? (
                        <div>
                          추정 범위: {item.reward_usd_lo ?? "?"} ~ {item.reward_usd_hi ?? "?"} USD
                        </div>
                      ) : null}
                    </div>
                  )}
                </DetailBox>

                <DetailBox title="참여 조건">
                  <p>{eligibilityText}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/55">
                      KYC:{" "}
                      {item.kyc_required === true
                        ? "필요 가능성 높음"
                        : item.kyc_required === false
                          ? "불필요 또는 미확인"
                          : "원문 확인"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/55">
                      예상 소요:{" "}
                      {item.task_effort_mins ? `${item.task_effort_mins}분 내외` : "원문 확인"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/55">
                      지급 예상:{" "}
                      {item.claim_eta_days ? `${item.claim_eta_days}일 내외` : "원문 확인"}
                    </span>
                  </div>
                </DetailBox>

                <DetailBox title="참여 기간">
                  <p>{periodText}</p>
                </DetailBox>

                <DetailBox title="참여 방법">
                  {steps.length > 0 ? (
                    <ol className="list-decimal space-y-1 pl-4">
                      {steps.map((step, idx) => (
                        <li key={`${idx}-${step}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>참여 방법은 원문 확인이 필요합니다.</p>
                  )}
                </DetailBox>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <DetailBox title="리스크 / 주의사항">
                  <p className="text-amber-100/85">{riskText}</p>
                </DetailBox>

                <DetailBox title="CAIN 자동 판단">
                  {aiBriefText ? (
                    <p>{aiBriefText}</p>
                  ) : (
                    <p>
                      자동 수집 기준으로 공개 가능한 후보입니다. 다만 최종 보상, 지급 조건, 국가 제한은
                      거래소 원문에서 직접 확인해야 합니다.
                    </p>
                  )}
                </DetailBox>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  {outUrl && (
                    <a
                      href={outUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-full border border-[var(--brand)]/60 bg-[var(--brand)]/10 px-4 py-3 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/20 md:w-auto"
                    >
                      거래소 공지 바로가기
                    </a>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-white/45">
                    <div>수집 출처: {item.source}</div>
                    {item.chain ? <div>체인: {item.chain}</div> : null}
                    {item.last_checked_at ? <div>마지막 확인: {formatDateTime(item.last_checked_at)}</div> : null}
                    {item.updated_at ? <div>업데이트: {formatDateTime(item.updated_at)}</div> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-white/50">원문 / 수집 발췌</div>

                  {excerpt ? (
                    <div className="max-h-[260px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-6 text-white/70 whitespace-pre-wrap">
                      {excerpt}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/45">
                      원문 발췌가 아직 없습니다.
                    </div>
                  )}
                </div>
              </section>

              <footer className="border-t border-white/10 pt-4 text-[11px] leading-5 text-white/40">
                ※ CAIN은 에어드랍 정보 제공만 담당하며, 실제 참여 과정에서 발생하는 손실/위험은 사용자 본인 책임입니다.
                보상 규모, 지급 조건, 참여 가능 국가, KYC 조건은 거래소 원문에서 최종 확인하십시오.
              </footer>
            </article>

            {/* ✅ AI 분석 박스 */}
            {aiContext ? (
              <AiBox
                context={aiContext}
                title="🤖 CAIN AI 분석 (에어드랍)"
                buttonLabel="AI로 분석하기"
                placeholder="예) 참여 난이도 / 리스크 / 기대 가치 / 주의할 점을 정리해줘"
                helperText="* 이 에어드랍의 핵심 데이터만 AI에 전달됩니다."
                defaultPrompt="이 에어드랍을 참여 관점에서 요약해줘. (1) 참여 난이도/단계 (2) 리스크/주의점 (3) 기대가치/보상 추정 해석 (4) 한 줄 결론"
                showDebug={false}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}