// src/lib/user-auth.ts
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

type AuthUser = {
  id: string;
  uid: string;
  username: string | null;
  exchange: string | null;
  nationality: string | null;
  created_at: string | null;
  is_verified: boolean;
  is_admin: boolean | null;
  must_change_password: boolean | null;
};

type SessionPayload = {
  uid?: string;
  token?: string;
  device_id?: string;
  iat?: number;
  remember?: boolean;
};

function decodeBase64Url(value: string) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function parseSessionCookie(raw: string): SessionPayload | null {
  if (!raw) return null;

  const payloadRaw = raw.split(".")[0] || "";
  const decoded = decodeBase64Url(payloadRaw);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

function getTokenFromSessionCookie(raw: string) {
  const parsed = parseSessionCookie(raw);
  return typeof parsed?.token === "string" ? parsed.token.trim() : "";
}

function getSessionPayloadFromRequest(req: NextRequest) {
  const sessionCookie = req.cookies.get("cain_sess")?.value || "";
  return parseSessionCookie(sessionCookie);
}

function getTokenFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) return bearerToken;
  } else if (authHeader.trim()) {
    return authHeader.trim();
  }

  const sessionCookie = req.cookies.get("cain_sess")?.value || "";
  const sessionToken = getTokenFromSessionCookie(sessionCookie);
  if (sessionToken) return sessionToken;

  const legacyCookie = req.cookies.get("cain_token")?.value || "";
  if (legacyCookie.trim()) return legacyCookie.trim();

  return "";
}

async function isDeviceAllowed(uid: string, deviceId: string) {
  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("id, uid, device_id, revoked_at")
    .eq("uid", uid)
    .eq("device_id", deviceId)
    .maybeSingle<{
      id: string;
      uid: string;
      device_id: string;
      revoked_at: string | null;
    }>();

  if (error) {
    return {
      ok: false as const,
      error: error.message || "device_check_failed",
    };
  }

  if (!data) {
    return {
      ok: false as const,
      error: "device_not_found",
    };
  }

  if (data.revoked_at) {
    return {
      ok: false as const,
      error: "device_revoked",
    };
  }

  return { ok: true as const, error: null };
}

export async function requireUserFromRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const sessionPayload = getSessionPayloadFromRequest(req);

  if (!token) {
    return { ok: false as const, error: "no_token", user: null };
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, uid, username, exchange, nationality, created_at, is_verified, is_admin, must_change_password"
    )
    .eq("token", token)
    .maybeSingle<AuthUser>();

  if (error) {
    return { ok: false as const, error: error.message, user: null };
  }

  if (!user) {
    return { ok: false as const, error: "unauthorized", user: null };
  }

  if (!user.is_verified) {
    return { ok: false as const, error: "not_verified", user: null };
  }

  // ✅ 2기기 제한 밀어내기 후 자동 로그아웃 검사
  // login/route.ts에서 cain_sess 쿠키에 device_id를 넣어두었으므로,
  // 오래된 기기가 devices에서 삭제되거나 revoked_at 처리되면 다음 회원 API 요청부터 여기서 차단됩니다.
  const sessionDeviceId =
    typeof sessionPayload?.device_id === "string"
      ? sessionPayload.device_id.trim()
      : "";

  const sessionUid =
    typeof sessionPayload?.uid === "string" ? sessionPayload.uid.trim() : "";

  if (sessionDeviceId) {
    if (sessionUid && sessionUid !== user.uid) {
      return { ok: false as const, error: "session_uid_mismatch", user: null };
    }

    const device = await isDeviceAllowed(user.uid, sessionDeviceId);
    if (!device.ok) {
      return { ok: false as const, error: device.error, user: null };
    }
  }

  return { ok: true as const, error: null, user };
}