// src/app/events/[id]/EventDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AiBox from "@/components/ai/AiBox"; // ✅ 추가

type EventItem = {
  id: string;
  source: string | null;
  title: string | null;
  url: string | null;
  categories: string[] | null;
  published_at: string | null;
  created_at: string | null;
};

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
    const raw = item?.published_at || item?.created_at || "";
    return raw ? raw.replace("T", " ").slice(0, 19) : "";
  }, [item]);

  // ✅ AI로 보낼 컨텍스트(핵심만)
  const aiContext = useMemo(() => {
    if (!item) return null;
    return {
      type: "event",
      id: item.id,
      source: item.source,
      title: item.title,
      categories: item.categories ?? [],
      url: item.url,
      published_at: item.published_at,
      created_at: item.created_at,
    };
  }, [item]);

  return (
    <main className="w-full px-3 md:px-5 py-8">
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
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-white/50">
                    {item.source || "unknown"} · {timeText}
                  </div>
                  <h1 className="text-xl md:text-2xl font-semibold text-white">
                    {item.title || "(제목 없음)"}
                  </h1>
                </div>

                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full border border-[var(--brand)]/40 bg-black px-4 py-2 text-sm text-[var(--brand)] hover:bg-black/60"
                  >
                    거래소 공지 보기
                  </a>
                ) : null}
              </div>

              {item.categories?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 text-sm text-white/70">
                (상세 본문/요약은 추후 붙이면 됩니다. 지금은 데이터-라우팅 정상화가 우선입니다.)
              </div>
            </div>

            {/* ✅ AI 분석 박스 추가 */}
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
