// src/components/PremiumBanner.tsx
"use client";

import Link from "next/link";

export default function PremiumBanner() {
  return (
    <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-purple-500/10 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      
      {/* 왼쪽 텍스트 영역 */}
      <div className="space-y-1">
        {/* 작은 라벨 */}
        <div className="inline-flex items-center gap-2 rounded-full bg-black/40 border border-cyan-400/50 px-3 py-1 text-xs text-cyan-200">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          로그인 필요 · CAIN PREMIUM
        </div>

        {/* 제목 */}
        <div className="text-base md:text-lg font-semibold">
          등록 회원 전용 고급 지표 & 거래 리포트
        </div>

        {/* 설명 */}
        <div className="text-xs md:text-sm opacity-80">
          실시간 온체인 지표, 거래소별 체결 강도, 한국인 비중,{" "}
          <span className="text-cyan-300 font-semibold">
            사용자 맞춤 시나리오 분석
          </span>
          을 이 영역에서 제공할 예정입니다.
        </div>
      </div>

      {/* 오른쪽 버튼 영역 */}
      <div className="flex flex-col items-start md:items-end gap-2">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,0.9)]"
        >
          로그인하고 프리미엄 열기
        </Link>

        <div className="text-[11px] opacity-70">
          CAIN 확인가입자에게만 제공되는 전용 기능입니다.
        </div>
      </div>

    </div>
  );
}
