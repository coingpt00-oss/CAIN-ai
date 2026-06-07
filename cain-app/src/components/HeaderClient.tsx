// src/components/HeaderClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import AuthGateModal from "@/components/AuthGateModal";

// ===== ?ㅻ━吏???꾨줈???꾩씠肄?(??묎텒 臾몄젣 ?? =====
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
  role?: string; // "admin" ?대㈃ 愿由ъ옄
};

type NavItem = {
  name: string;
  href: string;
  gated?: boolean; // 濡쒓렇???꾩슂(鍮꾪쉶???대┃ ??紐⑤떖)
  premium?: boolean; // ?꾨━誘몄뾼 硫붾돱: premium-link ?대옒???곸슜
};

// ??蹂댁뒪 ?뺤콉: "蹂댁씠??嫄?鍮꾪쉶?먮룄 ?꾨?" / "?꾨Ⅴ硫?紐⑤떖濡??좊룄"
// ??NOTE: /pages/* ?덇굅???쇱슦???쒓굅?덉쑝?? ?댁젣 ?뺤떇 ?쇱슦??/markets ??濡??대룞
const navItems: NavItem[] = [
  { name: "코인시세", href: "/personal-markets/spot", gated: true, premium: true },
  { name: "차트", href: "/charts" },
  { name: "뉴스", href: "/news" },
  { name: "커뮤니티", href: "/community", premium: true },
  { name: "에어드랍", href: "/airdrops", gated: true, premium: true },
  { name: "이벤트", href: "/events", gated: true, premium: true },
  { name: "거래소 공지", href: "/exchange-notices" },
];

export default function HeaderClient() {
  const [user, setUser] = useState<CainUser | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  // auth gate modal
  const [gateOpen, setGateOpen] = useState(false);
  const [gateNext, setGateNext] = useState<string>("/");

  // ??濡쒓렇???곹깭 濡쒕뱶
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const raw = window.localStorage.getItem("cain_user");
      if (!raw) return;

      const parsed = JSON.parse(raw) as CainUser;
      setUser(parsed);
      setIsAuthed(true);
    } catch {
      // 臾댁떆
    }
  }, []);

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cain_user");
        window.localStorage.removeItem("cain_token");
      }
    } catch {
      // 臾댁떆
    }
    setUser(null);
    setIsAuthed(false);
    setOpen(false);

    // ??濡쒓렇?꾩썐 ?꾩뿉???뺤떇 ?쇱슦?몃줈 ?대룞
    if (typeof window !== "undefined") {
      window.location.href = "/personal-markets/spot";
    }
  };

  const handleProfileClick = () => {
    setOpen((v) => !v);
  };

  // ??硫붾돱 ?대┃ ?몃뱾?? gated?몃뜲 鍮꾪쉶?먯씠硫?紐⑤떖
  const onNavClick = (it: NavItem) => (e: ReactMouseEvent) => {
    if (!it.gated) return; // 怨듦컻 硫붾돱???대룞
    if (isAuthed) return; // ?뚯썝?대㈃ ?대룞

    // 鍮꾪쉶?? ?대룞 留됯퀬 紐⑤떖
    e.preventDefault();
    setGateNext(it.href);
    setGateOpen(true);
  };

  const gateMessage = useMemo(() => {
    return "코인시세 / 에어드랍 / 이벤트는 인증 회원에게만 제공됩니다. 로그인 또는 회원가입 후 이용하실 수 있습니다.";
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 h-16 md:h-20 flex items-center justify-between">
          {/* ===== 醫뚯륫: 濡쒓퀬 + 釉뚮옖??臾멸뎄 ===== */}
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

          {/* ===== 媛?대뜲: ?곷떒 硫붾돱 (鍮꾪쉶?먮룄 ?꾨? ?몄텧) ===== */}
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

          {/* ===== ?곗륫: ?꾨줈???꾩씠肄??쒕∼?ㅼ슫 ===== */}
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
                      CAIN ?뚯썝 ?꾩슜 湲곕뒫(吏?쑣룹뿉?대뱶?띉룹씠踰ㅽ듃쨌而ㅻ??덊떚 湲?곌린)??
                      ?댁슜?섏떆?ㅻ㈃ 濡쒓렇???뚯썝媛?낆씠 ?꾩슂?⑸땲??
                    </div>
                    <Link
                      href="/login"
                      className="block px-3 py-2 mt-1 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      濡쒓렇??
                    </Link>
                    <Link
                      href="/register"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      ?뚯썝媛??
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs text-white/60">
                      {user?.username} ??
                    </div>

                    <Link
                      href="/mypage"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      留덉씠?섏씠吏
                    </Link>

                    <Link
                      href="/prefs"
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      ?ㅼ젙(?몄뼱/?듯솕/?뚮쭏)
                    </Link>

                    {user?.role === "admin" && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 rounded-lg text-sm hover:bg-white/5 text-rose-300"
                        onClick={() => setOpen(false)}
                      >
                        愿由ъ옄 ??쒕낫??
                      </Link>
                    )}

                    <button
                      className="w-full text-left px-3 py-2 mt-1 rounded-lg text-sm hover:bg-white/5 text-red-300"
                      onClick={handleLogout}
                    >
                      濡쒓렇?꾩썐
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== 鍮꾪쉶??寃뚯씠??紐⑤떖 ===== */}
      <AuthGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        nextHref={gateNext}
        message={gateMessage}
      />
    </>
  );
}
