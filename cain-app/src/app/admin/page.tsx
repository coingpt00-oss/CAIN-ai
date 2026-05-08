// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CainUser = {
  uid: string;
  username: string;
  role: string;
};

type PendingUser = {
  uid: string;
  username: string;
  name: string;
  phone: string;
  exchange: string;
  nationality: string | null;
  created_at: string;
  is_verified: boolean;
};

export default function AdminPage() {
  const router = useRouter();

  // ✅ 관리자 체크 상태
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  // ✅ 가입 대기 회원 리스트 상태
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────
  // 1) 관리자 여부 체크 + 대기 회원 불러오기
  // ─────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const raw = localStorage.getItem("cain_user");
        const token = localStorage.getItem("cain_token");

        if (!raw || !token) {
          // 로그인 안 했으면 로그인 페이지로
          router.replace("/login");
          return;
        }

        const user = JSON.parse(raw) as CainUser;

        if (user.role !== "admin") {
          // 관리자 아니면 메인으로 튕기기
          router.replace("/");
          return;
        }

        // ✅ 여기까지 왔으면 관리자
        setAllowed(true);

        // ✅ 관리자면 가입 대기자 불러오기
        await fetchPending(token);
      } catch {
        router.replace("/");
      } finally {
        setReady(true);
      }
    };

    run();
  }, [router]);

  // ─────────────────────────────────────
  // 2) API 호출 함수들
  // ─────────────────────────────────────
  async function fetchPending(token: string) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/users/pending", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "failed_to_load");
      }

      setUsers(json.users as PendingUser[]);
    } catch (e: any) {
      setError(e?.message ?? "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(uid: string) {
    const token = localStorage.getItem("cain_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/users/${uid}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "approve_failed");
      }

      // 승인된 유저는 리스트에서 제거
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (e: any) {
      alert(`승인 실패: ${e?.message ?? "unknown_error"}`);
    }
  }

  async function handleReject(uid: string) {
    const token = localStorage.getItem("cain_token");
    if (!token) return;

    if (!confirm("정말 이 가입 신청을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/admin/users/${uid}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "reject_failed");
      }

      // 삭제된 유저는 리스트에서 제거
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (e: any) {
      alert(`삭제 실패: ${e?.message ?? "unknown_error"}`);
    }
  }

  // 관리자 체크 끝나기 전에는 아무것도 안 보여줌
  if (!ready || !allowed) return null;

  // ─────────────────────────────────────
  // 3) 화면
  // ─────────────────────────────────────
  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">
        보스 전용 관리자 대시보드
      </h1>

      <p className="text-sm text-neutral-400 mb-8">
        여기서 가입 회원 승인 / 차단, 통계 확인 등을 순차적으로 붙여갈 거다나까.
      </p>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-neutral-400">
          대기 중인 가입 정보를 불러오는 중…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          불러오기 실패: {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-neutral-400">
          현재 승인 대기 중인 회원이 없사옵니다.
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-neutral-300">
              <tr>
                <th className="px-3 py-2 text-left">UID</th>
                <th className="px-3 py-2 text-left">닉네임</th>
                <th className="px-3 py-2 text-left">이름</th>
                <th className="px-3 py-2 text-left">전화번호</th>
                <th className="px-3 py-2 text-left">거래소</th>
                <th className="px-3 py-2 text-left">국적</th>
                <th className="px-3 py-2 text-left">가입일</th>
                <th className="px-3 py-2 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.uid}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="px-3 py-2 font-mono text-xs">{u.uid}</td>
                  <td className="px-3 py-2">{u.username}</td>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.phone}</td>
                  <td className="px-3 py-2">{u.exchange.toUpperCase()}</td>
                  <td className="px-3 py-2">{u.nationality || "-"}</td>
                  <td className="px-3 py-2 text-xs text-neutral-400">
                    {new Date(u.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleApprove(u.uid)}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 mr-2"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleReject(u.uid)}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
