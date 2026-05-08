// src/components/HeaderClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import AuthGateModal from "@/components/AuthGateModal";

// ===== 오리지널 프로필 아이콘 (저작권 문제 無) =====
const ProfileIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M4.5 20c1.8-3.8 5-6 7.5-6s5.7 2.2 7.5 6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type CainUser = {
  uid: string;
  username: string;
  role?: string; // "admin" 이면 관리자
};

type NavItem = {
  name: string;
  href: string;
  gated?: boolean; // 로그인 필요(비회원 클릭 시 모달)
  premium?: boolean; // 프리미엄 메뉴: premium-link 클래스 적용
};

// ✅ 보스 정책: "보이는 건 비회원도 전부" / "누르면 모달로 유도"
// ✅ NOTE: /pages/* 레거시 라우트 제거했으니, 이제 정식 라우트(/markets 등)로 이동
const navItems: NavItem[] = [
  { name: "코인시세", href: "/personal-markets/spot", gated: true, premium: true },
  { name: "차트", href: "/charts" },
  { name: "뉴스", href: "/news" },

  // 커뮤니티: 읽기는 공개. (글쓰기/상호작용은 페이지 내부에서 막는 구조 추천)
  { name: "커뮤니티", href: "/community", premium: true },

  // ✅ CAIN지표는 코인시세 메뉴로 통합

  // ✅ 에어드랍/이벤트 회원전용
  { name: "에어드랍", href: "/airdrops", gated: true, premium: true },
  { name: "이벤트", href: "/events", gated: true, premium: true },
];

export default function HeaderClient() {
  const [user, setUser] = useState<CainUser | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  // auth gate modal
  const [gateOpen, setGateOpen] = useState(false);
  const [gateNext, setGateNext] = useState<string>("/");

  // ✅ 로그인 상태 로드
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const raw = window.localStorage.getItem("cain_user");
      if (!raw) return;

      const parsed = JSON.parse(raw) as CainUser;
      setUser(parsed);
      setIsAuthed(true);
    } catch {
      // 무시
    }
  }, []);

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cain_user");
        window.localStorage.removeItem("cain_token");
      }
    } catch {
      // 무시
    }
    setUser(null);
    setIsAuthed(false);
    setOpen(false);

    // ✅ 로그아웃 후에도 정식 라우트로 이동
    if (typeof window !== "undefined") {
      window.location.href = "/personal-markets/spot";
    }
  };

  const handleProfileClick = () => {
    setOpen((v) => !v);
  };

  // ✅ 메뉴 클릭 핸들러: gated인데 비회원이면 모달
  const onNavClick = (it: NavItem) => (e: ReactMouseEvent) => {
    if (!it.gated) return; // 공개 메뉴는 이동
    if (isAuthed) return; // 회원이면 이동

    // 비회원: 이동 막고 모달
    e.preventDefault();
    setGateNext(it.href);
    setGateOpen(true);
  };

  const gateMessage = useMemo(() => {
    return "코인시세 / 에어드랍 / 이벤트는 인증 회원에게만 제공됩니다. 로그인/회원가입 후 바로 이용하실 수 있습니다.";
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 h-16 md:h-20 flex items-center justify-between">
          {/* ===== 좌측: 로고 + 브랜드 문구 ===== */}
          <Link href="/personal-markets/spot" className="flex items-center gap-4">
            <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden ring-1 ring-cyan-400/40 bg-cyan-400/10">
              <Image
                src="/cain-mark.png"
                alt="CAIN"
                fill
                sizes="56px"
                className="object-cover"
                priority
              />
            </div>

            <h1 className="text-[var(--brand)] font-semibold tracking-wide text-xl md:text-2xl lg:text-3xl whitespace-nowrap">
              Coin Artificial Intelligence Network
            </h1>
          </Link>

          {/* ===== 가운데: 상단 메뉴 (비회원도 전부 노출) ===== */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navItems.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavClick(it)}
                className={[
                  "nav-link text-base font-medium transition flex items-center gap-1 whitespace-nowrap",
                  it.premium ? "premium-link" : "",
                ].join(" ")}
              >
                {it.name}
              </Link>
            ))}
          </nav>

          {/* ===== 우측: 프로필 아이콘 드롭다운 ===== */}
          <div className="ml-auto md:ml-0 relative flex items-center gap-3">
            <button
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center text-[var(--brand)]"
              aria-label="profile menu"
            >
              <ProfileIcon className="w-5 h-5" />
            </button>

            {open && (
              <div className="absolute right-0 top-12 w-60 rounded-xl border border-white/10 bg-zinc-950 shadow-xl p-2">
                {!isAuthed ? (
                  <>
                    <div className="px-3 py-2 text-xs text-white/60">
                      CAIN 회원 전용 기능(지표·에어드랍·이벤트·커뮤니티 글쓰기)을
                      이용하시려면 로그인/회원가입이 필요합니다.
                    </div>
                    <Link
                      href="/login"
                      className="block px-3 py-2 mt-1 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      로그인
                    </Link>
                    <Link
                      href="/register"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      회원가입
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs text-white/60">
                      {user?.username} 님
                    </div>

                    <Link
                      href="/mypage"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      마이페이지
                    </Link>

                    <Link
                      href="/prefs"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      설정(언어/통화/테마)
                    </Link>

                    {user?.role === "admin" && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5 text-rose-300"
                        onClick={() => setOpen(false)}
                      >
                        관리자 대시보드
                      </Link>
                    )}

                    <button
                      className="w-full text-left px-3 py-2 mt-1 rounded-lg text-sm hover:bg-white/5 text-red-300"
                      onClick={handleLogout}
                    >
                      로그아웃
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== 비회원 게이트 모달 ===== */}
      <AuthGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        nextHref={gateNext}
        message={gateMessage}
      />
    </>
  );
}