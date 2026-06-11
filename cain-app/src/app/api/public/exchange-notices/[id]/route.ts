// src/app/api/public/exchange-notices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

const PRIVATE_HEADERS = {
  ...JSON_HEADERS,
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  vary: "Authorization, Cookie",
};

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: PRIVATE_HEADERS });
}

function unauthorized() {
  return j(401, {
    ok: false,
    item: null,
    error: "auth_required",
    updatedAt: new Date().toISOString(),
  });
}

function decodeBase64Url(value: string) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function getCainToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  const legacyCookieToken = req.cookies.get("cain_token")?.value?.trim();
  if (legacyCookieToken) return legacyCookieToken;

  const sessionCookie = req.cookies.get("cain_sess")?.value?.trim();
  if (sessionCookie) {
    const payloadRaw = sessionCookie.split(".")[0] || "";
    const decoded = decodeBase64Url(payloadRaw);
    if (decoded) {
      try {
        const parsed = JSON.parse(decoded);
        if (typeof parsed?.token === "string" && parsed.token.trim()) {
          return parsed.token.trim();
        }
      } catch {
        // ignore invalid session payload
      }
    }
  }

  return "";
}

function requireCainAuth(req: NextRequest) {
  const token = getCainToken(req);

  // 현재 CAIN 프론트는 cain_sess/cain_token 또는 Bearer 토큰 기반으로 로그인 상태를 유지합니다.
  // 여기서는 public API 노출을 막기 위한 1차 서버 게이트로 토큰 존재 여부를 확인합니다.
  // 추후 users.is_verified까지 서버에서 검증하는 방식으로 강화할 수 있습니다.
  return Boolean(token);
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    if (!requireCainAuth(req)) {
      return unauthorized();
    }

    const { id } = await context.params;
    const noticeId = String(id || "").trim();

    if (!noticeId) {
      return j(400, {
        ok: false,
        item: null,
        error: "missing_id",
        updatedAt: new Date().toISOString(),
      });
    }

    const { data, error } = await (supabaseAdmin.from("exchange_notices_public") as any)
      .select(
        [
          "id",
          "created_at",
          "updated_at",
          "last_checked_at",
          "source",
          "source_id",
          "exchange",
          "title",
          "summary_ko",
          "detail_excerpt",
          "url",
          "category",
          "notice_type",
          "severity",
          "symbols",
          "chains",
          "markets",
          "published_at",
          "source_published_at",
          "modified_at",
          "detail_fetch_status",
          "detail_fetched_at",
          "is_active",
          "is_important",
        ].join(",")
      )
      .eq("id", noticeId)
      .maybeSingle();

    if (error) {
      return j(500, {
        ok: false,
        item: null,
        error: error.message || "supabase_error",
        detail: error,
        updatedAt: new Date().toISOString(),
      });
    }

    if (!data) {
      return j(404, {
        ok: false,
        item: null,
        error: "not_found",
        updatedAt: new Date().toISOString(),
      });
    }

    return j(200, { ok: true, item: data, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    return j(500, {
      ok: false,
      item: null,
      error: err?.message || "unexpected_error",
      detail: String(err),
      updatedAt: new Date().toISOString(),
    });
  }
}