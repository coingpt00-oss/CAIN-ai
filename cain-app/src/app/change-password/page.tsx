// src/app/change-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    current_password: "",
    new_password: "",
    new_password_confirm: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (
      !form.username ||
      !form.current_password ||
      !form.new_password ||
      !form.new_password_confirm
    ) {
      setMsg("모든 항목을 입력해주세요.");
      return;
    }

    if (form.new_password !== form.new_password_confirm) {
      setMsg("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      });

      const j = await r.json();

      if (!r.ok || !j.ok) {
        setMsg(j.error || "비밀번호 변경 실패");
        return;
      }

      // ✅ 전기기 로그아웃 처리
      if (typeof window !== "undefined") {
        localStorage.removeItem("cain_user");
        localStorage.removeItem("cain_token");
      }

      setMsg("비밀번호가 변경되었습니다. 다시 로그인해주세요.");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
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
          비밀번호 변경
        </h1>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <input
            placeholder="닉네임"
            value={form.username}
            onChange={(e) => onChange("username", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            type="password"
            placeholder="현재 비밀번호 (임시 비밀번호)"
            value={form.current_password}
            onChange={(e) => onChange("current_password", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            type="password"
            placeholder="새 비밀번호"
            value={form.new_password}
            onChange={(e) => onChange("new_password", e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />

          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={form.new_password_confirm}
            onChange={(e) =>
              onChange("new_password_confirm", e.target.value)
            }
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          />
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
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </div>
    </main>
  );
}
