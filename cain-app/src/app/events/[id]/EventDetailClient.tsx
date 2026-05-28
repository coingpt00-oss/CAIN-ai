// src/app/events/[id]/EventDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AiBox from "@/components/ai/AiBox";

type EventItem = {
  id: string;
  source: string | null;
  title: string | null;
  url: string | null;
  categories: string[] | null;
  is_event: boolean | null;

  published_at: string | null;
  modified_at: string | null;
  created_at: string | null;
  updated_at: string | null;

  grade_hint: string | null;
  reward_certainty: string | null;
  reward_type: string | null;
  new_user_only: boolean | null;

  summary_ko: string | null;
  reward_detail: string | null;
  eligibility: string | null;
  period_text: string | null;
  participation_steps: string[] | null;
  risk_note: string | null;
  pre_filter: string | null;
  is_active: boolean | null;
  raw?: any;
};

function clean(v: unknown) {
  return String(v || "").trim();
}

function fmtTime(raw?: string | null) {
  if (!raw) return "";
  try {
    return raw.replace("T", " ").slice(0, 19);
  } catch {
    return String(raw);
  }
}

function sourceLabel(v?: string | null) {
  const s = clean(v).toLowerCase();
  if (s === "bithumb") return "BITHUMB";
  if (s === "upbit") return "UPBIT";
  return s ? s.toUpperCase() : "UNKNOWN";
}

function gradeLabel(v?: string | null) {
  const g = clean(v).toUpperCase();
  if (g === "A") return "A 등급";
  if (g === "B") return "B 등급";
  if (g === "C") return "C 등급";
  return "등급 미정";
}

function rewardCertaintyLabel(v?: string | null) {
  const s = clean(v).toLowerCase();

  if (s === "guaranteed") return "확정 보상";
  if (s === "conditional") return "조건 충족형";
  if (s === "distribution_notice") return "지급/결과 안내";
  if (s === "lottery") return "추첨형";
  if (s === "unknown") return "확인 필요";

  return s || "확인 필요";
}

function rewardTypeLabel(v?: string | null) {
  const s = clean(v).toLowerCase();

  if (s === "trading_mission") return "입금/거래 미션";
  if (s === "coin") return "코인/토큰 지급";
  if (s === "coupon") return "쿠폰/수수료 혜택";
  if (s === "cashback") return "캐시백/리워드";
  if (s === "airdrop") return "에어드랍";
  if (s === "attendance") return "출석/미션";
  if (s === "unknown") return "기타/확인 필요";

  return s || "기타/확인 필요";
}

function isDistributionNotice(item: EventItem) {
  const title = clean(item.title).toLowerCase();
  const pre = clean(item.pre_filter).toLowerCase();
  const certainty = clean(item.reward_certainty).toLowerCase();

  return (
    pre === "distribution_or_result_notice" ||
    certainty === "distribution_notice" ||
    title.includes("지급 안내") ||
    title.includes("지급 완료") ||
    title.includes("지급되었습니다") ||
    title.includes("에어드랍 지급")
  );
}

function statusLabel(item: EventItem) {
  if (isDistributionNotice(item)) return "지급/결과 안내";
  if (item.is_active === true) return "진행 가능";
  return "종료/확인 필요";
}

function statusClass(item: EventItem) {
  if (isDistributionNotice(item)) {
    return "border-blue-400/30 bg-blue-500/10 text-blue-200";
  }
  if (item.is_active === true) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }
  return "border-white/10 bg-white/5 text-white/60";
}

function gradeClass(item: EventItem) {
  const g = clean(item.grade_hint).toUpperCase();

  if (g === "A") return "border-red-400/40 bg-red-500/10 text-red-200";
  if (g === "B") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (g === "C") return "border-yellow-400/30 bg-yellow-500/10 text-yellow-200";

  return "border-white/10 bg-white/5 text-white/60";
}

function defaultSummary(item: EventItem) {
  if (isDistributionNotice(item)) {
    return "이 공지는 이미 진행된 에어드랍이나 리워드의 지급 결과를 안내하는 내용입니다. 현재 신규 참여용 이벤트는 아닐 수 있지만, 기존 참여자에게는 지급 여부와 조건 확인 가치가 있습니다.";
  }

  if (clean(item.reward_type).toLowerCase() === "trading_mission") {
    return "거래소에서 진행 중인 입금·거래 조건형 리워드 이벤트입니다. 참여 전 대상 자산, 거래 조건, 지급 한도, 지급 일정을 원문에서 반드시 확인해야 합니다.";
  }

  return "거래소에서 확인된 이벤트 공지입니다. 참여 전 원문에서 대상, 조건, 기간, 지급 기준을 확인해야 합니다.";
}

