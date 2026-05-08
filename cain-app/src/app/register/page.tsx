// src/app/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { getOrCreateDeviceId } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

const REF_LINKS = {
  binance: "https://YOUR_BINANCE_REF_LINK",
  okx: "https://YOUR_OKX_REF_LINK",
  bitget: "https://YOUR_BITGET_REF_LINK",
  bybit: "https://YOUR_BYBIT_REF_LINK",
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    nationality: "South Korea",
    exchange: "binance",
    uid: "",
    name: "",
    phone: "",
    username: "",
    password: "",
  });

  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pwOk = form.password.length > 0 && form.password === passwordConfirm;

  const onSubmit = async () => {
    if (!pwOk) {
      setMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const device_id = getOrCreateDeviceId();

      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, device_id }),
      });

      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error || "register_failed");
        return;
      }

      setMsg("가입 신청 완료! 보스 승인 대기 상태입니다.");
    } catch {
      setMsg("network_error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full px-3 md:px-5 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-[var(--brand)]">
          CAIN 회원가입
        </h1>

        {/* ✅ 1단계 안내 */}
        <p className="text-sm opacity-80">
          1. 거래소 선택해서 가입하기
        </p>

        {/* ✅ 거래소 가입 카드 4개 (레퍼럴 멘트 제거 / CoinGPT 톤) */}
        <div className="grid grid-cols-2 gap-3">
          {(["binance", "okx", "bitget", "bybit"] as const).map((ex) => (
            <a
              key={ex}
              href={REF_LINKS[ex]}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
            >
              <div className="text-base font-semibold text-white">
                {ex.toUpperCase()}
              </div>
              <div className="mt-1 text-sm text-white/80">
                클릭해서 가입하기 →
              </div>
              <div className="mt-2 inline-block rounded-full bg-[var(--brand)]/15 px-2 py-0.5 text-xs text-[var(--brand)]">
                공식 인증
              </div>
            </a>
          ))}
        </div>

        {/* ✅ 2단계 안내 */}
        <p className="text-sm opacity-80 pt-2">
          2. 위에서 가입한 거래소와 UID 입력하고 가입하기
        </p>

        {/* ✅ 입력 폼 */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="block text-sm opacity-80">국적</label>
          <select
            value={form.nationality}
            onChange={(e) => onChange("nationality", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="block text-sm opacity-80 mt-2">
            가입한 거래소
          </label>
          <select
            value={form.exchange}
            onChange={(e) => onChange("exchange", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          >
            <option value="binance">Binance</option>
            <option value="okx">OKX</option>
            <option value="bitget">Bitget</option>
            <option value="bybit">Bybit</option>
          </select>

          <input
            placeholder="UID"
            value={form.uid}
            onChange={(e) => onChange("uid", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            placeholder="이름"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            placeholder="전화번호"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            placeholder="닉네임"
            value={form.username}
            onChange={(e) => onChange("username", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            placeholder="비밀번호"
            type="password"
            value={form.password}
            onChange={(e) => onChange("password", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            placeholder="비밀번호 확인"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          {/* 비밀번호 불일치 경고 */}
          {passwordConfirm && form.password !== passwordConfirm && (
            <p className="text-xs text-red-400 mt-1">
              비밀번호가 일치하지 않습니다.
            </p>
          )}
        </div>

        {/* 메시지 */}
        {msg && (
          <div className="text-sm rounded-xl border border-white/10 bg-white/5 p-3">
            {msg}
          </div>
        )}

        {/* 가입 버튼 */}
        <button
          disabled={loading || !pwOk}
          onClick={onSubmit}
          className="w-full rounded-xl bg-[var(--brand)]/20 text-[var(--brand)] px-4 py-3 font-semibold hover:bg-[var(--brand)]/30 transition disabled:opacity-60"
        >
          {loading ? "가입 처리중..." : "가입 신청하기"}
        </button>

        <div className="text-sm opacity-70 text-center">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-[var(--brand)] underline">
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
