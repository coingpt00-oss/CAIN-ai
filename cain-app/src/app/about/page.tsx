// src/app/about/page.tsx

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 text-sm leading-relaxed text-zinc-200">
      {/* 제목 */}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
          About
        </p>
        <h1 className="text-2xl font-semibold text-white">CAIN에 대하여</h1>
        {/* Last updated 제거 */}
      </header>

      {/* 1. CAIN이 무엇인지 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-cyan-300">
          1. CAIN은 어떤 서비스인가요?
        </h2>
        <p>
          CAIN(Coin Artificial Intelligence Network)는{" "}
          <strong>
            코인 투자자를 위한 암호자산 데이터·리서치·AI 판단 보조 플랫폼
          </strong>
          이옵니다. 하나의 화면에서 시세·차트·뉴스·이벤트·에어드랍 정보와
          CAIN 전용 지표, 그리고 AI 기반 해설을 확인할 수 있도록 설계되어
          있사옵니다.
        </p>
        <p>
          CAIN의 목표는 “어디서 정보를 모아야 할지 모르겠다”는
          투자자에게&nbsp;
          <strong>데이터와 맥락</strong>을 제공하고, 각자 스스로 판단할 수 있는
          기반을 만들어 드리는 것에 있사옵니다.
        </p>
      </section>

      {/* 2. CAIN이 제공하는 것 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-cyan-300">2. 주요 기능</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>주요 거래소 기준 실시간 코인 시세 및 차트 확인</li>
          <li>국내 투자자 관점의 뉴스·이벤트·상장 정보 큐레이션</li>
          <li>에어드랍·거래소 프로모션 등 기회형 정보 모아보기</li>
          <li>한국 투자자에 특화된 CAIN 전용 지표(김프·지배도 등) 제공</li>
          <li>
            커뮤니티를 통한 정보 공유 및 의견 교환 (읽기 공개, 글쓰기는 회원
            전용 예정)
          </li>
          <li>AI 기반 설명·요약·리스크 체크 등 판단 보조 기능</li>
        </ul>
        <p className="text-xs text-zinc-500">
          * 일부 기능(커뮤니티 글쓰기, CAIN 지표, 에어드랍·이벤트 상세 등)은
          인증 회원 전용으로 제공될 수 있사옵니다.
        </p>
      </section>

      {/* 3. CAIN이 아닌 것 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-cyan-300">
          3. CAIN이 아닌 것
        </h2>
        <p>
          CAIN은 다음에 해당하지 않으며, 그와 같은 역할을 수행하지 않사옵니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>투자 자문 회사, 리딩방, 자산운용사, 브로커가 아닙니다.</li>
          <li>
            이용자 자산을 <strong>보관·관리·운용</strong>하지 않으며,
            매수·매도 주문을 대신 실행하지 않습니다.
          </li>
          <li>특정 코인·프로젝트의 수익·성과를 보장하지 않습니다.</li>
          <li>법률·세무·회계·투자에 대한 전문 자문 서비스를 제공하지 않습니다.</li>
        </ul>
        <p>
          CAIN이 제공하는 모든 정보와 분석은{" "}
          <strong>참고용 일반 정보</strong>일 뿐이며, 최종 투자 결정 및 손익에
          대한 책임은 전적으로 이용자 본인에게 귀속되옵니다.
        </p>
      </section>

      {/* 4. 규제·연령 관련 포지션 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-cyan-300">
          4. 규제 및 연령 정책
        </h2>
        <p>
          각 국가에서는 암호자산 및 관련 서비스에 대해 서로 다른 규제를 적용하고
          있사옵니다. CAIN은 특정 국가의 규제기관에 등록된 금융투자업자나
          가상자산사업자가 아니며,{" "}
          <strong>법적·세무적 의무에 대한 해석을 제공하지 않습니다.</strong>
        </p>
        <p>
          CAIN 서비스는 원칙적으로{" "}
          <strong>만 18세 이상 성인 이용자</strong>를 대상으로 설계되었으며,
          미성년자 이용은 권장하지 않습니다. 이용자는 본인이 거주하는 국가의
          관련 법령과 거래소 이용약관을 준수할 책임이 있사옵니다.
        </p>
      </section>

      {/* 5. 수익 구조 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-cyan-300">
          5. 수익 구조에 대하여
        </h2>
        <p>
          CAIN의 주요 수익원은 다음과 같사옵니다(현재 또는 향후 계획 포함).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>광고 및 스폰서십(배너, 프로모션 영역 등)</li>
          <li>거래소·서비스사와의 제휴/레퍼럴 프로그램</li>
          <li>프리미엄 구독 등 선택적 유료 기능 (도입 시 별도 고지)</li>
        </ul>
        <p>
          스폰서십·제휴·광고가 포함된 콘텐츠의 경우,{" "}
          <Link
            href="/affiliate"
            className="text-cyan-300 underline underline-offset-2"
          >
            광고·제휴·레퍼럴 고지
          </Link>
          에 따라 명확하게 표시되며, 유료 광고 여부가 혼동되지 않도록 운영할
          예정이옵니다.
        </p>
      </section>

      {/* 6. AI 기능에 대한 고지 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-cyan-300">
          6. AI 기능에 대한 안내
        </h2>
        <p>
          CAIN은 OpenAI 등 외부 AI 모델을 활용하여{" "}
          <strong>뉴스 요약, 데이터 해설, 시나리오 설명</strong> 등의 기능을
          제공할 수 있사옵니다. AI의 응답은 통계적 추론에 기반한 결과로,
          사실과 다르거나, 불완전하거나, 최신 정보와 차이가 있을 수 있사옵니다.
        </p>
        <p>
          AI가 생성한 답변은 <strong>투자·법률·세무 자문이 아니며</strong>,  
          최종 판단 전에는 반드시 원본 데이터·공식 공지·전문가 의견 등을 함께
          검토해 주시길 권장드리옵니다. 자세한 내용은{" "}
          <Link
            href="/ai-notice"
            className="text-cyan-300 underline underline-offset-2"
          >
            AI 서비스 안내
          </Link>{" "}
          를 참고해 주시기 바라옵니다.
        </p>
      </section>

      {/* 7. 다른 정책 문서 링크 */}
      <section className="space-y-3 border-t border-white/10 pt-6 text-xs text-zinc-400">
        <h2 className="text-sm font-semibold text-zinc-200">
          관련 정책 문서
        </h2>
        <p>보다 자세한 내용은 아래 문서를 함께 참고해 주시기 바라옵니다.</p>
        <ul className="flex flex-wrap gap-3">
          <li>
            <Link
              href="/terms"
              className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
            >
              이용약관
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
            >
              개인정보처리방침
            </Link>
          </li>
          <li>
            <Link
              href="/risk"
              className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
            >
              리스크 &amp; 면책 고지
            </Link>
          </li>
          <li>
            <Link
              href="/cookies"
              className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
            >
              쿠키 &amp; 추적 공지
            </Link>
          </li>
          <li>
            <Link
              href="/affiliate"
              className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
            >
              광고·제휴·레퍼럴 고지
            </Link>
          </li>
          <li>
            <Link
              href="/ai-notice"
              className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
            >
              AI 서비스 안내
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
