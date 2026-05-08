// src/app/api/me/username/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_MIN = 2;
const USERNAME_MAX = 12;
const CHANGE_COOLDOWN_DAYS = 30;
const CHANGE_COOLDOWN_MS = CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// 한글, 영문, 숫자, 언더바만 허용
const USERNAME_RE = /^[가-힣a-zA-Z0-9_]+$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "cain",
  "coingpt",
  "coin-gpt",
  "coin_gpt",
  "official",
  "support",
  "운영자",
  "관리자",
]);

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function normalizeUsername(value: any) {
  return String(value ?? "").trim();
}

// Postgres LIKE/ILIKE에서 %, _, \\는 특수문자라서 이스케이프합니다.
// 보스 닉네임은 언더바(_)를 허용하므로, case-insensitive 중복 체크 시 꼭 필요합니다.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function validateUsername(username: string) {
  if (!username) {
    return "missing_username";
  }

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return "username_length_invalid";
  }

  if (!USERNAME_RE.test(username)) {
    return "username_format_invalid";
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return "reserved_username";
  }

  return null;
}

function getCooldownInfo(usernameChangedAt: string | null | undefined) {
  if (!usernameChangedAt) {
    return {
      blocked: false,
      remainingDays: 0,
    };
  }

  const changedAt = new Date(usernameChangedAt).getTime();

  if (!Number.isFinite(changedAt)) {
    return {
      blocked: false,
      remainingDays: 0,
    };
  }

  const elapsed = Date.now() - changedAt;

  if (elapsed >= CHANGE_COOLDOWN_MS) {
    return {
      blocked: false,
      remainingDays: 0,
    };
  }

  const remainingMs = CHANGE_COOLDOWN_MS - elapsed;
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  return {
    blocked: true,
    remainingDays,
  };
}

// PATCH /api/me/username
// body: { username: "새닉네임" }
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(401, {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const body = await req.json().catch(() => ({}));
    const nextUsername = normalizeUsername(body.username);

    const validationError = validateUsername(nextUsername);
    if (validationError) {
      return json(400, {
        ok: false,
        error: validationError,
      });
    }

    const { data: currentUser, error: userErr } = await supabaseAdmin
      .from("users")
      .select("uid, username, username_changed_at")
      .eq("uid", auth.user.uid)
      .maybeSingle<{
        uid: string;
        username: string | null;
        username_changed_at: string | null;
      }>();

    if (userErr) {
      return json(500, {
        ok: false,
        error: "user_query_failed",
        detail: userErr.message,
      });
    }

    if (!currentUser) {
      return json(404, {
        ok: false,
        error: "user_not_found",
      });
    }

    const currentUsername = normalizeUsername(currentUser.username);

    // 대소문자만 다른 같은 닉네임이면 변경 처리하지 않음
    if (currentUsername.toLowerCase() === nextUsername.toLowerCase()) {
      return json(200, {
        ok: true,
        changed: false,
        user: {
          uid: currentUser.uid,
          username: currentUsername,
          username_changed_at: currentUser.username_changed_at,
        },
      });
    }

    const cooldown = getCooldownInfo(currentUser.username_changed_at);

    if (cooldown.blocked) {
      return json(429, {
        ok: false,
        error: "username_change_cooldown",
        remaining_days: cooldown.remainingDays,
      });
    }

    // 중복 닉네임 1차 체크
    // - ilike로 대소문자 차이까지 확인
    // - 언더바(_)는 LIKE 와일드카드이므로 escapeLikePattern으로 이스케이프
    // - 최종 중복 방지는 DB unique index(users_username_lower_unique_idx)가 한 번 더 막아줍니다.
    const escapedUsername = escapeLikePattern(nextUsername);

    const { data: duplicates, error: dupErr } = await supabaseAdmin
      .from("users")
      .select("uid, username")
      .ilike("username", escapedUsername)
      .neq("uid", auth.user.uid)
      .limit(10);

    if (dupErr) {
      return json(500, {
        ok: false,
        error: "duplicate_check_failed",
        detail: dupErr.message,
      });
    }

    const hasExactDuplicate = (duplicates ?? []).some((row) => {
      return normalizeUsername(row.username).toLowerCase() === nextUsername.toLowerCase();
    });

    if (hasExactDuplicate) {
      return json(409, {
        ok: false,
        error: "username_already_taken",
      });
    }

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("users")
      .update({
        username: nextUsername,
        username_changed_at: nowIso,
      })
      .eq("uid", auth.user.uid)
      .select("uid, username, username_changed_at")
      .single<{
        uid: string;
        username: string;
        username_changed_at: string | null;
      }>();

    if (updateErr) {
      // users_username_lower_unique_idx에 걸린 경우
      if ((updateErr as any).code === "23505") {
        return json(409, {
          ok: false,
          error: "username_already_taken",
        });
      }

      return json(500, {
        ok: false,
        error: "username_update_failed",
        detail: updateErr.message,
      });
    }

    return json(200, {
      ok: true,
      changed: true,
      user: updated,
    });
  } catch (e: any) {
    return json(500, {
      ok: false,
      error: "internal",
      detail: e?.message || String(e),
    });
  }
}