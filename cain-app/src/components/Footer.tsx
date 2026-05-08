// src/components/Footer.tsx
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/10 bg-black text-xs text-zinc-400">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* 상단: 로고 + 한줄 소개 */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {/* ✅ 이 부분: 바깥 원 제거하고 로고 파일만 사용 */}
            <div className="flex h-11 w-11 items-center justify-center">
              <Image
                src="/cain-mark.png"
                alt="CAIN Crown Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Coin Artificial Intelligence Network
              </div>
              <div className="text-[11px] text-zinc-400">
                코인 투자자를 위한 암호자산 데이터·AI 판단 보조 플랫폼
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 md:text-right">
            일부 기능(커뮤니티 글쓰기, CAIN지표, 에어드랍, 이벤트 등)은
            <br className="hidden md:block" />
            인증된 회원에게만 제공됩니다.
          </div>
        </div>

        {/* 중단: 링크 그리드 */}
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {/* 서비스 */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-zinc-300">서비스</div>
            <ul className="space-y-1">
              <li>
                <Link href="/markets" className="hover:text-cyan-300">
                  코인 시세
                </Link>
              </li>
              <li>
                <Link href="/charts" className="hover:text-cyan-300">
                  차트
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-cyan-300">
                  뉴스
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-cyan-300">
                  커뮤니티
                </Link>
              </li>
              <li>
                <Link href="/personal-markets" className="hover:text-cyan-300">
                  CAIN 지표
                </Link>
              </li>
              <li>
                <Link href="/airdrops" className="hover:text-cyan-300">
                  에어드랍
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-cyan-300">
                  이벤트
                </Link>
              </li>
            </ul>
          </div>

          {/* 회사 · 정책·법률 */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-zinc-300">
              회사 · 정책·법률
            </div>
            <ul className="space-y-1">
              <li>
                <Link href="/about" className="hover:text-cyan-300">
                  소개
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-cyan-300">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-cyan-300">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link href="/risk" className="hover:text-cyan-300">
                  리스크 &amp; 면책 고지
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-cyan-300">
                  쿠키 &amp; 추적 공지
                </Link>
              </li>
              <li>
                <Link href="/ai-notice" className="hover:text-cyan-300">
                  AI 서비스 안내
                </Link>
              </li>
              <li>
                <Link href="/affiliate" className="hover:text-cyan-300">
                  광고·제휴·레퍼럴 고지
                </Link>
              </li>
            </ul>
          </div>

          {/* 문의 */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-zinc-300">문의</div>
            <ul className="space-y-1">
              <li>
                운영·제휴:{" "}
                <a
                  href="mailto:coingpt00@gmail.com"
                  className="hover:text-cyan-300"
                >
                  coingpt00@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단: 카피라이트 + 한줄 고지 */}
        <div className="mt-8 flex flex-col gap-2 border-t border-white/5 pt-4 text-[11px] text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>© {year} CAIN. All rights reserved.</div>
          <div className="space-y-1 text-[10px] text-zinc-600 md:text-right">
            <p>
              CAIN은 투자 자문 또는 중개 서비스가 아니며, 제공되는 모든 정보는
              참고용 일반 정보입니다.
            </p>
            <p>
              본 서비스는 대한민국 법령을 기준으로 하며, 분쟁 발생 시 대한민국
              법원을 우선 관할로 합니다.
            </p>
            <p>
              레퍼럴 링크 및 제휴를 통해 접속하는 외부 서비스(거래소, 지갑,
              프로젝트 등)는 각 제공자가 운영 책임을 부담하며, CAIN은 해당
              서비스의 정책·운영·손실에 대해 책임을 지지 않습니다.
            </p>
            <p>
              시세·지표·뉴스·데이터 등 정보는 지연·누락·오류·중단이 발생할 수
              있으며, 정확성·적시성·완전성을 보증하지 않습니다.
            </p>
            <p>
              서비스 정책·구성·제휴 구조는 운영·규제·제휴사 정책 변화에 따라
              예고 없이 변경되거나 중단될 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
