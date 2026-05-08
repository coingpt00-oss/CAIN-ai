// src/app/pages/community/[id]/PostDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CainUser = {
  uid: string;
  username: string;
  role?: string;
};

type Category =
  | "all"
  | "btc"
  | "alt"
  | "derivatives"
  | "airdrop_event"
  | "free";

// Supabase에서 오는 글 타입
type ApiPost = {
  id: number;
  category: Category;
  title: string;
  content: string;
  author_uid: string;
  author_name: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  coin_symbol: string | null;
  tags: string[] | null;
  created_at: string;
  likedByCurrentUser?: boolean; // 상세 API에서 같이 내려줌
};

type PostDetailProps = {
  id: string; // 서버에서 넘겨준 URL id
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PostDetailClient({ id }: PostDetailProps) {
  const [user, setUser] = useState<CainUser | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // 1) 로컬스토리지에서 로그인 정보 읽기
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("cain_user");
      if (!raw) return;
      const parsed = JSON.parse(raw) as CainUser;
      setUser(parsed);
      setIsAuthed(true);
    } catch {
      // 실패해도 비로그인 취급
    }
  }, []);

  // 2) 글 상세 API 호출
  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const headers: HeadersInit = {};
        if (user?.uid) {
          headers["x-cain-uid"] = user.uid;
          headers["x-cain-username"] = user.username;
        }

        const res = await fetch(`/api/community/posts/${id}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          setErrorMsg("게시글을 불러오는 데 실패했습니다.");
          setPost(null);
          return;
        }

        const p: ApiPost = json.post;
        setPost(p);
        setLiked(!!p.likedByCurrentUser);
        setLikeCount(Number(p.likes_count ?? 0));
      } catch (err) {
        console.error("fetch post error", err);
        setErrorMsg("알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, user?.uid, user?.username]);

  // 3) 추천 토글
  const handleToggleLike = async () => {
    if (!post) return;
    if (!user) {
      alert("로그인 후 추천할 수 있습니다.");
      return;
    }

    try {
      setLikeLoading(true);

      const res = await fetch(`/api/community/posts/${post.id}/like`, {
        method: "POST",
        headers: {
          "x-cain-uid": user.uid,
          "x-cain-username": user.username,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        console.error("toggle like error", json);
        alert("추천 처리 중 오류가 발생했습니다.");
        return;
      }

      setLiked(!!json.liked);
      setLikeCount(Number(json.likesCount ?? 0));
    } catch (err) {
      console.error("toggle like fatal", err);
      alert("네트워크 오류로 추천을 처리하지 못했습니다.");
    } finally {
      setLikeLoading(false);
    }
  };

  // 4) 로딩/에러 처리
  if (loading) {
    return (
      <main className="w-full flex items-center justify-center py-24">
        <p className="text-sm text-white/60">게시글을 불러오는 중입니다…</p>
      </main>
    );
  }

  if (!post || errorMsg) {
    return (
      <main className="w-full flex items-center justify-center py-24">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/60 px-6 py-10 text-center">
          <p className="text-lg font-semibold mb-2">
            게시글을 찾을 수 없습니다.
          </p>
          <p className="text-sm text-white/60 mb-6">
            삭제되었거나 주소가 잘못된 것일 수 있습니다.
          </p>
          <Link
            href="/pages/community"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] text-black text-sm font-semibold px-5 py-2 hover:bg-[var(--brand)]/90 transition"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  // 5) 실제 화면 렌더
  return (
    <div className="space-y-6">
      {/* 위치 표시 */}
      <div className="text-xs text-white/40 mb-2">
        <Link href="/pages/community" className="hover:text-[var(--brand)]">
          커뮤니티
        </Link>
        <span className="mx-1">{">"}</span>
        <span className="text-white/60">게시글</span>
      </div>

      {/* 상단 메타 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {renderCategoryLabel(post.category)}
            </span>
            {post.coin_symbol && (
              <span className="px-2 py-0.5 rounded-full border border-[var(--brand)]/40 text-[var(--brand)]">
                {post.coin_symbol}
              </span>
            )}
            {/* HOT 여부는 나중에 컬럼 추가해서 처리 */}
            <span className="text-white/40">
              조회 {post.views_count.toLocaleString("ko-KR")}
            </span>
          </div>

          <span className="text-xs text-white/40">
            추천 {likeCount.toLocaleString("ko-KR")}
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold leading-snug">
          {post.title}
        </h1>

        <div className="text-xs text-white/55 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 rounded-full border border-white/20 items-center justify-center text-[10px] text-white/60">
              Lv
            </span>
            <span>{post.author_name}</span>
          </div>
          <span>·</span>
          <span>{formatDate(post.created_at)}</span>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[11px] text-white/50">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 본문 */}
      <article className="rounded-xl border border-white/10 bg-black/40 p-4 md:p-5 text-sm leading-relaxed whitespace-pre-wrap">
        {post.content}
      </article>

      {/* 추천 + 목록 버튼 */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleToggleLike}
          disabled={likeLoading}
          className={`px-3 py-1.5 rounded-full border border-white/15 text-xs text-white/80 hover:bg-white/5 transition ${
            liked ? "bg-[var(--brand)]/20 text-[var(--brand)]" : ""
          }`}
        >
          👍 추천 {likeCount.toLocaleString("ko-KR")}
        </button>

        <Link
          href="/pages/community"
          className="px-3 py-1.5 rounded-full border border-white/15 text-xs text-white/80 hover:bg-white/5"
        >
          목록으로
        </Link>
      </div>

      {/* 댓글 영역 (아직 DB 연결 전) */}
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold">댓글</h2>

        {!isAuthed && (
          <div className="rounded-lg border border-dashed border-white/25 bg-black/30 px-3 py-3 text-xs text-white/65">
            댓글 작성은 CAIN 회원 전용 기능입니다.{" "}
            <Link href="/login" className="text-[var(--brand)] underline">
              로그인
            </Link>{" "}
            또는{" "}
            <Link href="/register" className="text-[var(--brand)] underline">
              회원가입
            </Link>
            후 이용해 주세요.
          </div>
        )}

        {isAuthed && (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              rows={3}
              placeholder="댓글을 입력하세요."
            />
            <div className="flex justify-end">
              <button className="px-3 py-1.5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] text-xs font-semibold hover:bg-[var(--brand)]/30">
                댓글 등록
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function renderCategoryLabel(cat: Category): string {
  switch (cat) {
    case "btc":
      return "비트코인";
    case "alt":
      return "알트코인";
    case "derivatives":
      return "선물·마진";
    case "airdrop_event":
      return "에어드랍&이벤트";
    case "free":
      return "자유";
    case "all":
    default:
      return "전체";
  }
}
