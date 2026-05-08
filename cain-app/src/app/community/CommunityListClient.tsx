// src/app/community/CommunityListClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TierBadge from "@/components/TierBadge";

type Category =
  | "all"
  | "btc"
  | "alt"
  | "derivatives"
  | "airdrop_event"
  | "free";

type SortMode = "latest" | "popular";

type CommunityPost = {
  id: number | string;
  category: Category;
  title: string;
  author: string;
  author_uid?: string | null;
  author_tier?: number | null;
  views: number;
  likes: number;
  comments: number;
  isPinned?: boolean;
  hot?: boolean;
  coinSymbol?: string | null;
  tags?: string[];
  createdAt: string;
};

type CainUser = {
  uid: string;
  username: string;
  role?: string;
};

type PostsResult = {
  posts: CommunityPost[];
  total: number;
  page: number;
  totalPages: number;
};

const PAGE_SIZE = 15;

const categoryTabs: { key: Category; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "btc", label: "비트코인" },
  { key: "alt", label: "알트코인" },
  { key: "derivatives", label: "선물·마진" },
  { key: "airdrop_event", label: "에어드랍&이벤트" },
  { key: "free", label: "자유" },
];

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

function normalizePost(raw: any): CommunityPost | null {
  const id = raw?.id ?? raw?.post_id ?? raw?.uuid;
  const title = String(raw?.title || "").trim();

  if (id === undefined || id === null || String(id).trim() === "" || String(id) === "undefined") {
    return null;
  }

  if (!title) {
    return null;
  }

  return {
    id,
    category: toCategory(raw?.category),
    title,
    author: String(
      raw?.author_display_name ||
      raw?.author_name ||
      raw?.author ||
      raw?.username ||
      "Anonymous"
    ),
    author_uid: raw?.author_uid ?? raw?.uid ?? null,
    author_tier: toNumber(raw?.author_tier ?? raw?.tier, 0),
    views: toNumber(raw?.views ?? raw?.view_count ?? raw?.views_count, 0),
    likes: toNumber(raw?.likes ?? raw?.like_count ?? raw?.likes_count, 0),
    comments: toNumber(raw?.comments ?? raw?.comment_count ?? raw?.comments_count, 0),
    isPinned: Boolean(raw?.is_pinned ?? raw?.isPinned ?? raw?.pinned),
    hot: Boolean(raw?.hot ?? raw?.is_hot ?? raw?.isHot),
    coinSymbol: raw?.coin_symbol ?? raw?.coinSymbol ?? null,
    tags: normalizeTags(raw?.tags),
    createdAt: String(raw?.created_at || raw?.createdAt || raw?.inserted_at || new Date().toISOString()),
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

function getPostsFromResponse(json: any): any[] {
  const candidates = [
    json?.posts,
    json?.items,
    json?.rows,
    json?.data,
    json?.payload?.posts,
    json?.payload?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
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

async function fetchCommunityPosts({
  page,
  category,
  sortMode,
  search,
}: {
  page: number;
  category: Category;
  sortMode: SortMode;
  search: string;
}): Promise<PostsResult> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  params.set("category", category);
  params.set("sort", sortMode);

  const q = search.trim();
  if (q) {
    params.set("q", q);
  }

  const res = await fetch(`/api/community/posts?${params.toString()}`, {
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `community_posts_failed_${res.status}`);
  }

  const posts = getPostsFromResponse(json)
    .map(normalizePost)
    .filter(Boolean) as CommunityPost[];

  return {
    posts,
    total: toNumber(json.total, posts.length),
    page: toNumber(json.page, page),
    totalPages: toNumber(json.totalPages, 0),
  };
}

export default function CommunityListClient() {
  const [category, setCategory] = useState<Category>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<CainUser | null>(null);

  const pageButtons = useMemo(() => buildPageButtons(page, totalPages), [page, totalPages]);

  useEffect(() => {
    setUser(readLocalUser());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [category, sortMode, search]);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      async function loadPosts() {
        setLoading(true);
        setError("");

        try {
          const result = await fetchCommunityPosts({
            page,
            category,
            sortMode,
            search,
          });

          if (alive) {
            setPosts(result.posts);
            setTotalPosts(result.total);
            setTotalPages(result.totalPages);
            setPage(result.page);
          }
        } catch (err: any) {
          if (alive) {
            setPosts([]);
            setTotalPosts(0);
            setTotalPages(0);
            setError(err?.message || "community_posts_failed");
          }
        } finally {
          if (alive) setLoading(false);
        }
      }

      loadPosts();
    }, search.trim() ? 250 : 0);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [page, category, sortMode, search]);

  function changeCategory(next: Category) {
    setCategory(next);
  }

  function changeSort(next: SortMode) {
    setSortMode(next);
  }

  function goPage(nextPage: number) {
    if (nextPage < 1) return;
    if (totalPages > 0 && nextPage > totalPages) return;
    setPage(nextPage);
  }

  return (
    <div className="space-y-6">
      {/* 상단: 카테고리 탭 + 글쓰기 버튼 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => changeCategory(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm border transition ${
                category === tab.key
                  ? "bg-[var(--brand)] text-black border-[var(--brand)]"
                  : "border-white/15 text-white/70 hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          href={user ? "/community/new" : "/login?next=/community/new"}
          className="px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--brand)]/20 text-[var(--brand)] hover:bg-[var(--brand)]/30 border border-[var(--brand)]/40 transition text-center"
        >
          글쓰기
        </Link>
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex-1">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목, 코인 이름, 태그(#비트코인)로 검색"
              className="w-full rounded-full bg-zinc-900 border border-white/10 px-4 py-2 text-sm md:text-base focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white/80"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-white/50">정렬</span>
          <button
            onClick={() => changeSort("latest")}
            className={`px-3 py-1 rounded-full text-xs md:text-sm border transition ${
              sortMode === "latest"
                ? "bg-white text-black border-white"
                : "border-white/20 text-white/70 hover:bg-white/5"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => changeSort("popular")}
            className={`px-3 py-1 rounded-full text-xs md:text-sm border transition ${
              sortMode === "popular"
                ? "bg-white text-black border-white"
                : "border-white/20 text-white/70 hover:bg-white/5"
            }`}
          >
            인기순
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-white/40">
        <div>
          전체 {totalPosts.toLocaleString("ko-KR")}개
          {totalPages > 0 ? (
            <span>
              {" "}
              · {page.toLocaleString("ko-KR")}/{totalPages.toLocaleString("ko-KR")}페이지
            </span>
          ) : null}
        </div>

        {loading ? <div>불러오는 중...</div> : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          커뮤니티 글 목록을 불러오지 못했습니다. API 또는 Supabase community_posts 테이블을 확인해주십쇼.
          <div className="mt-1 text-xs text-red-200/70">{error}</div>
        </div>
      ) : null}

      {/* 리스트 테이블 */}
      <div className="mt-4 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-xs md:text-sm text-white/60">
              <th className="w-24 px-4 py-2 text-left">구분</th>
              <th className="px-4 py-2 text-left">제목</th>
              <th className="w-40 px-4 py-2 text-center">작성자</th>
              <th className="w-20 px-2 py-2 text-center">조회</th>
              <th className="w-20 px-2 py-2 text-center">추천</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-white/50">
                  커뮤니티 글을 불러오는 중입니다.
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-white/50">
                  아직 등록된 글이 없습니다. 첫 글의 주인공이 되어 보세요.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr
                  key={String(post.id)}
                  className="border-t border-white/5 hover:bg-white/5 transition"
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col gap-1">
                      {post.hot && (
                        <span className="inline-flex items-center justify-center rounded-full bg-rose-500/90 text-[10px] font-semibold px-2 py-0.5 text-black">
                          HOT
                        </span>
                      )}
                      <span className="text-xs text-white/70">
                        {renderCategoryLabel(post.category)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/community/${encodeURIComponent(String(post.id))}`}
                      className="inline-flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm md:text-base hover:text-[var(--brand)] transition">
                          {post.title}
                        </span>
                        {post.comments > 0 && (
                          <span className="text-xs text-[var(--brand)]">
                            [{post.comments}]
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 text-[10px] text-white/50">
                        {post.coinSymbol && (
                          <span className="px-2 py-0.5 rounded-full border border-[var(--brand)]/40 text-[var(--brand)]">
                            {post.coinSymbol}
                          </span>
                        )}
                        {(post.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </td>

                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-center gap-2 text-sm text-white/80">
                      <TierBadge tier={post.author_tier ?? 0} size="sm" />
                      <span>{post.author}</span>
                    </div>
                  </td>

                  <td className="px-2 py-3 align-middle">
                    <div className="text-center text-xs text-white/70">
                      {post.views.toLocaleString("ko-KR")}
                    </div>
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <div className="text-center text-xs text-white/70">
                      {post.likes.toLocaleString("ko-KR")}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
          <div className="text-xs text-white/40">
            15개씩 표시 · {page.toLocaleString("ko-KR")}페이지
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={loading || page <= 1}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-40"
            >
              이전
            </button>

            {pageButtons.map((p, idx) => {
              const prev = pageButtons[idx - 1];
              const needsGap = prev && p - prev > 1;

              return (
                <span key={p} className="inline-flex items-center gap-2">
                  {needsGap ? <span className="text-xs text-neutral-500">...</span> : null}

                  <button
                    type="button"
                    onClick={() => goPage(p)}
                    disabled={loading || p === page}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      p === page
                        ? "border-[var(--brand)]/50 bg-[var(--brand)]/20 text-[var(--brand)]"
                        : "border-white/10 bg-black/20 text-neutral-300 hover:bg-white/10"
                    } disabled:opacity-70`}
                  >
                    {p}
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={loading || page >= totalPages}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-white/40">
        ※ 커뮤니티 글과 댓글은 개별 작성자의 의견이며, CAIN의 공식 입장이 아닙니다.
      </p>
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