function defaultReward(item: EventItem) {
  if (isDistributionNotice(item)) {
    return "이미 진행된 에어드랍 또는 리워드 지급 안내입니다. 실제 지급 수량과 대상은 거래소 원문 기준으로 확인해야 합니다.";
  }

  if (clean(item.reward_type).toLowerCase() === "trading_mission") {
    return "입금, 매도, 거래량 등 조건 충족 시 리워드가 지급될 수 있습니다. 정확한 지급률과 한도는 거래소 공지 기준입니다.";
  }

  return "보상 정보는 거래소 원문 확인이 필요합니다.";
}

function defaultEligibility(item: EventItem) {
  if (item.new_user_only === true) {
    return "신규 회원 또는 특정 조건을 충족한 회원만 대상일 수 있습니다.";
  }

  if (isDistributionNotice(item)) {
    return "스냅샷 시점 또는 기존 이벤트 참여 조건을 충족한 회원이 대상일 수 있습니다.";
  }

  return "거래소 계정 보유 및 이벤트별 대상 조건 충족이 필요할 수 있습니다.";
}

function defaultPeriod(item: EventItem) {
  if (isDistributionNotice(item)) {
    return "지급 안내성 공지입니다. 참여 기간보다는 스냅샷 시점과 지급 완료 여부 확인이 중요합니다.";
  }

  return "이벤트 기간은 거래소 원문 기준으로 확인해야 합니다.";
}

function defaultRisk(item: EventItem) {
  if (isDistributionNotice(item)) {
    return "지급 안내 공지는 신규 참여 기회가 아닐 수 있습니다. 본인이 대상자인지, 지급 수량이 맞는지 거래소 원문과 계정 내역을 확인해야 합니다.";
  }

  if (clean(item.reward_type).toLowerCase() === "trading_mission") {
    return "거래 조건형 이벤트는 수수료, 가격 변동, 조건 미충족, 지급 한도 제한 리스크가 있습니다. 리워드만 보고 무리한 거래를 진행하면 손실이 발생할 수 있습니다.";
  }

  return "참여 전 원문 조건, 국가/계정 제한, 지급 일정, 리스크를 확인해야 합니다.";
}

function defaultSteps(item: EventItem) {
  if (isDistributionNotice(item)) {
    return [
      "거래소 공지 원문을 엽니다.",
      "지급 대상, 스냅샷 시점, 지급 수량 기준을 확인합니다.",
      "본인 계정의 자산/거래 내역에서 지급 여부를 확인합니다.",
      "지급 누락 또는 조건 불일치가 있으면 거래소 고객센터 안내를 확인합니다.",
    ];
  }

  if (clean(item.reward_type).toLowerCase() === "trading_mission") {
    return [
      "거래소 계정에 로그인합니다.",
      "이벤트 원문에서 대상 자산, 입금/거래 조건, 기간을 확인합니다.",
      "조건에 맞게 입금 또는 거래를 진행합니다.",
      "리워드 지급 한도와 지급 일정을 확인합니다.",
      "무리한 거래는 피하고 수수료와 가격 변동 리스크를 계산합니다.",
    ];
  }

  return [
    "거래소 공지 원문을 확인합니다.",
    "대상, 조건, 기간, 지급 기준을 확인합니다.",
    "조건을 충족하는 경우에만 참여합니다.",
    "참여 후 지급 일정과 계정 내역을 확인합니다.",
  ];
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <h2 className="mb-3 text-sm font-semibold text-[var(--brand)]">
        {title}
      </h2>
      <div className="text-sm leading-7 text-white/75">{children}</div>
    </section>
  );
}

