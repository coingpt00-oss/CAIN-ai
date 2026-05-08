// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDeviceId } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<{
    country: string;
    username: string;
    password: string;
    remember: boolean;
  }>({
    country: "South Korea",
    username: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onChange = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.username || !form.password) {
      setMsg("닉네임과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const device_id = getOrCreateDeviceId();
      const platform =
        typeof navigator !== "undefined" ? navigator.platform : "unknown";
      const device_name =
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: form.country,
          username: form.username,
          password: form.password,
          remember: form.remember,
          device_id,
          platform,
          device_name,
        }),
      });

      const j = await r.json();

      if (!j.ok) {
        setMsg(j.message || j.error || "login_failed");
        return;
      }

      // ✅ 로그인 상태 저장
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("cain_user", JSON.stringify(j.user));
          window.localStorage.setItem("cain_token", j.token);
        }
      } catch {
        // localStorage 막혀 있어도 로그인 자체는 성공이니 진행
      }

      // ✅ 임시 비밀번호 로그인 사용자는 새 비밀번호 변경 화면으로 보냅니다.
      const nextHref = j.user?.must_change_password
        ? "/change-password"
        : "/personal-markets/spot";

      setMsg(
        j.user?.must_change_password
          ? "로그인 성공! 새 비밀번호로 변경해주세요."
          : "로그인 성공!"
      );

      // HeaderClient가 localStorage를 읽는 구조라 새로고침 포함 이동이 가장 확실함
      if (typeof window !== "undefined") {
        window.location.href = nextHref;
      } else {
        router.push(nextHref);
      }
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
          CAIN 로그인
        </h1>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <select
            value={form.country}
            onChange={(e) => onChange("country", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

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

          {/* ✅ 로그인 기억하기 + 비번/닉네임 찾기 링크 */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => onChange("remember", e.target.checked)}
                className="accent-[var(--brand)]"
              />
              로그인 기억하기
            </label>

            <a
              href="/forgot"
              className="text-xs text-[var(--brand)] hover:underline"
            >
              닉네임/비밀번호를 잊어버리셨나요?
            </a>
          </div>
        </div>

        {msg && (
          <div className="text-sm rounded-xl border border-white/10 bg-white/5 p-3">
            {msg}
          </div>
        )}

        <button
          disabled={loading}
          onClick={onSubmit}
          className="w-full rounded-xl bg-[var(--brand)]/20 text-[var(--brand)] px-4 py-3 font-semibold hover:bg-[var(--brand)]/30 transition disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </div>
    </main>
  );
}