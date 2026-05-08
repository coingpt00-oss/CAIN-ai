// src/components/legal/CainAiNotice.tsx
"use client";

import React from "react";
import { CainLegalLayout } from "./CainLegalLayout";

export default function CainAiNotice() {
  return (
    <CainLegalLayout
      title="AI 서비스 안내"
      subtitle="CAIN의 AI 기능 이용과 관련된 한계, 책임 범위 및 유의사항을 안내합니다."
    >
      <section className="space-y-8 text-sm leading-relaxed text-zinc-200">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            1. AI 기능의 성격
          </h2>
          <p className="mt-2">
            CAIN의 AI 기능(질의응답, 요약, 분석, 시나리오 생성 등)은 통계적
            모델과 학습 데이터를 기반으로 한{" "}
            <strong>자동 생성 콘텐츠</strong>이며, 항상 정확하거나 완전하지
            않을 수 있사옵니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            2. 금융·법률·세무 자문 아님
          </h2>
          <p className="mt-2">
            AI 출력은 참고용 의견일 뿐, 금융·투자·법률·세무·회계 등 전문 자문이
            아니며, <strong>투자 권유 또는 리딩 행위로 해석되어서는 아니되옵니다.</strong>
          </p>
          <p className="mt-2">
            중요한 의사결정이 필요한 경우 반드시 공인된 전문가와 추가 상담을
            받으시길 권고드리옵니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            3. 오류·편향 가능성
          </h2>
          <p className="mt-2">
            AI 모델 특성상 정보가 부정확하거나 오래되었을 수 있고, 특정
            데이터셋의 편향이 반영될 수 있사옵니다. CAIN은 AI 출력의 정확성,
            최신성, 적합성을 보증하지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            4. 사용자 책임
          </h2>
          <p className="mt-2">
            AI 출력에 기반한 모든 판단·행동·투자 결정은 전적으로 이용자 본인의
            책임이며, 이로 인한 손실·분쟁에 대해 CAIN은 책임을 지지 아니하옵니다.
          </p>
        </div>
      </section>
    </CainLegalLayout>
  );
}