export default function EventDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<EventItem | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setErr("");
        setItem(null);

        const res = await fetch(`/api/public/events/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!alive) return;

        if (!json?.ok) {
          setErr(json?.error || "unknown_error");
          return;
        }

        setItem(json.item as EventItem);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e));
      }
    }

    if (!id) {
      setErr("invalid_id");
      return;
    }

    run();

    return () => {
      alive = false;
    };
  }, [id]);

  const timeText = useMemo(() => {
    const raw = item?.published_at || item?.modified_at || item?.created_at || "";
    return fmtTime(raw);
  }, [item]);

  const steps = useMemo(() => {
    if (!item) return [];
    if (Array.isArray(item.participation_steps) && item.participation_steps.length) {
      return item.participation_steps.filter(Boolean);
    }
    return defaultSteps(item);
  }, [item]);

  const aiContext = useMemo(() => {
    if (!item) return null;

    return {
      type: "event",
      id: item.id,
      source: item.source,
      title: item.title,
      url: item.url,
      categories: item.categories ?? [],
      published_at: item.published_at,
      created_at: item.created_at,

      grade_hint: item.grade_hint,
      reward_certainty: item.reward_certainty,
      reward_type: item.reward_type,
      new_user_only: item.new_user_only,
      summary_ko: item.summary_ko,
      reward_detail: item.reward_detail,
      eligibility: item.eligibility,
      period_text: item.period_text,
      participation_steps: item.participation_steps,
      risk_note: item.risk_note,
      pre_filter: item.pre_filter,
      is_active: item.is_active,
    };
  }, [item]);

  return (
    <main className="w-full px-3 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[1200px] space-y-4">
        <Link
          href="/events"
          className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/80 hover:bg-black/55"
        >
          ← 이벤트 목록으로
        </Link>

        {err ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-sm text-red-200">
            상세 로딩 실패: {err}
          </div>
        ) : !item ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/70">
            불러오는 중…
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand)]">
                      {sourceLabel(item.source)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${gradeClass(
                        item
                      )}`}
                    >
                      {gradeLabel(item.grade_hint)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                        item
                      )}`}
                    >
                      {statusLabel(item)}
                    </span>
                  </div>

                  <div className="text-xs text-white/45">
                    {timeText ? `${timeText}` : "날짜 확인 필요"}
                  </div>

                  <h1 className="break-words text-xl font-semibold text-white md:text-2xl">
                    {item.title || "(제목 없음)"}
                  </h1>

                  <p className="max-w-4xl text-sm leading-7 text-white/70">
                    {clean(item.summary_ko) || defaultSummary(item)}
                  </p>
                </div>

                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full border border-[var(--brand)]/40 bg-black px-4 py-2 text-center text-sm font-semibold text-[var(--brand)] hover:bg-black/60"
                  >
                    거래소 공지 보기
                  </a>
                ) : null}
              </div>

              {item.categories?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/65"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard title="이벤트 성격">
                <div className="space-y-2">
                  <p>
                    <span className="text-white/45">보상 확실도: </span>
                    <span className="text-white">
                      {rewardCertaintyLabel(item.reward_certainty)}
                    </span>
                  </p>
                  <p>
                    <span className="text-white/45">보상 유형: </span>
                    <span className="text-white">
                      {rewardTypeLabel(item.reward_type)}
                    </span>
                  </p>
                  <p>
                    <span className="text-white/45">신규 회원 전용: </span>
                    <span className="text-white">
                      {item.new_user_only === true ? "예" : "아니오/확인 필요"}
                    </span>
                  </p>
                </div>
              </InfoCard>

              <InfoCard title="보상/리워드">
                {clean(item.reward_detail) || defaultReward(item)}
              </InfoCard>

              <InfoCard title="대상/조건">
                {clean(item.eligibility) || defaultEligibility(item)}
              </InfoCard>

              <InfoCard title="기간/지급 시점">
                {clean(item.period_text) || defaultPeriod(item)}
              </InfoCard>
            </div>

            <InfoCard title="참여 또는 확인 방법">
              <ol className="list-decimal space-y-2 pl-5">
                {steps.map((step, idx) => (
                  <li key={`${step}-${idx}`}>{step}</li>
                ))}
              </ol>
            </InfoCard>

            <InfoCard title="주의사항">
              {clean(item.risk_note) || defaultRisk(item)}
            </InfoCard>

            <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-5 text-sm leading-7 text-white/70">
              <span className="font-semibold text-[var(--brand)]">CAIN 판단: </span>
              {isDistributionNotice(item)
                ? "이 공지는 신규 참여용 이벤트라기보다 지급/결과 확인용 공지입니다. 기존 참여자라면 지급 조건과 계정 내역을 확인할 가치가 있습니다."
                : item.is_active === true
                ? "현재 참여 가능성이 있는 이벤트로 분류됐습니다. 다만 조건형 리워드는 수수료와 가격 변동 리스크를 반드시 계산한 뒤 참여해야 합니다."
                : "현재 참여 가능 여부가 불명확하거나 종료 가능성이 있습니다. 원문 확인 후 판단해야 합니다."}
            </div>

            {aiContext ? (
              <AiBox
                context={aiContext}
                title="🤖 CAIN AI 분석 (이벤트)"
                buttonLabel="AI로 분석하기"
                placeholder="예) 이 이벤트가 내게 유리한지, 참여 조건/리스크/핵심만 정리해줘"
                helperText="* 이 이벤트의 핵심 메타데이터만 AI에 전달됩니다."
                defaultPrompt="이 이벤트를 참여 관점에서 정리해줘. (1) 대상/조건/기간 (2) 참여 난이도 (3) 리스크/주의점 (4) 기대가치/추천 여부 (5) 한 줄 결론"
                showDebug={false}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}