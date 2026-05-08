// src/app/forgot/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXCHANGES = ["BINANCE", "BYBIT", "BITGET", "OKX"];

export default function ForgotPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    exchange: "BINANCE",
    uid: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    found?: boolean;
    username_masked?: string;
    username?: string;
    temp_password?: string;
  } | null>(null);

  const onChange = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const call = async (action: "lookup" | "reset") => {
    setLoading(true);
    setMsg(null);
    setResult(null);

    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...form }),
      });

      const j = await r.json();

      if (!r.ok || !j.ok) {
        setMsg(j.message || j.error || "failed");
        return;
      }

      setResult(j);

      if (j.found === false) {
        setMsg(j.message || "입력하신 정보와 일치하는 가입 정보를 찾지 못했습니다.");
        return;
      }

      if (action === "lookup") {
        setMsg(j.message || "가입 정보를 찾았습니다.");
        return;
      }

      setMsg(j.message || "임시 비밀번호가 발급되었습니다.");
    } catch {
      setMsg("network_error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full px-3 md:px-5 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-[var(--brand)]">
          닉네임/비밀번호 찾기
        </h1>

        <div className="text-sm text-white/60">
          입력하신 정보가 <span className="text-white/80">기존 가입 정보와 일치</span>할 경우에만
          닉네임 확인 및 임시 비밀번호 발급이 가능합니다.
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <input
            placeholder="이름"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            placeholder="전화번호(숫자만 입력 권장)"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <select
            value={form.exchange}
            onChange={(e) => onChange("exchange", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          >
            {EXCHANGES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <input
            placeholder="거래소 UID"
            value={form.uid}
            onChange={(e) => onChange("uid", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />
        </div>

        {msg && (
          <div className="text-sm rounded-xl border border-white/10 bg-white/5 p-3 whitespace-pre-wrap">
            {msg}
          </div>
        )}

        {result?.found === true && (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 space-y-2">
            {(result.username || result.username_masked) && (
              <div className="text-sm">
                닉네임:{" "}
                <span className="font-semibold text-[var(--brand)]">
                  {result.username || result.username_masked}
                </span>
              </div>
            )}

            {result.temp_password && (
              <div className="text-sm space-y-1">
                <div>
                  임시 비밀번호:{" "}
                  <span className="font-mono font-semibold text-emerald-300">
                    {result.temp_password}
                  </span>
                </div>
                <div className="text-xs text-white/60">
                  임시 비밀번호로 로그인하면 비밀번호 변경 페이지로 이동합니다. 새 비밀번호로 반드시 변경해주세요.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            disabled={loading}
            onClick={() => call("lookup")}
            className="w-full rounded-xl bg-white/10 text-white px-4 py-3 font-semibold hover:bg-white/15 transition disabled:opacity-60"
          >
            {loading ? "처리 중..." : "닉네임 찾기"}
          </button>

          <button
            disabled={loading}
            onClick={() => call("reset")}
            className="w-full rounded-xl bg-[var(--brand)]/20 text-[var(--brand)] px-4 py-3 font-semibold hover:bg-[var(--brand)]/30 transition disabled:opacity-60"
          >
            {loading ? "처리 중..." : "임시 비밀번호 발급"}
          </button>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-transparent border border-white/10 text-white/80 px-4 py-3 font-semibold hover:bg-white/5 transition"
        >
          로그인으로 돌아가기
        </button>
      </div>
    </main>
  );
}