// src/app/api/community/posts/[id]/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// POST /api/community/posts/:id/like
// - 로그인 회원만 추천/추천취소 가능
// - community_post_likes 테이블이 필요합니다.
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(401, {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const postId = await getRouteId(context);

    if (!postId) {
      return json(400, { ok: false, error: "invalid_id" });
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from("community_posts")
      .select("id, likes_count")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[community/posts/:id/like] post query error:", postError);
      return json(500, {
        ok: false,
        error: "post_query_failed",
        detail: postError.message,
      });
    }

    if (!post) {
      return json(404, { ok: false, error: "post_not_found" });
    }

    const uid = auth.user.uid;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("community_post_likes")
      .select("post_id, uid")
      .eq("post_id", postId)
      .eq("uid", uid)
      .maybeSingle();

    if (existingError) {
      console.error("[community/posts/:id/like] like lookup error:", existingError);
      return json(500, {
        ok: false,
        error: "like_lookup_failed",
        detail: existingError.message,
      });
    }

    let hasLiked = false;
    let nextLikes = Math.max(0, Number(post.likes_count || 0));

    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("uid", uid);

      if (deleteError) {
        console.error("[community/posts/:id/like] unlike error:", deleteError);
        return json(500, {
          ok: false,
          error: "unlike_failed",
          detail: deleteError.message,
        });
      }

      hasLiked = false;
      nextLikes = Math.max(0, nextLikes - 1);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("community_post_likes")
        .insert({
          post_id: postId,
          uid,
        });

      if (insertError) {
        console.error("[community/posts/:id/like] like insert error:", insertError);
        return json(500, {
          ok: false,
          error: "like_failed",
          detail: insertError.message,
        });
      }

      hasLiked = true;
      nextLikes += 1;
    }

    const { error: updateError } = await supabaseAdmin
      .from("community_posts")
      .update({ likes_count: nextLikes })
      .eq("id", postId);

    if (updateError) {
      console.error("[community/posts/:id/like] count update error:", updateError);
      return json(500, {
        ok: false,
        error: "like_count_update_failed",
        detail: updateError.message,
      });
    }

    return json(200, {
      ok: true,
      has_liked: hasLiked,
      liked: hasLiked,
      likes: nextLikes,
      like_count: nextLikes,
      likes_count: nextLikes,
    });
  } catch (e: any) {
    console.error("[community/posts/:id/like] fatal:", e);
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}