// src/app/community/[id]/PostDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TierBadge from "@/components/TierBadge";

type CainUser = {
  uid: string;
  username: string;
  role?: string;
};

type PostDetailProps = {
  id: string;
};

type Category =
  | "all"
  | "btc"
  | "alt"
  | "derivatives"
  | "airdrop_event"
  | "free";

type CommunityPost = {
  id: number | string;
  category: Category;
  title: string;
  content: string;
  author_uid?: string | null;
  author_name: string;
  author_tier?: number | null;
  views: number;
  likes: number;
  comments: number;
  is_pinned?: boolean;
  hot?: boolean;
  coin_symbol?: string | null;
  tags?: string[];
  images?: string[];
  created_at: string;
};

type CommunityComment = {
  id: number;
  post_id: number;
  author_uid: string;
  author_name: string;
  content: string;
  likes_count: number;
  is_deleted: boolean;
  created_at: string | null;
  updated_at?: string | null;
};

type PostApiResponse =
  | { ok: true; post: any; has_liked?: boolean }
  | { ok: false; error?: string };

function toCategory(value: any): Category {
  const v = String(value || "free").trim().toLowerCase();
  if (v === "btc") return "btc";
  if (v === "alt") return "alt";
  if (v === "derivatives") return "derivatives";
  if (v === "airdrop_event") return "airdrop_event";
  if (v === "free") return "free";
  return "free";
}

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTags(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s#]+/g)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function normalizeImages(value: any): string[] {
  const raw = value ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((v) => {
      if (typeof v === "string") return v;
      return v?.url || v?.publicUrl || v?.src || "";
    })
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizePost(raw: any): CommunityPost | null {
  const id = raw?.id ?? raw?.post_id ?? raw?.uuid;
  const title = String(raw?.title || "").trim();

  if (
    id === undefined ||
    id === null ||
    String(id).trim() === "" ||
    String(id) === "undefined"
  ) {
    return null;
  }

  if (!title) return null;

  return {
    id,
    category: toCategory(raw?.category),
    title,
    content: String(raw?.content || raw?.body || ""),
    author_uid: raw?.author_uid ?? raw?.uid ?? null,
    author_name: String(
      raw?.author_display_name ||
      raw?.author_name ||
      raw?.author ||
      raw?.username ||
      "Anonymous"
    ),
    author_tier: toNumber(raw?.author_tier ?? raw?.tier, 0),
    views: toNumber(raw?.views ?? raw?.view_count ?? raw?.views_count, 0),
    likes: toNumber(raw?.likes ?? raw?.like_count ?? raw?.likes_count, 0),
    comments: toNumber(raw?.comments ?? raw?.comment_count ?? raw?.comments_count, 0),
    is_pinned: Boolean(raw?.is_pinned ?? raw?.isPinned ?? raw?.pinned),
    hot: Boolean(raw?.hot ?? raw?.is_hot ?? raw?.isHot),
    coin_symbol: raw?.coin_symbol ?? raw?.coinSymbol ?? null,
    tags: normalizeTags(raw?.tags),
    images: normalizeImages(raw?.images ?? raw?.image_urls ?? raw?.imageUrls),
    created_at: String(
      raw?.created_at || raw?.createdAt || raw?.inserted_at || new Date().toISOString()
    ),
  };
}

function normalizeComment(raw: any): CommunityComment | null {
  const id = Number(raw?.id);
  const postId = Number(raw?.post_id);

  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id,
    post_id: Number.isFinite(postId) ? postId : 0,
    author_uid: String(raw?.author_uid || ""),
    author_name: String(raw?.author_name || raw?.author || raw?.username || "Anonymous"),
    content: String(raw?.content || ""),
    likes_count: toNumber(raw?.likes_count ?? raw?.likes, 0),
    is_deleted: !!raw?.is_deleted,
    created_at: raw?.created_at ? String(raw.created_at) : null,
    updated_at: raw?.updated_at ? String(raw.updated_at) : null,
  };
}

