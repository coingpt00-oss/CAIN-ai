// src/app/api/community/posts/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMENT_MIN = 1;
const COMMENT_MAX = 1000;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type CommentRow = {
  id: number | string;
  post_id: number | string;
  author_uid: string;
  author_name: string | null;
  content: string | null;
  likes_count: number | null;
  is_deleted: boolean | null;
  created_at: string | null;
  updated_at?: string | null;
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function authStatus(error?: string | null) {
  if (error === "not_verified") return 403;
  if (error === "no_token") return 401;
  if (error === "device_not_found") return 401;
  if (error === "device_revoked") return 401;
  return 401;
}

async function getPostIdFromContext(ctx: RouteContext) {
  const params = await ctx.params;
  const n = Number(params?.id);

  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }

  return n;
}

function normalizeContent(value: any) {
  return String(value ?? "").trim();
}

function validateContent(content: string) {
  if (content.length < COMMENT_MIN) return "missing_content";
  if (content.length > COMMENT_MAX) return "comment_too_long";
  return null;
}

function toSafeComment(row: CommentRow) {
  return {
    id: Number(row.id),
    post_id: Number(row.post_id),
    author_uid: row.author_uid,
    author_name: row.author_name || "Anonymous",
    content: row.content || "",
    likes_count: Number(row.likes_count ?? 0),
    is_deleted: !!row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}

async function getPostIfActive(postId: number) {
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("id")
    .eq("id", postId)
    .eq("is_deleted", false)
    .maybeSingle<{ id: number }>();

  if (error) {
    console.error("[comments] post lookup failed:", error.message);
    return { post: null, error };
  }

  return { post: data, error: null as any };
}

async function getAuthorName(uid: string, fallback?: string | null) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("username")
    .eq("uid", uid)
    .maybeSingle<{ username: string | null }>();

  if (error) {
    console.error("[comments] author lookup failed:", error.message);
  }

  const username = String(data?.username || fallback || "").trim();
  return username || "Anonymous";
}

async function refreshPostCommentCount(postId: number) {
  const { count, error: countError } = await supabaseAdmin
    .from("community_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("is_deleted", false);

  if (countError) {
    console.error("[comments] count failed:", countError.message);
    return null;
  }

  const nextCount = count ?? 0;

  const { error: updateError } = await supabaseAdmin
    .from("community_posts")
    .update({ comments_count: nextCount })
    .eq("id", postId)
    .eq("is_deleted", false);

  if (updateError) {
    console.error("[comments] post comments_count update failed:", updateError.message);
  }

  return nextCount;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const postId = await getPostIdFromContext(ctx);

    if (!postId) {
      return json(400, { ok: false, error: "invalid_post_id" });
    }

    const { post, error: postError } = await getPostIfActive(postId);

    if (postError) {
      return json(500, { ok: false, error: "post_lookup_failed" });
    }

    if (!post) {
      return json(404, { ok: false, error: "post_not_found" });
    }

    const { data, error } = await supabaseAdmin
      .from("community_comments")
      .select(
        "id, post_id, author_uid, author_name, content, likes_count, is_deleted, created_at, updated_at"
      )
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[comments] fetch failed:", error.message);
      return json(500, { ok: false, error: "comments_fetch_failed" });
    }

    const comments = ((data ?? []) as CommentRow[]).map(toSafeComment);

    return json(200, {
      ok: true,
      comments,
      total: comments.length,
    });
  } catch (e: any) {
    console.error("[comments] GET fatal:", e?.message || e);
    return json(500, {
      ok: false,
      error: "internal_error",
      detail: e?.message || String(e),
    });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const postId = await getPostIdFromContext(ctx);

    if (!postId) {
      return json(400, { ok: false, error: "invalid_post_id" });
    }

    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(authStatus(auth.error), {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const body = await req.json().catch(() => ({}));
    const content = normalizeContent(body.content);

    const validationError = validateContent(content);
    if (validationError) {
      return json(400, {
        ok: false,
        error: validationError,
        max: COMMENT_MAX,
      });
    }

    const { post, error: postError } = await getPostIfActive(postId);

    if (postError) {
      return json(500, { ok: false, error: "post_lookup_failed" });
    }

    if (!post) {
      return json(404, { ok: false, error: "post_not_found" });
    }

    const uid = auth.user.uid;
    const authorName = await getAuthorName(uid, (auth.user as any)?.username);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("community_comments")
      .insert({
        post_id: postId,
        author_uid: uid,
        author_name: authorName,
        content,
      })
      .select(
        "id, post_id, author_uid, author_name, content, likes_count, is_deleted, created_at, updated_at"
      )
      .single<CommentRow>();

    if (insertError) {
      console.error("[comments] insert failed:", insertError.message);
      return json(500, { ok: false, error: "comment_insert_failed" });
    }

    const commentsCount = await refreshPostCommentCount(postId);

    return json(201, {
      ok: true,
      comment: toSafeComment(inserted),
      comments_count: commentsCount,
    });
  } catch (e: any) {
    console.error("[comments] POST fatal:", e?.message || e);
    return json(500, {
      ok: false,
      error: "internal_error",
      detail: e?.message || String(e),
    });
  }
}