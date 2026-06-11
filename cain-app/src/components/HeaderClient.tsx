// src/components/HeaderClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import AuthGateModal from "@/components/AuthGateModal";

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
  role?: string; // "admin"이면 관리자
};

type NavItem = {
  name: string;
  href: string;
  gated?: boolean; // 로그인/인증 필요
  premium?: boolean; // premium-link 클래스 적용
};

const navItems: NavItem[] = [
  { name: "코인시세", href: "/personal-markets/spot", gated: true, premium: true },
  { name: "차트", href: "/charts" },
  { name: "뉴스", href: "/news" },
  { name: "커뮤니티", href: "/community", premium: true },
  { name: "에어드랍", href: "/airdrops", gated: true, premium: true },
  { name: "이벤트", href: "/events", gated: true, premium: true },
  { name: "거래소 공지", href: "/exchange-notices", gated: true, premium: true },
];

export default function HeaderClient() {
  const [user, setUser] = useState<CainUser | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // auth gate modal
  const [gateOpen, setGateOpen] = useState(false);
  const [gateNext, setGateNext] = useState<string>("/");

  // 로그인 상태 로드
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const raw = window.localStorage.getItem("cain_user");
      if (!raw) return;

      const parsed = JSON.parse(raw) as CainUser;
      setUser(parsed);
      setIsAuthed(true);
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cain_user");
        window.localStorage.removeItem("cain_token");
      }
    } catch {
      // ignore
    }

    setUser(null);
    setIsAuthed(false);
    setOpen(false);
    setMobileMenuOpen(false);

    if (typeof window !== "undefined") {
      window.location.href = "/personal-markets/spot";
    }
  };

  const handleProfileClick = () => {
    setOpen((v) => !v);
    setMobileMenuOpen(false);
  };

  const handleMobileMenuClick = () => {
    setMobileMenuOpen((v) => !v);
    setOpen(false);
  };

  const onNavClick = (it: NavItem) => (e: ReactMouseEvent) => {
    setOpen(false);
    setMobileMenuOpen(false);

    if (!it.gated) return; // 공개 메뉴는 그대로 이동
    if (isAuthed) return; // 인증 회원이면 그대로 이동

    // 비회원은 이동 막고 모달 표시
    e.preventDefault();
    setGateNext(it.href);
    setGateOpen(true);
  };

  const gateMessage = useMemo(() => {
    return "코인시세 / 에어드랍 / 이벤트 / 거래소 공지는 인증 회원에게만 제공됩니다. 로그인 또는 회원가입 후 이용하실 수 있습니다.";
  }, []);

  const ProfileMenu = () => (
    <div className="absolute right-0 top-12 w-60 rounded-xl border border-white/10 bg-zinc-950 shadow-xl p-2">
      {!isAuthed ? (
        <>
          <div className="px-3 py-2 text-xs text-white/60">
            CAIN 회원 전용 기능을 이용하시려면 로그인 또는 회원가입이 필요합니다.
          </div>
          <Link
            href="/login"
            className="block px-3 py-2 mt-1 rounded-lg text-sm hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              setMobileMenuOpen(false);
            }}
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              setMobileMenuOpen(false);
            }}
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
            onClick={() => {
              setOpen(false);
              setMobileMenuOpen(false);
            }}
          >
            마이페이지
          </Link>

          <Link
            href="/prefs"
            className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              setMobileMenuOpen(false);
            }}
          >
            설정
          </Link>

          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5 text-rose-300"
              onClick={() => {
                setOpen(false);
                setMobileMenuOpen(false);
              }}
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
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        {/* 모바일 전용 헤더: md 미만에서만 표시 */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:hidden">
          <Link
            href="/personal-markets/spot"
            className="flex min-w-0 items-center gap-3"
            onClick={() => {
              setOpen(false);
              setMobileMenuOpen(false);
            }}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-cyan-400/10 ring-1 ring-cyan-400/40">
              <Image
                src="/cain-mark.png"
                alt="CAIN"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>

            <span className="truncate text-xl font-semibold tracking-wide text-[var(--brand)]">
              CAIN
            </span>
          </Link>

          <div className="relative flex items-center gap-2">
            <button
              onClick={handleProfileClick}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center text-[var(--brand)]"
              aria-label="profile menu"
              aria-expanded={open}
            >
              <ProfileIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleMobileMenuClick}
              className="h-10 min-w-[58px] rounded-full bg-white/10 hover:bg-white/15 grid place-items-center px-3 text-sm font-semibold text-[var(--brand)]"
              aria-label="mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "닫기" : "메뉴"}
            </button>

            {open && <ProfileMenu />}
          </div>
        </div>

        {/* 모바일 메뉴: md 미만에서만 표시 */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-zinc-950/95 md:hidden">
            <nav className="grid gap-1 px-4 py-3">
              {navItems.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onNavClick(it)}
                  className={[
                    "flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.06]",
                    it.premium ? "premium-link" : "text-white/90",
                  ].join(" ")}
                >
                  <span>{it.name}</span>
                  {it.gated && !isAuthed ? (
                    <span className="text-xs text-white/40">회원 전용</span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* 데스크탑 전용 헤더: 기존 PC 레이아웃 유지 */}
        <div className="mx-auto hidden max-w-7xl px-6 h-16 md:h-20 md:flex items-center justify-between">
          {/* 왼쪽: 로고 + 브랜드 문구 */}
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

          {/* 가운데: 상단 메뉴 */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5">
            {navItems.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavClick(it)}
                className={[
                  "nav-link text-sm lg:text-base font-medium transition flex items-center gap-1 whitespace-nowrap",
                  it.premium ? "premium-link" : "",
                ].join(" ")}
              >
                {it.name}
              </Link>
            ))}
          </nav>

          {/* 오른쪽: 프로필 아이콘 드롭다운 */}
          <div className="ml-auto md:ml-0 relative flex items-center gap-3">
            <button
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center text-[var(--brand)]"
              aria-label="profile menu"
              aria-expanded={open}
            >
              <ProfileIcon className="w-5 h-5" />
            </button>

            {open && <ProfileMenu />}
          </div>
        </div>
      </header>

      {/* 비회원 게이트 모달 */}
      <AuthGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        nextHref={gateNext}
        message={gateMessage}
      />
    </>
  );
}