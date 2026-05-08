// src/components/legal/CainCookies.tsx
"use client";

import React from "react";
import { CainLegalLayout } from "./CainLegalLayout";

export default function CainCookies() {
  return (
    <CainLegalLayout
      title="쿠키 & 추적 공지"
      subtitle="CAIN 웹사이트 및 앱에서 사용되는 쿠키·로컬스토리지 등 추적 기술에 대해 안내드립니다."
    >
      <section className="space-y-8 text-sm leading-relaxed text-zinc-200">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            1. 쿠키 및 유사 기술의 사용 목적
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>로그인 세션 유지 및 인증 상태 확인</li>
            <li>기본 언어, 테마, 사용자 환경 설정 저장</li>
            <li>페이지 성능, 오류, 사용 패턴 분석(Analytics)</li>
            <li>서비스 개선을 위한 통계·지표 산출</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            2. 저장되는 정보의 범위
          </h2>
          <p className="mt-2">
            CAIN은 서비스 운영에 필요한 최소한의 정보를 쿠키 또는
            로컬스토리지에 저장하며, 일반적으로 다음과 같은 항목이 포함될 수
            있사옵니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>세션 식별자, 토큰 등 인증 관련 값</li>
            <li>선호 언어, 다크 모드 등 UI 설정</li>
            <li>방문한 페이지 및 기본 사용 로그(익명·집계 형태)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            3. 제3자 도구·Analytics
          </h2>
          <p className="mt-2">
            서비스 개선을 위해 웹 분석 도구(예: 트래픽 분석, 오류 모니터링 등)를
            사용할 수 있으며, 이 과정에서 익명화된 이용 정보가 수집될 수
            있사옵니다. 수집된 정보는 통계·지표 산출과 품질 개선에만 사용되며
            개별 이용자를 특정하기 위해 사용되지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            4. 쿠키 관리 방법
          </h2>
          <p className="mt-2">
            이용자는 브라우저 설정을 통해 쿠키 저장을 제한하거나 삭제할 수
            있사오나, 일부 필수 쿠키를 차단할 경우 로그인·개인화 기능이 정상적으로
            작동하지 않을 수 있습니다.
          </p>
        </div>
      </section>
    </CainLegalLayout>
  );
}