function readLocalUser(): CainUser | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("cain_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CainUser;
    if (!parsed?.uid) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLocalToken() {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("cain_token") || "";
  } catch {
    return "";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "-";

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

function getPostFromResponse(json: any) {
  return json?.post ?? json?.item ?? json?.data ?? json?.payload?.post ?? null;
}

export default function PostDetailClient({ id }: PostDetailProps) {
  const router = useRouter();
  const safeId = useMemo(() => String(id || "").trim(), [id]);

  const [user, setUser] = useState<CainUser | null>(null);
  const [token, setToken] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentMsg, setCommentMsg] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage =
    !!post &&
    !!user?.uid &&
    (String(post.author_uid || "") === String(user.uid) || user.role === "admin");

  useEffect(() => {
    const nextUser = readLocalUser();
    const nextToken = readLocalToken();

    setUser(nextUser);
    setToken(nextToken);
    setIsAuthed(!!nextUser || !!nextToken);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadPost() {
      if (!safeId || safeId === "undefined" || safeId === "null") {
        setLoading(false);
        setError("invalid_post_id");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const headers: Record<string, string> = {};

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`/api/community/posts/${encodeURIComponent(safeId)}`, {
          cache: "no-store",
          headers,
        });

        const json = (await res.json().catch(() => ({}))) as PostApiResponse;

        if (!res.ok || json?.ok === false) {
          throw new Error((json as any)?.error || `community_post_failed_${res.status}`);
        }

        const normalized = normalizePost(getPostFromResponse(json));
        if (!normalized) {
          throw new Error("post_not_found");
        }

        if (alive) {
          setPost(normalized);
          setLikeCount(normalized.likes);
          setHasLiked(Boolean((json as any)?.has_liked));
        }
      } catch (err: any) {
        if (alive) {
          setPost(null);
          setError(err?.message || "community_post_failed");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPost();

    return () => {
      alive = false;
    };
  }, [safeId, token]);

  async function loadComments() {
    if (!safeId || safeId === "undefined" || safeId === "null") return;

    setCommentsLoading(true);
    setCommentsError("");

    try {
      const res = await fetch(
        `/api/community/posts/${encodeURIComponent(safeId)}/comments`,
        { cache: "no-store" }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `comments_failed_${res.status}`);
      }

      const nextComments = Array.isArray(json.comments)
        ? json.comments.map(normalizeComment).filter(Boolean) as CommunityComment[]
        : [];

      setComments(nextComments);
    } catch (err: any) {
      setComments([]);
      setCommentsError(err?.message || "comments_fetch_failed");
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeId]);

  const handleToggleLike = async () => {
    if (!isAuthed) {
      alert("추천은 로그인 후 이용 가능합니다.");
      return;
    }

    if (!post) return;

    const previousLiked = hasLiked;
    const previousCount = likeCount;

    setHasLiked(!previousLiked);
    setLikeCount((prev) => Math.max(0, prev + (previousLiked ? -1 : 1)));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `/api/community/posts/${encodeURIComponent(String(post.id))}/like`,
        {
          method: "POST",
          headers,
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `like_failed_${res.status}`);
      }

      if (typeof json.likes === "number") {
        setLikeCount(json.likes);
      } else if (typeof json.like_count === "number") {
        setLikeCount(json.like_count);
      } else if (typeof json.likes_count === "number") {
        setLikeCount(json.likes_count);
      }

      if (typeof json.has_liked === "boolean") {
        setHasLiked(json.has_liked);
      } else if (typeof json.liked === "boolean") {
        setHasLiked(json.liked);
      }
    } catch (err: any) {
      setHasLiked(previousLiked);
      setLikeCount(previousCount);
      alert(err?.message || "추천 처리에 실패했습니다.");
    }
  };

  const handleDeletePost = async () => {
    if (!post || !canManage) return;

    const ok = window.confirm("정말 이 글을 삭제하시겠습니까? 삭제 후 목록에서는 보이지 않습니다.");
    if (!ok) return;

    setDeleting(true);

    try {
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`/api/community/posts/${encodeURIComponent(String(post.id))}`, {
        method: "DELETE",
        headers,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `delete_failed_${res.status}`);
      }

      alert("게시글이 삭제되었습니다.");
      router.push("/community");
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "게시글 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthed || !user) {
      alert("댓글 작성은 로그인 후 이용 가능합니다.");
      return;
    }

    if (!post) return;

    const body = commentText.trim();
    if (!body) {
      setCommentMsg("댓글 내용을 입력해주세요.");
      return;
    }

    if (body.length > 1000) {
      setCommentMsg("댓글은 1000자 이하로 입력해주세요.");
      return;
    }

    setCommentSubmitting(true);
    setCommentMsg("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `/api/community/posts/${encodeURIComponent(String(post.id))}/comments`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ content: body }),
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `comment_failed_${res.status}`);
      }

      const nextComment = normalizeComment(json.comment);

      if (nextComment) {
        setComments((prev) => [...prev, nextComment]);
      } else {
        await loadComments();
      }

      if (typeof json.comments_count === "number") {
        setPost((prev) => prev ? { ...prev, comments: json.comments_count } : prev);
      } else {
        setPost((prev) => prev ? { ...prev, comments: prev.comments + 1 } : prev);
      }

      setCommentText("");
      setCommentMsg("댓글이 등록되었습니다.");
    } catch (err: any) {
      setCommentMsg(err?.message || "댓글 등록에 실패했습니다.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-white/60">
        게시글을 불러오는 중입니다.
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200">
          게시글을 불러오지 못했습니다.
          <div className="mt-1 text-xs text-red-200/70">{error || "post_not_found"}</div>
        </div>

        <Link
          href="/community"
          className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-white/40 mb-2">
        <Link href="/community" className="hover:text-[var(--brand)]">
          커뮤니티
        </Link>
        <span className="mx-1">{">"}</span>
        <span className="text-white/60">게시글</span>
      </div>

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
            {post.hot && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-black text-[10px] font-semibold">
                HOT
              </span>
            )}
            <span className="text-white/40">
              조회 {post.views.toLocaleString("ko-KR")}
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
            <TierBadge tier={post.author_tier ?? 0} size="md" />
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

        {canManage ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/community/${encodeURIComponent(String(post.id))}/edit`}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:bg-white/5"
            >
              수정
            </Link>
            <button
              type="button"
              onClick={handleDeletePost}
              disabled={deleting}
              className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        ) : null}
      </div>

      {post.images && post.images.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {post.images.map((src, idx) => (
            <a
              key={`${src}-${idx}`}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-white/10 bg-black/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`community image ${idx + 1}`} className="w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      <article className="rounded-xl border border-white/10 bg-black/40 p-4 md:p-5 text-sm leading-relaxed whitespace-pre-wrap">
        {post.content || "본문이 없습니다."}
      </article>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleToggleLike}
          className={
            "px-3 py-1.5 rounded-full border text-xs font-semibold transition " +
            (hasLiked
              ? "border-[var(--brand)] bg-[var(--brand)]/20 text-[var(--brand)]"
              : "border-white/15 text-white/80 hover:bg-white/5")
          }
        >
          {hasLiked ? "👍 추천 취소" : "👍 추천"} {likeCount.toLocaleString("ko-KR")}
        </button>

        <Link
          href="/community"
          className="px-3 py-1.5 rounded-full border border-white/15 text-xs text-white/80 hover:bg-white/5"
        >
          목록으로
        </Link>
      </div>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            댓글 {post.comments.toLocaleString("ko-KR")}
          </h2>

          {commentsLoading ? (
            <span className="text-xs text-white/40">불러오는 중...</span>
          ) : null}
        </div>

        {!isAuthed && (
          <div className="rounded-lg border border-dashed border-white/25 bg-black/30 px-3 py-3 text-xs text-white/65">
            댓글 작성은 CAIN 회원 전용 기능입니다. {" "}
            <Link href="/login" className="text-[var(--brand)] underline">
              로그인
            </Link>{" "}
            또는 {" "}
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
              maxLength={1000}
              placeholder="댓글을 입력하세요."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={commentSubmitting}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-white/45">
                {commentText.length}/1000
              </div>

              {commentMsg ? (
                <div className="flex-1 text-right text-xs text-white/50">{commentMsg}</div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmitComment}
                disabled={commentSubmitting}
                className="px-3 py-1.5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] text-xs font-semibold hover:bg-[var(--brand)]/30 border border-[var(--brand)]/40 disabled:opacity-50"
              >
                {commentSubmitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {commentsError ? (
            <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-3 text-xs text-red-200">
              댓글을 불러오지 못했습니다. {commentsError}
            </div>
          ) : null}

          {!commentsLoading && comments.length === 0 && !commentsError ? (
            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-4 text-xs text-white/45">
              아직 댓글이 없습니다.
            </div>
          ) : null}

          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
                <span className="font-semibold text-white/70">{comment.author_name}</span>
                <span>·</span>
                <span>{formatDate(comment.created_at)}</span>
              </div>

              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                {comment.content}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function renderCategoryLabel(category: Category) {
  switch (category) {
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
    default:
      return "전체";
  }
}