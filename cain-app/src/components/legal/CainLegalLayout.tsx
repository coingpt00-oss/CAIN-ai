// src/components/legal/CainLegalLayout.tsx
"use client";

import React from "react";

type Props = {
  /** 상단 작은 라벨 (예: "TERMS", "PRIVACY", "NOTICE") */
  label?: string;
  /** 메인 타이틀 (예: "CAIN 이용약관 (Terms of Service)") */
  title: string;
  /** 타이틀 아래 한 줄 설명 */
  subtitle?: string;
  /** 본문 내용 섹션들 */
  children: React.ReactNode;
};

export function CainLegalLayout({
  label,
  title,
  subtitle,
  children,
}: Props) {
  return (
    <main className="min-h-[calc(100vh-120px)] bg-black text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 md:py-14">
        <section className="text-sm leading-relaxed space-y-8">
          {/* 상단 헤더 - CainTerms 스타일 그대로 */}
          <header className="mb-6 border-b border-white/5 pb-5">
            {label && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                {label}
              </p>
            )}
            <h1 className="mt-1 text-xl font-semibold text-[var(--brand)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-xs text-zinc-400">
                {subtitle}
              </p>
            )}
          </header>

          {/* 본문 영역 – 각 페이지에서 넘겨준 섹션들 */}
          <div className="space-y-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
