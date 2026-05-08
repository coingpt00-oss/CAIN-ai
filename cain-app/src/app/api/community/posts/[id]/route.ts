// src/app/api/community/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGES = 4;

const ALLOWED_CATEGORIES = new Set([
  "btc",
  "alt",
  "derivatives",
  "airdrop_event",
  "free",
]);

type RouteContext = {
  params: Promise<{ id?: string }> | { id?: string };
};

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function getRouteId(context: RouteContext) {
  const resolved = await Promise.resolve(context.params);
  const rawId = String(resolved?.id || "").trim();
  const idNum = Number(rawId);

  if (!rawId || rawId === "undefined" || rawId === "null" || !Number.isInteger(idNum) || idNum <= 0) {
    return null;
  }

  return idNum;
}

function authStatus(error?: string | null) {
  if (error === "not_verified") return 403;
  if (error === "no_token") return 401;
  if (error === "device_not_found") return 401;
  if (error === "device_revoked") return 401;
  return 401;
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

function normalizeTier(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function attachAuthorMetaToPost(post: any) {
  const authorUid = String(post?.author_uid || "").trim();

  if (!authorUid) {
    return {
      ...post,
      author_display_name: post?.author_name || "Anonymous",
      author_tier: 0,
    };
  }

  const { data: author, error } = await supabaseAdmin
    .from("users")
    .select("uid, username, tier")
    .eq("uid", authorUid)
    .maybeSingle();

  if (error) {
    console.error("[community/posts/:id] author meta query error:", error);
    return {
      ...post,
      author_display_name: post?.author_name || "Anonymous",
      author_tier: 0,
    };
  }

  return {
    ...post,
    author_display_name:
      author?.username || post?.author_name || post?.author || "Anonymous",
    author_tier: normalizeTier(author?.tier),
  };
}

async function getActor(uid: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("uid, username, role")
    .eq("uid", uid)
    .maybeSingle<{ uid: string; username: string | null; role: string | null }>();

  if (error) {
    console.error("[community/posts/:id] actor query error:", error.message);
  }

  return data ?? null;
}

function canManagePost(post: any, actor: { uid: string; role?: string | null } | null) {
  if (!post || !actor?.uid) return false;
  if (String(actor.role || "") === "admin") return true;
  return String(post.author_uid || "") === String(actor.uid);
}

// GET /api/community/posts/:id
// - 비회원도 게시글 읽기 가능
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const idNum = await getRouteId(context);

    if (!idNum) {
      return json(400, { ok: false, error: "invalid_id" });
    }

    const { data, error } = await supabaseAdmin
      .from("community_posts")
      .select("*")
      .eq("id", idNum)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) {
      console.error("[community/posts/:id] fetch error:", error);
      return json(500, {
        ok: false,
        error: "community_post_query_failed",
        detail: error.message,
      });
    }

    if (!data) {
      return json(404, { ok: false, error: "not_found" });
    }

    const nextViews = Number(data.views_count || 0) + 1;

    supabaseAdmin
      .from("community_posts")
      .update({ views_count: nextViews })
      .eq("id", idNum)
      .eq("is_deleted", false)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error("[community/posts/:id] views update error:", updateError);
        }
      });

    let hasLiked = false;

    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      const auth = await requireUserFromRequest(req).catch(() => null);

      if (auth?.ok && auth.user?.uid) {
        const { data: like } = await supabaseAdmin
          .from("community_post_likes")
          .select("post_id")
          .eq("post_id", idNum)
          .eq("uid", auth.user.uid)
          .maybeSingle();

        hasLiked = !!like;
      }
    }

    const post = await attachAuthorMetaToPost({
      ...data,
      views_count: nextViews,
    });

    return json(200, {
      ok: true,
      post,
      has_liked: hasLiked,
    });
  } catch (e: any) {
    console.error("[community/posts/:id] fatal:", e);
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}

// PATCH /api/community/posts/:id
// - 작성자 본인 또는 admin만 수정 가능
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const idNum = await getRouteId(context);

    if (!idNum) {
      return json(400, { ok: false, error: "invalid_id" });
    }

    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(authStatus(auth.error), {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const { data: currentPost, error: postError } = await supabaseAdmin
      .from("community_posts")
      .select("*")
      .eq("id", idNum)
      .eq("is_deleted", false)
      .maybeSingle();

    if (postError) {
      console.error("[community/posts/:id] patch post lookup error:", postError.message);
      return json(500, { ok: false, error: "post_lookup_failed" });
    }

    if (!currentPost) {
      return json(404, { ok: false, error: "not_found" });
    }

    const actor = await getActor(auth.user.uid);

    if (!canManagePost(currentPost, actor)) {
      return json(403, { ok: false, error: "forbidden" });
    }

    const body = await req.json().catch(() => ({}));

    const category = normalizeCategory(body.category ?? currentPost.category);
    const title = cleanText(body.title ?? currentPost.title, 120);
    const content = cleanContent(body.content ?? currentPost.content, 20000);
    const coin_symbol = cleanText(
      body.coin_symbol ?? body.coinSymbol ?? currentPost.coin_symbol,
      20
    ).toUpperCase();
    const tags = normalizeTags(body.tags ?? currentPost.tags);
    const imageResult = validateImages(body.images ?? body.image_urls ?? body.imageUrls ?? currentPost.images);

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

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("community_posts")
      .update({
        category,
        title,
        content,
        coin_symbol: coin_symbol || null,
        tags,
        images: imageResult.images,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (updateError) {
      console.error("[community/posts/:id] patch update error:", updateError.message);
      return json(500, {
        ok: false,
        error: "community_post_update_failed",
        detail: updateError.message,
      });
    }

    const post = await attachAuthorMetaToPost(updated);

    return json(200, {
      ok: true,
      post,
    });
  } catch (e: any) {
    console.error("[community/posts/:id] PATCH fatal:", e);
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}

// DELETE /api/community/posts/:id
// - 작성자 본인 또는 admin만 삭제 가능
// - 실제 삭제가 아니라 is_deleted=true 처리합니다.
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const idNum = await getRouteId(context);

    if (!idNum) {
      return json(400, { ok: false, error: "invalid_id" });
    }

    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(authStatus(auth.error), {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const { data: currentPost, error: postError } = await supabaseAdmin
      .from("community_posts")
      .select("id, author_uid, is_deleted")
      .eq("id", idNum)
      .eq("is_deleted", false)
      .maybeSingle();

    if (postError) {
      console.error("[community/posts/:id] delete post lookup error:", postError.message);
      return json(500, { ok: false, error: "post_lookup_failed" });
    }

    if (!currentPost) {
      return json(404, { ok: false, error: "not_found" });
    }

    const actor = await getActor(auth.user.uid);

    if (!canManagePost(currentPost, actor)) {
      return json(403, { ok: false, error: "forbidden" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("community_posts")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idNum)
      .eq("is_deleted", false);

    if (deleteError) {
      console.error("[community/posts/:id] soft delete error:", deleteError.message);
      return json(500, {
        ok: false,
        error: "community_post_delete_failed",
        detail: deleteError.message,
      });
    }

    return json(200, {
      ok: true,
      deleted: true,
      id: idNum,
    });
  } catch (e: any) {
    console.error("[community/posts/:id] DELETE fatal:", e);
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}