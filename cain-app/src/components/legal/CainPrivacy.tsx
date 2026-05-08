// src/components/legal/CainPrivacy.tsx
"use client";

import React from "react";

export default function CainPrivacy() {
  return (
    <section className="mx-auto max-w-4xl text-sm leading-relaxed space-y-8">
      {/* 상단 헤더 */}
      <header className="mb-6 border-b border-white/5 pb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          PRIVACY
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--brand)]">
          CAIN 개인정보처리방침 (Privacy Policy)
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          본 방침은 CAIN 서비스 이용과 관련하여 수집·이용되는 개인정보의 항목,
          목적, 보관기간, 보호 조치 등을 설명합니다.
        </p>
      </header>

      {/* 1. 총칙 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">1. 총칙</h2>
        <p className="text-sm text-zinc-200">
          CAIN(Coin Artificial Intelligence Network, 이하 &quot;서비스&quot;)는
          이용자의 개인정보를 중요하게 생각하며, 관련 법령과 규정에 따라
          개인정보를 안전하게 보호하기 위해 노력합니다. 본
          개인정보처리방침은 서비스가 어떤 정보를, 어떤 목적으로, 어떤 방식으로
          처리하는지에 대해 설명합니다.
        </p>
      </section>

      {/* 2. 수집 항목 및 수집 방법 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          2. 수집하는 개인정보 항목 및 수집 방법
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 다음과 같은 항목을 필요 최소한으로 수집할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>
            <strong className="font-semibold">회원 가입/로그인 시</strong>:
            이메일 주소, 비밀번호, 닉네임/사용자명, 거주 국가, 가입일시 등
          </li>
          <li>
            <strong className="font-semibold">프로필 및 계정 설정 시</strong>:
            선택 입력 정보(관심 코인, 선호 언어, 알림 설정 등)
          </li>
          <li>
            <strong className="font-semibold">서비스 이용 과정에서</strong>:
            접속 로그, IP 주소, 브라우저 정보, 접속 일시, 이용 기록(열람한
            페이지, 클릭, 검색 기록 등)
          </li>
          <li>
            <strong className="font-semibold">고객센터/문의 이용 시</strong>:
            이메일 주소, 이름(또는 닉네임), 문의 내용 및 첨부 파일
          </li>
          <li>
            <strong className="font-semibold">기기·기술 정보</strong>:
            단말기 종류, 운영체제, 브라우저 종류/버전, 화면 해상도 등
          </li>
        </ul>
        <p className="text-sm text-zinc-200">
          개인정보는 회원가입 화면, 설정 페이지, 문의 폼 등{" "}
          <strong className="font-semibold">이용자의 직접 입력</strong> 또는
          서비스 이용 시 자동으로 생성·수집되는 방식으로 수집됩니다.
        </p>
      </section>

      {/* 3. 개인정보의 이용 목적 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          3. 개인정보의 이용 목적
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 수집한 개인정보를 다음 목적 범위 내에서만 이용합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>회원 식별, 로그인 및 계정 관리</li>
          <li>개인화된 서비스 제공(관심 코인, 언어, 레이아웃 설정 등)</li>
          <li>서비스 이용 통계, 품질 개선 및 신규 기능 개발</li>
          <li>공지사항, 서비스 변경, 정책 안내 등 필수 고지</li>
          <li>이용 문의 처리, 오류 대응, 고객 지원</li>
          <li>보안, 부정 이용 방지, 서비스 안정성 확보</li>
          <li>
            (옵션 동의 시) 뉴스레터, 서비스 안내 등 마케팅·홍보 커뮤니케이션
          </li>
        </ul>
      </section>

      {/* 4. 보유 및 이용 기간 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          4. 개인정보의 보유 및 이용 기간
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 법령에서 별도로 정하는 경우를 제외하고, 개인정보 수집 및 이용
          목적이 달성될 때까지 개인정보를 보유·이용하며, 목적 달성 후에는 지체
          없이 파기합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>
            회원 계정 정보: 회원 탈퇴 시까지 보관, 탈퇴 후 관련 법령에 따른 보존
            기간 경과 후 파기
          </li>
          <li>
            로그 기록, 접속 IP: 보안·서비스 운영을 위해 일정 기간 보관 후 익명화
            또는 삭제
          </li>
          <li>
            문의·지원 기록: 문의 처리 완료 후 일정 기간(예: 3년) 보관 후 파기
          </li>
        </ul>
        <p className="text-xs text-zinc-400">
          ※ 실제 보존 기간은 전자상거래, 소비자 보호, 회계·세무 등 관련 법령에
          따라 달라질 수 있습니다.
        </p>
      </section>

      {/* 5. 제3자 제공 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">5. 제3자 제공</h2>
        <p className="text-sm text-zinc-200">
          서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만
          다음의 경우 예외적으로 제공될 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>이용자가 사전에 명시적으로 동의한 경우</li>
          <li>
            법령에 근거가 있거나, 수사·조사 등 공공기관의 적법한 요청이 있는 경우
          </li>
          <li>생명·신체·재산의 긴급한 안전을 위해 필요한 경우</li>
        </ul>
      </section>

      {/* 6. 처리 위탁 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">6. 처리 위탁</h2>
        <p className="text-sm text-zinc-200">
          서비스는 서비스 제공을 위해 클라우드 인프라, 데이터베이스, 이메일 발송
          등 일부 업무를 전문 서비스 제공자에게 위탁할 수 있습니다. 이 경우
          위탁사와의 계약을 통해 개인정보 보호 의무, 기술·관리적 보호조치,
          재위탁 제한, 파기 의무 등을 명확히 규정하고 관리·감독합니다.
        </p>
      </section>

      {/* 7. 해외 보관 및 국외 이전 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          7. 해외 서버 이용 및 국외 이전
        </h2>
        <p className="text-sm text-zinc-200">
          서비스 인프라(클라우드 서버, 데이터베이스, CDN 등)는 해외에 위치한
          서비스 제공업체의 설비를 이용할 수 있습니다. 이 경우 이용자의
          개인정보는 해당 국가의 서버에 저장·처리될 수 있으며, 서비스는 관련
          법령이 허용하는 범위 내에서 적절한 보호 조치를 취합니다.
        </p>
        {/* ✅ 추가: 해외 보관 시 보호 수준 고지 */}
        <p className="text-xs text-zinc-400">
          해외 설비를 이용하는 경우에도, 서비스는 계약 및 기술·관리적 보호조치를
          통해 개인정보가 가능한 한 국내와 동등한 수준으로 보호될 수 있도록
          노력합니다.
        </p>
      </section>

      {/* 8. 쿠키 및 유사 기술 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          8. 쿠키(Cookie) 및 유사 기술의 사용
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 이용자의 편의성 향상, 로그인 유지, 트래픽 분석, 서비스
          개선을 위해 쿠키와 유사한 기술을 사용할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>필수 쿠키: 로그인 유지, 기본 보안, 사이트 기본 기능 제공</li>
          <li>통계/분석 쿠키: 서비스 이용 패턴 분석 및 품질 개선</li>
          <li>
            (향후) 마케팅/광고 쿠키: 선택 동의 시 맞춤형 콘텐츠 및 광고 제공
          </li>
        </ul>
        <p className="text-sm text-zinc-200">
          이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으나,
          이 경우 일부 기능 이용에 제한이 있을 수 있습니다. 보다 자세한 내용은
          별도의 <strong>쿠키 &amp; 추적 공지</strong>에서 안내할 예정입니다.
        </p>
      </section>

      {/* 9. 이용자의 권리 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          9. 이용자의 권리와 행사 방법
        </h2>
        <p className="text-sm text-zinc-200">
          이용자는 관련 법령이 허용하는 범위 내에서 자신의 개인정보에 대해
          다음과 같은 권리를 가질 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>개인정보 열람(조회) 요청</li>
          <li>개인정보 정정·수정 요청</li>
          <li>처리 정지 요청</li>
          <li>삭제 및 회원 탈퇴 요청</li>
        </ul>
        <p className="text-sm text-zinc-200">
          위 권리는 서비스 내 설정 페이지 또는 별도의 문의 채널을 통해 행사할 수
          있으며, 서비스는 관련 법령에 따라 지체 없이 필요한 조치를 취합니다.
        </p>
      </section>

      {/* 10. 정보 보호를 위한 조치 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          10. 개인정보 보호를 위한 기술적·관리적 조치
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 개인정보의 안전성을 확보하기 위해 다음과 같은 조치를 취할 수
          있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>전송 구간 암호화(HTTPS, TLS 등)</li>
          <li>접근 권한 최소화 및 접근 통제</li>
          <li>비밀번호 및 중요 정보 암호화 저장</li>
          <li>로그 모니터링 및 이상 징후 탐지</li>
          <li>정기적인 보안 패치 및 점검</li>
        </ul>
      </section>

      {/* 11. 미성년자의 개인정보 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          11. 미성년자의 개인정보
        </h2>
        <p className="text-sm text-zinc-200">
          서비스는 만 18세 미만의 이용자를 대상으로 서비스를 제공하지 않으며,
          미성년자의 개인정보를 의도적으로 수집하지 않습니다. 만 18세 미만
          이용자의 정보 수집 사실이 확인되는 경우, 관련 정보를 지체 없이
          삭제합니다.
        </p>
      </section>

      {/* 12. 연락처 및 문의 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          12. 개인정보 관련 문의
        </h2>
        <p className="text-sm text-zinc-200">
          개인정보 보호와 관련된 문의, 요청, 불만 처리는 다음 연락처를 통해
          접수하실 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
          <li>이메일: coingpt00@gmail.com </li>
        </ul>
      </section>

      {/* 13. 정책 변경에 대한 고지 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          13. 개인정보처리방침의 변경
        </h2>
        <p className="text-sm text-zinc-200">
          본 개인정보처리방침은 법령 개정, 서비스 변경, 보안 강화 등의 사유로
          변경될 수 있습니다. 중요한 변경 사항이 발생하는 경우 서비스 내 공지
          또는 별도의 알림 수단을 통해 사전에 안내합니다.
        </p>
      </section>
    </section>
  );
}
