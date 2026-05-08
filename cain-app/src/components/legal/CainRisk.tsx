// src/components/legal/CainRisk.tsx
"use client";

import React from "react";
import { CainLegalLayout } from "./CainLegalLayout";

export default function CainRisk() {
  return (
    <CainLegalLayout
      title="리스크 & 면책 고지"
      subtitle="암호자산·디지털 자산 및 CAIN 서비스 이용과 관련된 주요 위험요소와 책임 범위를 안내합니다."
    >
      <section className="space-y-8 text-sm leading-relaxed text-zinc-200">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            1. 일반 위험 고지
          </h2>
          <p className="mt-2">
            암호자산(가상자산), 토큰, NFT, 파생상품 및 관련 디지털 자산은
            높은 가격 변동성과 규제 불확실성을 가지고 있으며, 투자 원금의
            전부 또는 일부를 상실할 수 있사옵니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>시장 가격의 급등락 및 유동성 부족</li>
            <li>거래소·지갑·서비스 제공자의 기술적 장애 및 파산 위험</li>
            <li>법·제도·규제 환경의 급격한 변화</li>
            <li>해킹·피싱·사기 등 보안 관련 사고</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            2. 투자·매매 행위에 대한 비책임
          </h2>
          <p className="mt-2">
            CAIN은 투자 자문, 매매 권유, 재무 설계, 자산 운용, 브로커리지
            서비스를 제공하지 않으며,{" "}
            <strong>어떠한 코인·토큰·상품의 매수 또는 매도를 권유하지 않사옵니다.</strong>
          </p>
          <p className="mt-2">
            CAIN에서 제공되는 모든 정보, 데이터, 지표, AI 분석, 뉴스 요약 등은
            일반적인 참고용 정보일 뿐, 특정 투자 판단이나 전략을 보증하거나
            약속하지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            3. 정보의 한계 및 책임 제한
          </h2>
          <p className="mt-2">
            CAIN에서 표시되는 가격, 지표, 차트, 뉴스를 포함한 모든 정보는
            제3자 데이터 소스·API·거래소 및 공공 정보에 기반하며, 지연·오류·누락
            또는 갱신 실패가 발생할 수 있사옵니다.
          </p>
          <p className="mt-2">
            서비스 제공자는 데이터의 정확성·완전성·적시성을 보증하지 않으며,
            해당 정보를 신뢰하여 발생한 직·간접적 손실에 대해 법이 허용하는
            최대 한도 내에서 책임을 부담하지 아니하옵니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            4. 사용자 책임
          </h2>
          <p className="mt-2">
            최종 투자 판단과 그 결과에 대한 책임은 전적으로 이용자 본인에게
            있사오며, 이용자는 반드시 자신의 재무 상태, 투자 경험, 위험 감내
            수준을 고려하여 스스로 결정하여야 합니다.
          </p>
          <p className="mt-2">
            CAIN은 특정 수익, 성과, 손실 방지, 투자 성공을 보증하지 않으며,
            과거 데이터나 지표가 미래의 결과를 보장하지 않음을 명확히
            알려드리옵니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            5. 관할·규제 관련 안내
          </h2>
          <p className="mt-2">
            각 국가·지역별로 암호자산 및 관련 서비스에 대한 규제 수준과 허용
            범위가 상이할 수 있사오니, 이용자는 자신의 거주지 규제와 세법을
            스스로 확인해야 하옵니다.
          </p>
          <p className="mt-2">
            CAIN은 특정 관할에서의 서비스 적법성, 신고·인가 필요 여부 등에
            대해 법률 자문을 제공하지 않으며, 필요 시 이용자는 전문 법률
            전문가와 상담하시길 권고드리옵니다.
          </p>
        </div>
      </section>
    </CainLegalLayout>
  );
}
