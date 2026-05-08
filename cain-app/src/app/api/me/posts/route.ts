// src/app/api/me/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type CommunityPostRow = {
  id: number | string;
  title: string | null;
  category: string | null;
  coin_symbol: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string | null;
};

function authStatus(error?: string | null) {
  if (error === "not_verified") return 403;
  if (error === "no_token") return 401;
  if (error === "device_not_found") return 401;
  if (error === "device_revoked") return 401;
  return 401;
}

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function getPageWindow(total: number, page: number) {
  if (total <= 0) {
    return {
      page: 1,
      from: 0,
      to: -1,
      totalPages: 0,
      firstPageSize: 0,
    };
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const safePage = Math.min(Math.max(1, page), totalPages);

  const firstPageSize = total % PAGE_SIZE || PAGE_SIZE;

  if (safePage === 1) {
    return {
      page: safePage,
      from: 0,
      to: firstPageSize - 1,
      totalPages,
      firstPageSize,
    };
  }

  const from = firstPageSize + (safePage - 2) * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE - 1, total - 1);

  return {
    page: safePage,
    from,
    to,
    totalPages,
    firstPageSize,
  };
}

function toSafePost(row: CommunityPostRow) {
  return {
    id: Number(row.id),
    title: row.title || "제목 없음",
    category: row.category || "free",
    coin_symbol: row.coin_symbol ? String(row.coin_symbol).toUpperCase() : null,
    views_count: Number(row.views_count ?? 0),
    likes_count: Number(row.likes_count ?? 0),
    comments_count: Number(row.comments_count ?? 0),
    created_at: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return NextResponse.json(
        { ok: false, error: auth.error || "unauthorized" },
        { status: authStatus(auth.error) }
      );
    }

    const uid = auth.user.uid;
    const requestedPage = toPositiveInt(req.nextUrl.searchParams.get("page"), 1);

    const { count, error: countError } = await supabaseAdmin
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_uid", uid)
      .eq("is_deleted", false);

    if (countError) {
      console.error("[api/me/posts] community_posts count error:", countError.message);
      return NextResponse.json(
        { ok: false, error: "posts_count_failed" },
        { status: 500 }
      );
    }

    const total = count ?? 0;
    const pageWindow = getPageWindow(total, requestedPage);

    if (total <= 0 || pageWindow.to < pageWindow.from) {
      return NextResponse.json({
        ok: true,
        posts: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 0,
        hasPrev: false,
        hasNext: false,
        firstPageSize: 0,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("community_posts")
      .select(
        "id, title, category, coin_symbol, views_count, likes_count, comments_count, created_at"
      )
      .eq("author_uid", uid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(pageWindow.from, pageWindow.to);

    if (error) {
      console.error("[api/me/posts] community_posts fetch error:", error.message);
      return NextResponse.json(
        { ok: false, error: "posts_fetch_failed" },
        { status: 500 }
      );
    }

    const posts = ((data ?? []) as CommunityPostRow[]).map(toSafePost);

    return NextResponse.json({
      ok: true,
      posts,
      total,
      page: pageWindow.page,
      pageSize: PAGE_SIZE,
      totalPages: pageWindow.totalPages,
      hasPrev: pageWindow.page > 1,
      hasNext: pageWindow.page < pageWindow.totalPages,
      firstPageSize: pageWindow.firstPageSize,
    });
  } catch (e) {
    console.error("[api/me/posts] fatal error:", e);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}