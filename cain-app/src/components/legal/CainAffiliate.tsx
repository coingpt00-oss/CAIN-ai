// src/components/legal/CainAffiliate.tsx
"use client";

import React from "react";
import { CainLegalLayout } from "./CainLegalLayout";

export default function CainAffiliate() {
  return (
    <CainLegalLayout
      title="광고·제휴·레퍼럴 고지"
      subtitle="CAIN의 제휴 거래소, 광고, 레퍼럴 구조 및 이해 상충 가능성에 대해 안내합니다."
    >
      <section className="space-y-8 text-sm leading-relaxed text-zinc-200">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            1. 제휴 및 레퍼럴 구조
          </h2>
          <p className="mt-2">
            CAIN은 일부 암호화폐 거래소, 서비스 제공자, 플랫폼과 제휴 관계를
            맺고 있으며, 레퍼럴 링크 또는 추천 코드를 통해 가입·이용이
            발생하는 경우 일정 비율의 수수료 또는 보상을 받을 수 있습니다.
          </p>
          <p className="mt-2">
            이러한 구조는 서비스 운영 비용 충당 및 지속적인 개선을 위한
            재원으로 사용되며, 이용자에게 추가 비용을 부과하지 않는 것을
            원칙으로 합니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            2. 정보의 중립성
          </h2>
          <p className="mt-2">
            CAIN은 제휴 여부와 관계없이 가능한 한 객관적이고 중립적인 정보
            제공을 위해 노력하며, 특정 거래소나 상품을 과도하게 미화하거나
            보증하지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            3. 외부 서비스 책임 범위
          </h2>
          <p className="mt-2">
            레퍼럴 링크를 통해 접속하는 외부 서비스(거래소, 지갑, 프로젝트 등)는
            각각의 운영 주체가 별도로 존재하며, CAIN은 해당 서비스의 안정성,
            신뢰성, 보안, 고객 응대 등에 대해 책임을 지지 않습니다.
          </p>
          <p className="mt-2">
            이용자는 각 서비스의 개별 이용약관·위험 고지·개인정보처리방침을
            반드시 확인한 뒤 스스로 이용 여부를 결정해야 합니다.
          </p>
        </div>

        {/* ✅ 추가: 혜택 및 조건 변경 가능성 */}
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            4. 혜택 및 조건의 변경 가능성
          </h2>
          <p className="mt-2">
            제휴·레퍼럴 구조, 수수료율, 할인·캐시백·혜택 조건 등은 각 제휴사
            정책과 규제 환경, 시스템 변경에 따라 사전 고지 없이 변경되거나
            중단될 수 있습니다.
          </p>
          <p className="mt-2">
            CAIN은 최신 정보를 제공하기 위해 노력하지만, 모든 제휴 조건의
            실시간 반영을 보증하지 않으며, 실제 적용 조건은 각 제휴사·거래소의
            공지 및 이용약관을 우선으로 합니다.
          </p>
        </div>
      </section>
    </CainLegalLayout>
  );
}
