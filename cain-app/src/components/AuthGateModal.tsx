"use client";

import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  nextHref?: string; // 로그인 후 이동시키고 싶은 목적지
};

export default function AuthGateModal({
  open,
  onClose,
  title = "회원 전용 기능입니다",
  message = "해당 기능은 CAIN 인증 회원에게만 제공됩니다. 로그인/회원가입 후 이용하실 수 있습니다.",
  nextHref = "/",
}: Props) {
  if (!open) return null;

  const goLoginHref = `/login?next=${encodeURIComponent(nextHref)}`;
  const goRegisterHref = `/register?next=${encodeURIComponent(nextHref)}`;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label="auth gate modal"
    >
      {/* dim */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative w-[92vw] max-w-md rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--brand)]">
              {title}
            </h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-white/60 hover:text-white hover:bg-white/5"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={goLoginHref}
            className="rounded-xl bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/25 hover:bg-[var(--brand)]/20 px-4 py-2 text-sm font-medium text-center"
            onClick={onClose}
          >
            로그인
          </Link>

          <Link
            href={goRegisterHref}
            className="rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/8 px-4 py-2 text-sm font-medium text-center"
            onClick={onClose}
          >
            회원가입
          </Link>
        </div>

        <p className="mt-3 text-xs text-white/35">
          로그인 후 원래 보시려던 페이지로 자동 이동됩니다.
        </p>
      </div>
    </div>
  );
}
