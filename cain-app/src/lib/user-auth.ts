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

type AuthSource = "authorization" | "session_cookie" | "legacy_cookie";

type AuthContext = {
  token: string;
  source: AuthSource;
  sessionPayload: SessionPayload | null;
  headerDeviceId: string;
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

function getHeaderDeviceId(req: NextRequest) {
  const direct =
    req.headers.get("x-cain-device-id") ||
    req.headers.get("x-device-id") ||
    req.headers.get("x-client-device-id") ||
    "";
  return direct.trim();
}

function getAuthContextFromRequest(req: NextRequest): AuthContext | null {
  const sessionPayload = getSessionPayloadFromRequest(req);
  const headerDeviceId = getHeaderDeviceId(req);

  // 모바일 웹 / Capacitor 앱 / WebView에서는 쿠키가 꼬일 수 있으므로
  // Authorization 헤더가 있으면 이것을 1순위 인증 소스로 사용합니다.
  // 이 경우 오래된 cain_sess 쿠키 안의 device_id로 요청을 막지 않습니다.
  const authHeader = req.headers.get("authorization") || "";
  const trimmedAuthHeader = authHeader.trim();

  if (trimmedAuthHeader) {
    const bearerMatch = trimmedAuthHeader.match(/^Bearer\s+(.+)$/i);
    const token = (bearerMatch ? bearerMatch[1] : trimmedAuthHeader).trim();

    if (token) {
      return {
        token,
        source: "authorization",
        sessionPayload,
        headerDeviceId,
      };
    }
  }

  // 일반 PC 웹 브라우저 기본 경로: httpOnly cain_sess 쿠키
  const sessionCookie = req.cookies.get("cain_sess")?.value || "";
  const sessionToken = getTokenFromSessionCookie(sessionCookie);
  if (sessionToken) {
    return {
      token: sessionToken,
      source: "session_cookie",
      sessionPayload,
      headerDeviceId,
    };
  }

  // 과거 호환용 cain_token 쿠키
  const legacyCookie = req.cookies.get("cain_token")?.value || "";
  if (legacyCookie.trim()) {
    return {
      token: legacyCookie.trim(),
      source: "legacy_cookie",
      sessionPayload,
      headerDeviceId,
    };
  }

  return null;
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

async function touchDeviceLastSeen(uid: string, deviceId: string) {
  if (!uid || !deviceId) return;

  try {
    const { error } = await supabaseAdmin
      .from("devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("uid", uid)
      .eq("device_id", deviceId)
      .is("revoked_at", null);

    if (error) {
      console.error("[user-auth] touch device failed:", error.message);
    }
  } catch (e) {
    console.error("[user-auth] touch device exception:", e);
  }
}

export async function requireUserFromRequest(req: NextRequest) {
  const auth = getAuthContextFromRequest(req);

  if (!auth?.token) {
    return { ok: false as const, error: "no_token", user: null };
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, uid, username, exchange, nationality, created_at, is_verified, is_admin, must_change_password"
    )
    .eq("token", auth.token)
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

  // PC 웹 쿠키 기반 요청:
  // cain_sess 안의 device_id를 검사해서 2기기 제한/기기 밀어내기를 유지합니다.
  if (auth.source === "session_cookie") {
    const sessionDeviceId =
      typeof auth.sessionPayload?.device_id === "string"
        ? auth.sessionPayload.device_id.trim()
        : "";

    const sessionUid =
      typeof auth.sessionPayload?.uid === "string" ? auth.sessionPayload.uid.trim() : "";

    if (sessionDeviceId) {
      if (sessionUid && sessionUid !== user.uid) {
        return { ok: false as const, error: "session_uid_mismatch", user: null };
      }

      const device = await isDeviceAllowed(user.uid, sessionDeviceId);
      if (!device.ok) {
        return { ok: false as const, error: device.error, user: null };
      }

      await touchDeviceLastSeen(user.uid, sessionDeviceId);
    }
  }

  // 모바일 웹 / 앱 Authorization 기반 요청:
  // 오래된 cain_sess 쿠키가 같이 붙어와도 그 쿠키의 device_id 때문에 막지 않습니다.
  // 앱에서 X-CAIN-Device-Id를 보내면 해당 기기 검증까지 수행합니다.
  if (auth.source === "authorization" && auth.headerDeviceId) {
    const device = await isDeviceAllowed(user.uid, auth.headerDeviceId);
    if (!device.ok) {
      return { ok: false as const, error: device.error, user: null };
    }

    await touchDeviceLastSeen(user.uid, auth.headerDeviceId);
  }

  return { ok: true as const, error: null, user };
}