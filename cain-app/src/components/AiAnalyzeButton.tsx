// src/components/AiAnalyzeButton.tsx
"use client";

import { useState } from "react";

export default function AiAnalyzeButton({
  context,
  defaultPrompt = "이 페이지 핵심 요약 + 리스크/시나리오 간단 분석",
}: {
  context: any; // 페이지 데이터(뉴스/코인 등)
  defaultPrompt?: string;
}) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: defaultPrompt,
          context, // ✅ 페이지 컨텍스트 통째로 전달
        }),
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "ai_failed");
      alert(j.text);
    } catch (e: any) {
      alert(`AI 호출 실패: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-200 hover:bg-white/5 disabled:opacity-50"
    >
      {loading ? "분석 중..." : "AI로 분석하기"}
    </button>
  );
}
