// src/app/api/community/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const MAX_IMAGES = 4;

const ALLOWED_CATEGORIES = new Set([
  "btc",
  "alt",
  "derivatives",
  "airdrop_event",
  "free",
]);

const ALLOWED_SORTS = new Set(["latest", "popular"]);

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function cleanText(value: any, maxLen: number) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

function cleanContent(value: any, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function normalizeCategory(value: any) {
  const raw = String(value || "free").trim().toLowerCase();
  return ALLOWED_CATEGORIES.has(raw) ? raw : "free";
}

function normalizeSort(value: any) {
  const raw = String(value || "latest").trim().toLowerCase();
  return ALLOWED_SORTS.has(raw) ? raw : "latest";
}

function normalizeTags(value: any) {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim().replace(/^#/, ""))
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

function isSafeImageUrl(value: string) {
  const v = String(value || "").trim();
  return /^https?:\/\//i.test(v) || v.startsWith("/");
}

function validateImages(value: any) {
  const raw = Array.isArray(value) ? value : [];

  const images = raw
    .map((v) => {
      if (typeof v === "string") return v;
      return v?.url || v?.publicUrl || v?.src || "";
    })
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  if (images.length > MAX_IMAGES) {
    return {
      ok: false as const,
      error: "image_limit_exceeded",
      images: [],
    };
  }

  const invalid = images.find((url) => !isSafeImageUrl(url));
  if (invalid) {
    return {
      ok: false as const,
      error: "invalid_image_url",
      images: [],
    };
  }

  return {
    ok: true as const,
    images,
  };
}

function sanitizeSearch(value: string) {
  return value
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 50);
}

function normalizeTier(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function attachAuthorMetaToPosts(posts: any[]) {
  const safePosts = Array.isArray(posts) ? posts : [];

  const uids = Array.from(
    new Set(
      safePosts
        .map((post) => String(post?.author_uid || "").trim())
        .filter(Boolean)
    )
  );

  if (uids.length === 0) {
    return safePosts.map((post) => ({
      ...post,
      author_display_name: post?.author_name || "Anonymous",
      author_tier: 0,
    }));
  }

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("uid, username, tier")
    .in("uid", uids);

  if (error) {
    console.error("[community/posts] author meta query error:", error);
    return safePosts.map((post) => ({
      ...post,
      author_display_name: post?.author_name || "Anonymous",
      author_tier: 0,
    }));
  }

  const userMap = new Map(
    (users || []).map((user: any) => [String(user.uid), user])
  );

  return safePosts.map((post) => {
    const uid = String(post?.author_uid || "").trim();
    const author = userMap.get(uid) as any;

    return {
      ...post,
      author_display_name:
        author?.username || post?.author_name || post?.author || "Anonymous",
      author_tier: normalizeTier(author?.tier),
    };
  });
}

// GET /api/community/posts?page=1&limit=15&category=free&q=BTC&sort=latest
// - 비회원도 목록 조회 가능
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const limit = clampInt(sp.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const page = clampInt(sp.get("page"), 1, 1, 1000000);
    const offsetFromPage = (page - 1) * limit;
    const offset = sp.has("offset")
      ? clampInt(sp.get("offset"), offsetFromPage, 0, 100000000)
      : offsetFromPage;

    const category = String(sp.get("category") || "all").trim().toLowerCase();
    const q = sanitizeSearch(String(sp.get("q") || ""));
    const sort = normalizeSort(sp.get("sort"));

    let query = supabaseAdmin
      .from("community_posts")
      .select("*", { count: "exact" })
      .eq("is_deleted", false);

    if (category && category !== "all" && ALLOWED_CATEGORIES.has(category)) {
      query = query.eq("category", category);
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,content.ilike.%${q}%,coin_symbol.ilike.%${q}%,author_name.ilike.%${q}%`
      );
    }

    query = query
      .order("is_pinned", { ascending: false })
      .order("is_hot", { ascending: false });

    if (sort === "popular") {
      query = query
        .order("likes_count", { ascending: false })
        .order("comments_count", { ascending: false })
        .order("views_count", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("[community/posts] list error:", error);
      return json(500, {
        ok: false,
        error: "community_posts_query_failed",
        detail: error.message,
      });
    }

    const posts = await attachAuthorMetaToPosts(data || []);
    const total = count ?? posts.length;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;

    return json(200, {
      ok: true,
      posts,
      total,
      limit,
      offset,
      page: currentPage,
      pageSize: limit,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      category,
      q,
      sort,
    });
  } catch (e: any) {
    console.error("[community/posts] list fatal:", e);
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}

// POST /api/community/posts
// - 로그인 회원만 글 작성 가능
// body: { category, title, content, coin_symbol, tags, images }
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(401, {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const body = await req.json().catch(() => ({}));

    const category = normalizeCategory(body.category);
    const title = cleanText(body.title, 120);
    const content = cleanContent(body.content, 20000);
    const coin_symbol = cleanText(body.coin_symbol ?? body.coinSymbol, 20).toUpperCase();
    const tags = normalizeTags(body.tags);
    const imageResult = validateImages(body.images ?? body.image_urls ?? body.imageUrls);

    if (!title) {
      return json(400, { ok: false, error: "missing_title" });
    }

    if (!content) {
      return json(400, { ok: false, error: "missing_content" });
    }

    if (!imageResult.ok) {
      return json(400, {
        ok: false,
        error: imageResult.error,
        max_images: MAX_IMAGES,
      });
    }

    const payload = {
      category,
      title,
      content,
      author_uid: auth.user.uid,
      author_name: auth.user.username || "Anonymous",
      coin_symbol: coin_symbol || null,
      tags,
      images: imageResult.images,
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      is_pinned: false,
      is_hot: false,
      is_deleted: false,
    };

    const { data, error } = await supabaseAdmin
      .from("community_posts")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[community/posts] insert error:", error);
      return json(500, {
        ok: false,
        error: "community_post_insert_failed",
        detail: error.message,
      });
    }

    const [post] = await attachAuthorMetaToPosts(data ? [data] : []);

    return json(201, {
      ok: true,
      post: post || data,
      id: data?.id,
    });
  } catch (e: any) {
    console.error("[community/posts] insert fatal:", e);
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}