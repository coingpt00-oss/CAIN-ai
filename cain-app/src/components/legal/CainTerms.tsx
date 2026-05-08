// src/components/legal/CainTerms.tsx
"use client";

import React from "react";

export default function CainTerms() {
  return (
    <section className="mx-auto max-w-4xl text-sm leading-relaxed space-y-8">
      {/* 상단 헤더 */}
      <header className="mb-6 border-b border-white/5 pb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          TERMS
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--brand)]">
          CAIN 이용약관 (Terms of Service)
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          이 약관은 CAIN 서비스 이용과 관련된 권리·의무·책임 사항을 규정합니다.
        </p>
      </header>

      {/* 1. 목적 및 적용범위 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          1. 목적 및 적용범위
        </h2>
        <p className="text-sm text-zinc-200">
          본 이용약관(이하 &quot;약관&quot;)은 CAIN(이하 &quot;서비스&quot;)의
          이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임 사항을
          규정함을 목적으로 합니다. 본 서비스는 웹 기반 및 모바일 기반(앱 래핑
          포함)의 정보 제공, 분석, AI 기능, 커뮤니티 기능, 뉴스 및 데이터 제공,
          제휴·레퍼럴 기능 등을 포함합니다.
        </p>
      </section>

      {/* 2. 서비스 정의 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">2. 서비스 정의</h2>
        <p className="text-sm text-zinc-200">
          서비스는 다음 각 항목을 포함합니다:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>시장 정보 및 데이터 제공</li>
          <li>뉴스/공시/이벤트 정보 제공</li>
          <li>지표 및 분석 수치 제공</li>
          <li>AI 기반 시장 분석·요약·질의응답 서비스</li>
          <li>커뮤니티 기반 게시물·댓글·투표 기능</li>
          <li>레퍼럴·제휴 기반 온보딩 기능</li>
          <li>계정·프로필·설정 기능</li>
          <li>기타 서비스 제공자가 정하는 기능</li>
        </ul>
        <p className="text-sm text-zinc-200">
          본 서비스는{" "}
          <strong className="font-semibold">
            암호자산 거래 중개, 매매 권유, 금융상품 판매, 자산 예치, 투자 관리,
            수탁 행위
          </strong>
          를 수행하지 않습니다.
        </p>
      </section>

      {/* 3. 서비스 구성요소 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          3. 서비스 구성요소
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 다음 구성요소를 포함할 수 있으며 제공 방식은 변경될 수
          있습니다:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>웹 기반 인터페이스(Web App)</li>
          <li>모바일 앱 또는 래핑(PWA 등)</li>
          <li>AI 기반 분석 모듈</li>
          <li>커뮤니티 및 UGC 게시 시스템</li>
          <li>레퍼럴·제휴 기반 가입 기능</li>
          <li>API 및 데이터 인터페이스(향후 제공 가능)</li>
          <li>공지·고객지원 채널</li>
        </ul>
      </section>

      {/* 4. 이용 자격 및 연령 제한 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          4. 이용 자격 및 연령 제한
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 <strong className="font-semibold">만 18세 이상 이용자</strong>
          만 사용할 수 있습니다. 이용자는 회원 가입 또는 서비스 이용 시 본인이
          18세 이상임을 보증합니다. 미성년자가 허위 진술을 통해 서비스를
          이용하는 경우 발생하는 모든 책임은 해당 본인 또는 법정대리인에게
          귀속됩니다.
        </p>
        <p className="text-sm text-zinc-200">
          서비스 제공자는 법적 실명 확인, KYC 또는 별도의 성인 인증 절차를
          수행하지 않습니다.
        </p>
      </section>

      {/* 5. 계정·등록·회원정보 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          5. 계정·등록·회원정보
        </h2>
        <p className="text-sm text-zinc-200">
          서비스 이용 시 계정 등록이 요구될 수 있으며 이용자는 정확한 정보를
          제공하여야 합니다. 계정의 관리 책임은 이용자에게 있으며, 계정 정보
          유출·공유 등으로 인해 발생하는 책임은 전적으로 이용자에게 있습니다.
        </p>
      </section>

      {/* 6. AI 서비스 관련 사항 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          6. AI 서비스 관련 사항
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>AI 출력은 정보 제공 또는 의견으로 간주됩니다.</li>
          <li>AI 출력은 금융·투자·법률적 조언이 아닙니다.</li>
          <li>AI 출력은 부정확하거나 지연될 수 있습니다.</li>
          <li>
            이용자는 AI 출력에 기반한 판단·행동에 대한 책임을
            <strong className="font-semibold"> 스스로</strong> 부담합니다.
          </li>
          <li>
            서비스 제공자는 AI 출력과 관련하여 발생한 피해·손실·결과에 대해
            책임을 지지 않습니다.
          </li>
        </ul>
      </section>

      {/* 7. 시장 데이터·뉴스·지표 관련 사항 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          7. 시장 데이터·뉴스·지표 관련 사항
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 외부 데이터 소스, 제휴 채널, API 제공자, 거래소 및 플랫폼,
          공개 정보 등을 활용하여 정보를 제공합니다. 데이터는 지연, 오류, 누락,
          중단이 발생할 수 있으며, 서비스는 데이터의 정확성, 적시성, 완전성을
          보증하지 않습니다.
        </p>
        {/* ✅ 추가: 제3자 데이터·API 출처 및 책임 범위 */}
        <p className="text-sm text-zinc-200">
          데이터는 제휴 거래소, 가격 데이터 제공업체, 뉴스·콘텐츠 제공사,
          오픈 API 등 제3자 서비스에서 전달될 수 있으며, 해당 서비스의 장애,
          정책 변경, 접근 제한 등으로 인해 발생하는 문제에 대해서는 각
          제공자가 우선 책임을 부담합니다.
        </p>
      </section>

      {/* 8. 금융·투자 및 디지털자산 관련 면책 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          8. 금융·투자 및 디지털자산 관련 면책
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는{" "}
          <strong className="font-semibold">
            투자 권유, 중개, 자문, 매매 실행, 수탁, 예치, 또는 금융상품 판매 행위
          </strong>
          를 수행하지 않습니다.
        </p>
        <p className="text-sm text-zinc-200">
          암호자산, 토큰, NFT, 디지털 자산, 금융 상품 등의 거래는 높은 위험을
          포함하며, 가치 변동, 유동성 부족, 규제 환경 변화 등으로 인해 원금 전부
          또는 상당 부분의 손실이 발생할 수 있습니다.
        </p>
        <p className="text-sm text-zinc-200">
          투자 또는 행동에 대한 최종 결정과 책임은 전적으로 이용자에게 있으며,
          서비스 제공자는 이에 따른 손실에 대해 책임을 부담하지 않습니다.
        </p>
      </section>

      {/* 9. 사용자 의무 및 금지행위 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          9. 사용자 의무 및 금지행위
        </h2>
        <p className="text-sm text-zinc-200">
          이용자는 다음 각 호의 행위를 할 수 없습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>불법·사기·불건전 활동에 서비스 이용</li>
          <li>타인의 계정·개인정보 도용</li>
          <li>커뮤니티 내 허위 정보 유포, 시세 조작 시도</li>
          <li>직·간접적인 매수/매도/투자 권유 및 리딩 행위</li>
          <li>무단 광고, 홍보, 스팸성 게시 및 메시지 발송</li>
          <li>저작권·상표권 등 제3자의 권리 침해</li>
          <li>서비스 또는 인프라에 대한 해킹, 크롤링, 리버스 엔지니어링 시도</li>
          <li>서비스의 정상적인 운영을 방해하거나 과도한 부하를 유발하는 행위</li>
        </ul>
      </section>

      {/* 10. 커뮤니티 및 게시물 정책 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          10. 커뮤니티 및 게시물 정책
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>게시물·댓글·프로필 등 UGC는 해당 이용자가 전적으로 책임을 집니다.</li>
          <li>
            서비스 제공자는 운영 기준에 따라 게시물의 노출 범위 조정, 숨김, 삭제,
            이용 제한 조치를 취할 수 있습니다.
          </li>
          <li>
            불법성, 명예훼손, 사기성, 리딩·선동성 게시물은 제한 또는 신고 조치될
            수 있습니다.
          </li>
          <li>
            커뮤니티 세부 운영 원칙은 별도의{" "}
            <strong className="font-semibold">
              커뮤니티 운영규칙 / User Content Policy
            </strong>
            에 의해 보완·적용됩니다.
          </li>
        </ul>
      </section>

      {/* 11. 제휴·레퍼럴·광고 관련 고지 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          11. 제휴·레퍼럴·광고 관련 고지
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 제휴 거래소 및 기타 파트너의 레퍼럴·광고·할인 혜택을 제공할
          수 있으며, 이용자는 해당 구조가 존재함을 이해하고 동의합니다.
        </p>
        <p className="text-sm text-zinc-200">
          레퍼럴 및 제휴 혜택은 제휴사의 정책, 규제, 시스템 변경 등에 따라 예고
          없이 변경·중단될 수 있습니다.
        </p>
      </section>

      {/* 12. 책임 제한 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          12. 책임 제한
        </h2>
        <p className="text-sm text-zinc-200">
          서비스 제공자는 서비스 이용 또는 이용 불가, 데이터 오류·지연, 시스템
          장애, 제3자 서비스 문제 등으로 인해 발생하는 손해에 대해 법이 허용하는
          한도 내에서 책임을 지지 않습니다.
        </p>
        {/* ✅ 추가: 제3자 서비스에 대한 별도 책임 한정 */}
        <p className="text-sm text-zinc-200">
          특히 제3자 API, 거래소, 지갑, 외부 플랫폼을 통한 거래·송금·입출금·포지션
          설정 등은 각 서비스의 약관과 규정에 따르며, CAIN은 이러한 행위의 결과에
          대해 법이 허용하는 범위 내에서만 책임을 부담합니다.
        </p>
      </section>

      {/* 13. 서비스 변경·중단 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          13. 서비스 변경·중단
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 운영상·기술상·사업상 필요에 따라 서비스의 전부 또는 일부를
          변경하거나 중단할 수 있으며, 이는 약관 위반으로 간주되지 않습니다.
        </p>
      </section>

      {/* 14. 지적재산권 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          14. 지적재산권
        </h2>
        <p className="text-sm text-zinc-200">
          서비스 및 관련 콘텐츠, 소스코드, UI/UX, 로고, 상표, 디자인 등은 서비스
          제공자 또는 정당한 권리자의 지적재산권에 속하며, 이용자는 이를 무단으로
          복제, 배포, 전송, 리버스 엔지니어링할 수 없습니다.
        </p>
      </section>

      {/* 15. 계약기간 및 종료 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          15. 계약기간 및 종료
        </h2>
        <p className="text-sm text-zinc-200">
          본 약관은 이용자가 서비스에 접근하거나 사용하는 시점부터 효력이
          발생하며, 이용자가 서비스 이용을 중단하거나, 서비스 제공자가 이용정지
          또는 탈퇴 조치를 하는 시점까지 유효합니다.
        </p>
      </section>

      {/* 16. 준거법 및 분쟁 해결 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          16. 준거법 및 분쟁 해결
        </h2>
        <p className="text-sm text-zinc-200">
          본 약관은 서비스 제공자가 소재한 국가 또는 지역의 법률을 준거법으로
          합니다. 서비스 이용과 관련하여 분쟁이 발생하는 경우, 관할 법원은 서비스
          제공자가 정한 법원을 우선 관할 법원으로 합니다.
        </p>
      </section>

      {/* 17. 고지·문의·지원 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          17. 고지·문의·지원
        </h2>
        <p className="text-sm text-zinc-200">
          서비스 제공자는 이메일, 웹사이트 공지, 서비스 내 알림 등의 방식으로
          이용자에게 공지할 수 있습니다. 세부 연락처 및 문의 채널은 서비스 내
          별도 페이지 또는 공지사항을 통해 안내됩니다.
        </p>
      </section>

      {/* 18. 약관 개정 및 효력 발생 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          18. 약관 개정 및 효력 발생
        </h2>
        <p className="text-sm text-zinc-200">
          본 약관은 필요 시 개정될 수 있으며, 개정 내용은 서비스 내 공지 또는
          별도 고지 수단을 통해 사전에 안내합니다. 개정 약관의 효력 발생일 이후에
          서비스를 계속 이용하는 경우, 이용자는 개정 약관에 동의한 것으로
          간주됩니다.
        </p>
      </section>
    </section>
  );
}
