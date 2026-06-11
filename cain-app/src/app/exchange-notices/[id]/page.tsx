// src/app/exchange-notices/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ExchangeNoticeDetailClient from "./ExchangeNoticeDetailClient";

export const dynamic = "force-dynamic";

function hasLocalCainUser() {
  try {
    if (typeof window === "undefined") return false;

    const raw = window.localStorage.getItem("cain_user");
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    return Boolean(parsed?.uid || parsed?.username);
  } catch {
    return false;
  }
}

function LoginRequiredForExchangeNoticeDetail({ nextHref }: { nextHref: string }) {
  return (
    <main className="w-full px-4 py-10 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[rgba(18,203,255,0.28)] bg-black/45 p-6 md:p-8">
        <div className="inline-flex rounded-full border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-4 py-1.5 text-sm font-semibold text-[var(--brand)]">
          CAIN PREMIUM
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-white md:text-3xl">
          거래소 공지 상세는 인증 회원 전용입니다.
        </h1>

        <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">
          거래소 공지 상세 내용과 CAIN AI 분석은 로그인 또는 회원가입 후 이용하실 수 있습니다.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/login?next=${encodeURIComponent(nextHref)}`}
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-black hover:opacity-90"
          >
            로그인하고 상세 보기
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
          >
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function ExchangeNoticeDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId || "");
  const nextHref = id ? `/exchange-notices/${encodeURIComponent(id)}` : "/exchange-notices";

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(hasLocalCainUser());
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return (
      <main className="w-full px-4 py-10 md:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/45 p-6 text-sm text-white/60">
          거래소 공지 상세 접근 권한을 확인하는 중입니다.
        </section>
      </main>
    );
  }

  if (!isAuthed) {
    return <LoginRequiredForExchangeNoticeDetail nextHref={nextHref} />;
  }

  return <ExchangeNoticeDetailClient id={id} />;
}