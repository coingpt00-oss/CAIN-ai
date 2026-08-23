// src/app/mypage/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CrownMaskIcon, { tierColor } from "@/components/CrownMaskIcon";

type CainUser = {
  uid: string;
  username: string;
  exchange: string;
  nationality: string | null;
  role?: string; // "admin" | "user"
  created_at?: string;
  tier?: number; // ✅ DB tier
  must_change_password?: boolean | null;
  username_changed_at?: string | null;
};

type NotiPrefs = {
  airdrop: boolean;
  event: boolean;
  community: boolean;
};

type MyPost = {
  id: number;
  title: string;
  category: string;
  coin_symbol: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string | null;
};

type MyPostsResult = {
  posts: MyPost[];
  total: number;
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

function daysBetween(fromISO: string) {
  const from = new Date(fromISO).getTime();
  const now = Date.now();
  return Math.floor(Math.max(0, now - from) / (1000 * 60 * 60 * 24));
}

function formatPostDate(iso: string | null) {
  if (!iso) return "-";

  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case "free":
      return "자유";
    case "coin":
      return "코인";
    case "strategy":
      return "전략";
    case "notice":
      return "공지";
    default:
      return category || "-";
  }
}

function buildPageButtons(current: number, totalPages: number) {
  if (totalPages <= 0) return [];

  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);

  for (let p = current - 2; p <= current + 2; p += 1) {
    if (p >= 1 && p <= totalPages) {
      pages.add(p);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

// ─────────────────────────────
// API helpers
// ─────────────────────────────

// 알림 prefs
async function fetchPrefs(uid: string): Promise<NotiPrefs | null> {
  const res = await fetch("/api/user/prefs", {
    headers: { "x-cain-uid": uid },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) return null;
  return {
    airdrop: !!json.prefs?.airdrop,
    event: !!json.prefs?.event,
    community: !!json.prefs?.community,
  };
}

async function savePrefs(uid: string, next: NotiPrefs): Promise<boolean> {
  const res = await fetch("/api/user/prefs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cain-uid": uid,
    },
    body: JSON.stringify(next),
  });
  const json = await res.json().catch(() => null);
  return !!(res.ok && json?.ok);
}

// 누적 출석
async function fetchAttendanceCount(uid: string): Promise<number> {
  const res = await fetch("/api/me/monthly-logins", {
    headers: { "x-cain-uid": uid },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) return 0;

  const n = Number(json.totalLogins ?? json.count ?? json.monthlyLogins ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ✅ DB 프로필 (tier 포함)
async function fetchProfile(uid: string): Promise<CainUser | null> {
  const res = await fetch("/api/me/profile", {
    headers: { "x-cain-uid": uid },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) return null;
  return json.user as CainUser;
}

// ✅ 내가 쓴 글
async function fetchMyPosts(page = 1): Promise<MyPostsResult> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("cain_token") || ""
      : "";

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api/me/posts?page=${page}`, {
    headers,
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "posts_fetch_failed");
  }

  return {
    posts: Array.isArray(json.posts) ? (json.posts as MyPost[]) : [],
    total: Number(json.total ?? 0),
    page: Number(json.page ?? page),
    totalPages: Number(json.totalPages ?? 0),
    hasPrev: !!json.hasPrev,
    hasNext: !!json.hasNext,
  };
}

function usernameErrorMessage(error: string, remainingDays?: number) {
  switch (error) {
    case "missing_username":
      return "새 닉네임을 입력해 주세요.";
    case "username_length_invalid":
      return "닉네임은 2~12자로 입력해 주세요.";
    case "username_format_invalid":
      return "닉네임은 한글, 영문, 숫자, 언더바(_)만 사용할 수 있습니다.";
    case "reserved_username":
      return "사용할 수 없는 닉네임입니다.";
    case "username_already_taken":
      return "이미 사용 중인 닉네임입니다.";
    case "username_change_cooldown":
      return `닉네임은 30일에 1회만 변경 가능합니다. ${remainingDays ?? ""}일 후 다시 시도해 주세요.`;
    case "unauthorized":
    case "no_token":
    case "device_not_found":
    case "device_revoked":
      return "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.";
    default:
      return error || "닉네임 변경에 실패했습니다.";
  }
}

// ─────────────────────────────

export default function MyPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<CainUser | null>(null);
  const [tier, setTier] = useState<number>(0);

  const [attendanceCount, setAttendanceCount] = useState<number>(0);

  const [prefs, setPrefs] = useState<NotiPrefs>({
    airdrop: true,
    event: true,
    community: true,
  });

  const [saving, setSaving] = useState(false);

  // ✅ 닉네임 변경
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);

  // ✅ 내가 쓴 글
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [myPostsError, setMyPostsError] = useState<string | null>(null);
  const [myPostsPage, setMyPostsPage] = useState(1);
  const [myPostsTotal, setMyPostsTotal] = useState(0);
  const [myPostsTotalPages, setMyPostsTotalPages] = useState(0);

  async function loadMyPosts(page = 1) {
    setMyPostsLoading(true);
    setMyPostsError(null);

    try {
      const result = await fetchMyPosts(page);
      setMyPosts(result.posts);
      setMyPostsPage(result.page);
      setMyPostsTotal(result.total);
      setMyPostsTotalPages(result.totalPages);
    } catch {
      setMyPostsError("내가 쓴 글을 불러오지 못했습니다.");
    } finally {
      setMyPostsLoading(false);
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem("cain_user");
    const token = localStorage.getItem("cain_token");

    if (!raw || !token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const baseUser = JSON.parse(raw) as CainUser;

        // 1️⃣ DB 프로필 (tier 포함)
        const profile = await fetchProfile(baseUser.uid);
        if (!profile) throw new Error("profile_fail");

        setUser(profile);
        setTier(Number(profile.tier ?? 0));
        setUsernameDraft(profile.username ?? "");

        // 2️⃣ 누적 출석
        const m = await fetchAttendanceCount(profile.uid);
        setAttendanceCount(m);

        // 3️⃣ 알림 prefs
        const p = await fetchPrefs(profile.uid);
        if (p) setPrefs(p);

        // 4️⃣ 내가 쓴 글
        await loadMyPosts(1);
      } catch {
        router.replace("/login");
        return;
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  // ✅ 렌더 가드
  if (!ready || !user) return null;

  const joinedISO = user.created_at ?? new Date().toISOString();
  const days = daysBetween(joinedISO);
  const tierHex = tierColor(tier);
  const needForNext = Math.max(0, 10 - attendanceCount);
  const myPostPageButtons = buildPageButtons(myPostsPage, myPostsTotalPages);

  async function toggle(key: keyof NotiPrefs) {
    // ✅ TS 에러 해결 + 안전 가드
    if (!user) return;

    // ✅ 실패 시 정확히 롤백하려면 prev를 잡고 가야 합니다요
    const prev = prefs;
    const next = { ...prev, [key]: !prev[key] };

    setPrefs(next);

    setSaving(true);
    const ok = await savePrefs(user.uid, next);
    setSaving(false);

    if (!ok) {
      setPrefs(prev);
      alert("저장 실패. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function changeUsername() {
    if (!user) return;

    const nextUsername = usernameDraft.trim();

    if (!nextUsername) {
      setUsernameMsg("새 닉네임을 입력해 주세요.");
      return;
    }

    if (nextUsername.toLowerCase() === String(user.username || "").toLowerCase()) {
      setUsernameMsg("현재 닉네임과 같습니다.");
      return;
    }

    if (nextUsername.length < 2 || nextUsername.length > 12) {
      setUsernameMsg("닉네임은 2~12자로 입력해 주세요.");
      return;
    }

    if (!/^[가-힣a-zA-Z0-9_]+$/.test(nextUsername)) {
      setUsernameMsg("닉네임은 한글, 영문, 숫자, 언더바(_)만 사용할 수 있습니다.");
      return;
    }

    setUsernameSaving(true);
    setUsernameMsg(null);

    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("cain_token") || ""
          : "";

      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/me/username", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ username: nextUsername }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setUsernameMsg(
          usernameErrorMessage(json?.error || "username_update_failed", json?.remaining_days)
        );
        return;
      }

      const updatedUsername = json.user?.username || nextUsername;
      const updatedUser: CainUser = {
        ...user,
        username: updatedUsername,
        username_changed_at: json.user?.username_changed_at ?? new Date().toISOString(),
      };

      setUser(updatedUser);
      setUsernameDraft(updatedUsername);
      setUsernameMsg(
        json.changed === false
          ? "이미 같은 닉네임입니다."
          : "닉네임이 변경되었습니다."
      );

      // ✅ Header/커뮤니티/글쓰기 등 localStorage 기반 화면도 즉시 맞춰줍니다.
      try {
        const raw = window.localStorage.getItem("cain_user");
        const prev = raw ? JSON.parse(raw) : {};
        window.localStorage.setItem(
          "cain_user",
          JSON.stringify({
            ...prev,
            ...updatedUser,
            username: updatedUsername,
          })
        );
      } catch {}
    } catch {
      setUsernameMsg("network_error");
    } finally {
      setUsernameSaving(false);
    }
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 text-cyan-300">마이페이지</h1>

      <div className="text-sm text-neutral-400 mb-8">
        내 계정 상태와 알림 설정을 관리합니다.
      </div>

      {user.must_change_password ? (
        <section className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-yellow-300">
                임시 비밀번호를 사용 중입니다.
              </div>
              <div className="mt-1 text-sm text-white/70">
                보안을 위해 새 비밀번호로 변경해 주세요.
              </div>
            </div>

            <Link
              href="/change-password"
              className="inline-flex items-center justify-center rounded-full border border-yellow-300/50 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-300/10"
            >
              비밀번호 변경하기
            </Link>
          </div>
        </section>
      ) : null}

      {/* 계정 카드 */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold flex items-center gap-3">
              <span>{user.username} 님</span>

              <span className="inline-flex items-center gap-2">
                <CrownMaskIcon src="/tier-logo.png" size={36} color={tierHex} />
                <span className="text-xs opacity-80">
                  {days}일째 · 출석 {attendanceCount}회
                  {saving && <span className="ml-2 opacity-60">저장 중…</span>}
                </span>
              </span>
            </div>

            <div className="mt-2 text-sm text-neutral-300">
              <span className="text-neutral-500">국적</span>{" "}
              <span className="mr-3">{user.nationality ?? "-"}</span>
              <span className="text-neutral-500">거래소</span>{" "}
              <span className="mr-3">{(user.exchange ?? "").toUpperCase()}</span>
              <span className="text-neutral-500">가입일</span>{" "}
              <span>{new Date(joinedISO).toLocaleString("ko-KR")}</span>
            </div>

            <div className="mt-2 text-xs text-neutral-400">
              다음 등급까지{" "}
              <span className="text-cyan-300 font-semibold">{needForNext}회</span>{" "}
              더 출석하시면 됩니다.{" "}
              <span className="opacity-70">(10회 기준)</span>
            </div>
          </div>

          {user.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              관리자 대시보드
            </Link>
          )}
        </div>
      </section>

      {/* 닉네임 변경 */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 mb-6">
        <h2 className="text-lg font-bold mb-3">닉네임 변경</h2>

        <div className="text-xs text-neutral-400 mb-3">
          닉네임은 2~12자, 한글/영문/숫자/언더바(_)만 사용할 수 있습니다. 변경은 30일에 1회만 가능합니다.
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={usernameDraft}
            onChange={(e) => setUsernameDraft(e.target.value)}
            maxLength={12}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
            placeholder="새 닉네임"
            disabled={usernameSaving}
          />

          <button
            onClick={changeUsername}
            disabled={usernameSaving}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/25 disabled:opacity-50"
          >
            {usernameSaving ? "변경 중..." : "닉네임 변경"}
          </button>
        </div>

        {usernameMsg ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
            {usernameMsg}
          </div>
        ) : null}
      </section>

      {/* 내가 쓴 글 */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold">내가 쓴 글</h2>
            <div className="mt-1 text-xs text-neutral-400">
              커뮤니티에 작성한 글을 10개 단위로 나눠 표시합니다.
            </div>
          </div>

          <Link
            href="/community/new"
            className="inline-flex items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/25"
          >
            글쓰기
          </Link>
        </div>

        {myPostsLoading ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-neutral-400">
            내가 쓴 글을 불러오는 중입니다...
          </div>
        ) : myPostsError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-5 text-sm text-red-200">
            {myPostsError}
          </div>
        ) : myPosts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-neutral-400">
            아직 작성한 글이 없습니다.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_80px_110px] gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-neutral-400">
                <div>제목</div>
                <div>카테고리</div>
                <div>코인</div>
                <div className="text-right">조회</div>
                <div className="text-right">추천</div>
                <div className="text-right">댓글</div>
                <div className="text-right">작성일</div>
              </div>

              <div className="divide-y divide-white/10">
                {myPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="block px-4 py-4 hover:bg-white/[0.04]"
                  >
                    <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_80px_110px] gap-2 items-center text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white/90">
                          {post.title}
                        </div>
                      </div>

                      <div className="text-neutral-400">{categoryLabel(post.category)}</div>
                      <div className="text-neutral-400">{post.coin_symbol || "-"}</div>
                      <div className="text-right text-neutral-400">{post.views_count}</div>
                      <div className="text-right text-neutral-400">{post.likes_count}</div>
                      <div className="text-right text-neutral-400">{post.comments_count}</div>
                      <div className="text-right text-neutral-500">
                        {formatPostDate(post.created_at)}
                      </div>
                    </div>

                    <div className="md:hidden">
                      <div className="font-semibold text-white/90">{post.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                        <span>{categoryLabel(post.category)}</span>
                        <span>{post.coin_symbol || "-"}</span>
                        <span>조회 {post.views_count}</span>
                        <span>추천 {post.likes_count}</span>
                        <span>댓글 {post.comments_count}</span>
                        <span>{formatPostDate(post.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {myPostsTotalPages > 1 ? (
              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
                <div className="text-xs text-neutral-400">
                  전체 {myPostsTotal}개 · {myPostsPage}/{myPostsTotalPages}페이지
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadMyPosts(myPostsPage - 1)}
                    disabled={myPostsLoading || myPostsPage <= 1}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    이전
                  </button>

                  {myPostPageButtons.map((page, idx) => {
                    const prev = myPostPageButtons[idx - 1];
                    const needsGap = prev && page - prev > 1;

                    return (
                      <span key={page} className="inline-flex items-center gap-2">
                        {needsGap ? (
                          <span className="text-xs text-neutral-500">...</span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => loadMyPosts(page)}
                          disabled={myPostsLoading || page === myPostsPage}
                          className={`rounded-lg border px-3 py-2 text-xs ${
                            page === myPostsPage
                              ? "border-cyan-400/40 bg-cyan-400/20 text-cyan-200"
                              : "border-white/10 bg-black/20 text-neutral-300 hover:bg-white/10"
                          } disabled:opacity-70`}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => loadMyPosts(myPostsPage + 1)}
                    disabled={myPostsLoading || myPostsPage >= myPostsTotalPages}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* 알림 설정 */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 mb-6">
        <h2 className="text-lg font-bold mb-3">알림 설정</h2>
        <div className="space-y-3 text-sm">
          <PrefRow
            title="에어드랍 알림"
            desc="추천/중요 업데이트"
            checked={prefs.airdrop}
            onClick={() => toggle("airdrop")}
          />
          <PrefRow
            title="이벤트 알림"
            desc="거래소 이벤트/상장"
            checked={prefs.event}
            onClick={() => toggle("event")}
          />
          <PrefRow
            title="커뮤니티 알림"
            desc="댓글/좋아요 반응"
            checked={prefs.community}
            onClick={() => toggle("community")}
          />
        </div>
      </section>

      {/* 약관 */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-bold mb-3">약관</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="btn" href="/terms">
            이용약관
          </Link>
          <Link className="btn" href="/privacy">
            개인정보처리방침
          </Link>
          <Link className="btn" href="/disclaimer">
            면책조항
          </Link>
        </div>
      </section>
    </main>
  );
}

function PrefRow({
  title,
  desc,
  checked,
  onClick,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-neutral-400 mt-1">{desc}</div>
      </div>
      <button
        onClick={onClick}
        className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
          checked
            ? "bg-cyan-500/30 border-cyan-400/40"
            : "bg-white/5 border-white/10"
        }`}
        aria-label={`${title} 토글`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}