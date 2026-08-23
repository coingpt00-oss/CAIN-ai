// src/components/ai/AiBox.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  context: any;
  defaultPrompt?: string;
  title?: string;
  buttonLabel?: string;
  placeholder?: string;
  helperText?: string;
  joinHref?: string;
  joinLabel?: string;
  showDebug?: boolean;
  endpoint?: string;
};

export default function AiBox({
  context,
  defaultPrompt,
  title = "🤖 CAIN AI 분석",
  buttonLabel = "AI로 분석하기",
  placeholder = "예) 핵심 요약 + 영향 + 리스크를 정리해줘",
  helperText = "* 컨텍스트(현재 페이지 핵심 데이터)만 AI에 전달됩니다.",
  joinHref = "/register",
  joinLabel = "회원가입하러 가기 →",
  showDebug = false,
  endpoint = "/api/ai/analyze",
}: Props) {
  const [prompt, setPrompt] = useState(defaultPrompt || "");
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [needJoin, setNeedJoin] = useState(false);

  const neonBtn =
    "rounded-full border bg-white/[0.03] px-4 py-2 text-sm transition " +
    "border-[var(--brand)]/60 text-[var(--brand)] " +
    "hover:bg-white/[0.06] hover:border-[var(--brand)]/90 " +
    "hover:shadow-[0_0_18px_rgba(0,255,255,0.18)] disabled:opacity-60";

  const panel = "rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5";

  const contextPreview = useMemo(() => {
    try {
      const s = JSON.stringify(context, null, 2);
      return s.length > 1200 ? s.slice(0, 1200) + "\n...(truncated)" : s;
    } catch {
      return "context_preview_error";
    }
  }, [context]);

  const run = async () => {
    if (loading) return;

    setLoading(true);
    setError("");
    setText("");
    setNeedJoin(false);

    try {
      const finalPrompt = (prompt || defaultPrompt || "이 데이터 요약해줘").trim();
      if (!finalPrompt) {
        setError("질문/지시문이 비어 있습니다.");
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // ✅ 쿠키 기반 인증 핵심
        body: JSON.stringify({ prompt: finalPrompt, context }),
      });

      if (res.status === 401) {
        setError("회원만 사용할 수 있는 기능입니다.");
        setNeedJoin(true);
        return;
      }

      const j = await res.json().catch(() => null);

      if (res.status === 429) {
        setError(j?.message || "오늘 AI 사용 한도를 초과했습니다.");
        return;
      }

      if (!res.ok || !j?.ok) {
        setError(j?.message || j?.error || `http_${res.status}`);
        return;
      }

      const t = (j?.text || "").toString().trim();
      if (!t) {
        setError("AI 응답 텍스트가 비어 있습니다. (서버 응답 파싱/모델 설정 확인 필요)");
        return;
      }

      setText(t);
    } catch (e: any) {
      setError(e?.message || "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white/80">{title}</div>

        <button onClick={run} className={neonBtn} disabled={loading}>
          {loading ? "분석중…" : buttonLabel}
        </button>
      </div>

      <div className="mt-3">
        <div className="text-xs text-white/50 mb-1">질문/지시문</div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[96px] rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 outline-none focus:border-[var(--brand)]/50"
        />
        {helperText ? <div className="mt-2 text-xs text-white/35">{helperText}</div> : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
          에러: {error}
          {needJoin ? (
            <div className="mt-2">
              <Link
                href={joinHref}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)]/60 px-3 py-1 text-sm text-[var(--brand)] hover:border-[var(--brand)]/90 hover:bg-white/[0.06]"
              >
                {joinLabel}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {text ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white/80 whitespace-pre-line leading-relaxed">
          {text}
        </div>
      ) : null}

      {showDebug ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">
            (디버그) AI로 보내는 컨텍스트 보기
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/60">
            {contextPreview}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
