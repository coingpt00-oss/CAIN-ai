// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

type LoginBody = {
  country?: string;
  username: string;
  password: string;
  remember?: boolean;
  device_id: string;
  platform?: string;
  device_name?: string;
};

type DeviceRpcParams = {
  p_uid: string;
  p_device_id: string;
  p_device_name: string;
  p_platform: string;
  p_ip: string;
  p_user_agent: string;
  p_max_devices: number;
};

type LoginUserRow = {
  uid: string;
  username: string;
  password_hash: string | null;
  is_verified: boolean;
  must_change_password: boolean | null;
  exchange: string | null;
  nationality: string | null;
  role: string | null;
  token: string | null;
};

const COOKIE_NAME = "cain_sess";
const MAX_DEVICES = 2;

function getKstDateString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// base64url helpers
function b64urlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function sign(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function makeSessionCookie(payload: Record<string, any>) {
  const secret = process.env.CAIN_COOKIE_SECRET || "";
  if (!secret) throw new Error("Missing env: CAIN_COOKIE_SECRET");

  const body = b64urlEncode(JSON.stringify(payload));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

function escapeLikePattern(value: string) {
  // Postgres LIKE/ILIKE에서 %, _, \는 특수문자입니다.
  // CAIN 닉네임은 언더바(_)를 허용하므로 검색 전 이스케이프합니다.
  return value.replace(/[\\%_]/g, "\\$&");
}

function isUniqueDeviceError(error: any) {
  const msg = String(error?.message || error || "").toLowerCase();
  return msg.includes("devices_uid_device_unique") || msg.includes("duplicate key");
}

function isMaxDevicesError(error: any) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("max_devices_exceeded") ||
    msg.includes("max devices") ||
    msg.includes("maximum devices")
  );
}

function deviceSortTime(device: any) {
  const raw = device?.last_seen_at || device?.last_seen || device?.created_at || "";
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function safeErrorMessage(error: any) {
  return String(error?.message || error?.details || error || "unknown_error");
}

async function findUserByUsername(username: string) {
  const escapedUsername = escapeLikePattern(username);

  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      `
      uid,
      username,
      password_hash,
      is_verified,
      must_change_password,
      exchange,
      nationality,
      role,
      token
      `
    )
    .ilike("username", escapedUsername)
    .limit(5);

  if (error) {
    return { user: null as LoginUserRow | null, error };
  }

  const rows = Array.isArray(data) ? (data as LoginUserRow[]) : [];
  const exact = rows.find(
    (row) => String(row.username || "").toLowerCase() === username.toLowerCase()
  );

  return { user: exact ?? null, error: null as any };
}

async function deleteRevokedDevices(uid: string) {
  const { error } = await supabaseAdmin
    .from("devices")
    .delete()
    .eq("uid", uid)
    .not("revoked_at", "is", null);

  if (error) {
    // revoked 정리 실패만으로 로그인을 막지는 않습니다.
    console.error("[login] delete revoked devices failed:", error.message);
  }
}

async function touchExistingDevice(params: DeviceRpcParams) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("devices")
    .update({
      device_name: params.p_device_name,
      platform: params.p_platform,
      ip: params.p_ip,
      user_agent: params.p_user_agent,
      last_seen_at: nowIso,
      revoked_at: null,
    })
    .eq("uid", params.p_uid)
    .eq("device_id", params.p_device_id)
    .select("id, uid, device_id, device_name, platform, last_seen_at, created_at, revoked_at")
    .maybeSingle();

  if (error) {
    console.error("[login] touch existing device failed:", error.message);
    return null;
  }

  return data;
}

async function deleteOldestActiveDevice(uid: string, currentDeviceId: string) {
  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("id, uid, device_id, last_seen_at, last_seen, created_at, revoked_at")
    .eq("uid", uid)
    .is("revoked_at", null);

  if (error) {
    console.error("[login] devices lookup failed:", error.message);
    throw error;
  }

  const activeDevices = Array.isArray(data) ? data : [];
  const candidates = activeDevices
    .filter((d: any) => String(d?.device_id || "") !== currentDeviceId)
    .sort((a: any, b: any) => deviceSortTime(a) - deviceSortTime(b));

  const target = candidates[0];

  if (!target?.id) {
    return null;
  }

  const { error: deleteErr } = await supabaseAdmin
    .from("devices")
    .delete()
    .eq("id", target.id);

  if (deleteErr) {
    console.error("[login] delete oldest device failed:", deleteErr.message);
    throw deleteErr;
  }

  return {
    ...target,
    deleted_at: new Date().toISOString(),
  };
}

async function pruneExcessActiveDevices(
  uid: string,
  currentDeviceId: string,
  maxDevices = MAX_DEVICES
) {
  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("id, uid, device_id, last_seen_at, last_seen, created_at, revoked_at")
    .eq("uid", uid)
    .is("revoked_at", null);

  if (error) {
    console.error("[login] devices prune lookup failed:", error.message);
    return [];
  }

  const activeDevices = Array.isArray(data) ? data : [];
  if (activeDevices.length <= maxDevices) return [];

  const current = activeDevices.find(
    (d: any) => String(d?.device_id || "") === currentDeviceId
  );

  const othersNewestFirst = activeDevices
    .filter((d: any) => String(d?.device_id || "") !== currentDeviceId)
    .sort((a: any, b: any) => deviceSortTime(b) - deviceSortTime(a));

  const keep = new Set<string>();

  if (current?.id) keep.add(String(current.id));

  for (const d of othersNewestFirst) {
    if (keep.size >= maxDevices) break;
    if (d?.id) keep.add(String(d.id));
  }

  const toDelete = activeDevices.filter((d: any) => d?.id && !keep.has(String(d.id)));

  if (!toDelete.length) return [];

  const ids = toDelete.map((d: any) => d.id);

  const { error: deleteErr } = await supabaseAdmin
    .from("devices")
    .delete()
    .in("id", ids);

  if (deleteErr) {
    console.error("[login] prune excess devices failed:", deleteErr.message);
    return [];
  }

  return toDelete.map((d: any) => ({
    ...d,
    deleted_at: new Date().toISOString(),
  }));
}

async function registerDeviceAndEvictOldestIfNeeded(params: DeviceRpcParams) {
  // RPC가 revoked_at까지 포함한 전체 row 수를 기준으로 제한할 가능성이 있어
  // 로그인 전 기존 revoked row는 정리합니다.
  await deleteRevokedDevices(params.p_uid);

  const first = await supabaseAdmin.rpc("register_device_and_enforce_limit", params);

  if (!first.error) {
    return {
      data: first.data,
      error: null as any,
      evicted: null as any,
      retried: false,
    };
  }

  if (isUniqueDeviceError(first.error)) {
    const touched = await touchExistingDevice(params);

    return {
      data: touched ?? first.data ?? null,
      error: null as any,
      evicted: null as any,
      retried: false,
    };
  }

  if (!isMaxDevicesError(first.error)) {
    return {
      data: first.data,
      error: first.error,
      evicted: null as any,
      retried: false,
    };
  }

  // ✅ 핵심:
  // 3번째 기기 로그인 시 새 로그인을 막지 않고,
  // 가장 오래된 active device를 delete 후 재시도합니다.
  // 삭제된 오래된 브라우저는 user-auth.ts에서 device_not_found로 튕깁니다.
  const evicted = await deleteOldestActiveDevice(
    params.p_uid,
    params.p_device_id
  );

  const second = await supabaseAdmin.rpc("register_device_and_enforce_limit", params);

  if (!second.error) {
    return {
      data: second.data ?? null,
      error: null as any,
      evicted,
      retried: true,
    };
  }

  if (isUniqueDeviceError(second.error)) {
    const touched = await touchExistingDevice(params);

    return {
      data: touched ?? second.data ?? null,
      error: null as any,
      evicted,
      retried: true,
    };
  }

  // 혹시 남아 있는 revoked row 또는 초과 row 때문에 여전히 막히면 한 번 더 정리 후 마지막 재시도
  if (isMaxDevicesError(second.error)) {
    await deleteRevokedDevices(params.p_uid);
    await deleteOldestActiveDevice(params.p_uid, params.p_device_id);

    const third = await supabaseAdmin.rpc("register_device_and_enforce_limit", params);

    if (!third.error) {
      return {
        data: third.data ?? null,
        error: null as any,
        evicted,
        retried: true,
      };
    }

    if (isUniqueDeviceError(third.error)) {
      const touched = await touchExistingDevice(params);

      return {
        data: touched ?? third.data ?? null,
        error: null as any,
        evicted,
        retried: true,
      };
    }

    return {
      data: third.data,
      error: third.error,
      evicted,
      retried: true,
    };
  }

  return {
    data: second.data,
    error: second.error,
    evicted,
    retried: true,
  };
}

async function recordDailyCheckin(uid: string) {
  try {
    const checkin_date = getKstDateString();

    const { error } = await supabaseAdmin
      .from("user_checkins")
      .upsert({ uid, checkin_date }, { onConflict: "uid,checkin_date" });

    if (error) {
      console.error("[login] checkin upsert failed:", error.message);
    }
  } catch (e) {
    console.error("[login] checkin failed:", safeErrorMessage(e));
  }
}

async function recordLoginEvent({
  uid,
  deviceId,
  deviceName,
  platform,
  ip,
  userAgent,
}: {
  uid: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  ip: string;
  userAgent: string;
}) {
  try {
    // login_events 테이블에 메타 컬럼이 있으면 상세 기록을 남깁니다.
    // 컬럼이 아직 uid만 있는 구조라면 fallback으로 uid만 기록합니다.
    const detailed = await supabaseAdmin.from("login_events").insert({
      uid,
      device_id: deviceId,
      device_name: deviceName,
      platform,
      ip,
      user_agent: userAgent,
    });

    if (!detailed.error) return;

    const fallback = await supabaseAdmin.from("login_events").insert({ uid });

    if (fallback.error) {
      console.error(
        "[login] login_events insert failed:",
        detailed.error.message,
        "| fallback:",
        fallback.error.message
      );
    }
  } catch (e) {
    console.error("[login] login_events failed:", safeErrorMessage(e));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<LoginBody>;

    if (!body?.username || !body?.password || !body?.device_id) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const username = body.username.trim();

    const { user, error: uErr } = await findUserByUsername(username);

    if (uErr) {
      return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(body.password!, user.password_hash ?? "");
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    // ✅ 임시 비밀번호 발급 사용자는 여기서 막지 않습니다.
    // 비밀번호 비교가 성공했다면 세션을 발급하고, 프론트에서 /change-password로 이동시킵니다.
    if (!user.is_verified) {
      return NextResponse.json(
        { ok: false, error: "현재 승인 대기 상태입니다" },
        { status: 403 }
      );
    }

    const uid = user.uid;

    // 토큰 발급
    const { data: tokenRes, error: tErr } = await supabaseAdmin.rpc(
      "issue_user_token",
      { p_uid: uid }
    );

    if (tErr) {
      return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
    }

    const token = (tokenRes as any)?.token ?? tokenRes;

    // 디바이스 등록 + 2기기 제한
    // ✅ 3번째 기기 로그인 시 새 로그인을 막지 않고, 가장 오래된 기존 기기를 delete 후 재시도합니다.
    const ua = req.headers.get("user-agent") ?? "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      "";

    const deviceName =
      (body.device_name && body.device_name.trim()) || "Unknown device";
    const platform = (body.platform && body.platform.trim()) || "web";
    const deviceId = body.device_id;

    const deviceResult = await registerDeviceAndEvictOldestIfNeeded({
      p_uid: uid,
      p_device_id: deviceId,
      p_device_name: deviceName,
      p_platform: platform,
      p_ip: ip,
      p_user_agent: ua,
      p_max_devices: MAX_DEVICES,
    });

    if (deviceResult.error) {
      return NextResponse.json(
        { ok: false, error: deviceResult.error.message || "device_register_failed" },
        { status: 403 }
      );
    }

    const prunedDevices = await pruneExcessActiveDevices(uid, deviceId, MAX_DEVICES);

    // ✅ 쿠키 세션 발급 (remember면 길게)
    const remember = !!body.remember;

    // "영구"는 불가에 가깝고, 실전은 길게 + rolling
    // Chrome 등은 장기 쿠키 상한이 있어서 400일 정도로 잡는 게 안전합니다.
    const maxAgeSeconds = remember
      ? 60 * 60 * 24 * 400 // 400일
      : 60 * 60 * 24 * 7; // 기본 7일

    const session = makeSessionCookie({
      uid,
      token,
      device_id: deviceId,
      iat: Date.now(),
      remember,
    });

    // ✅ 여기부터는 실제 로그인 성공 후 기록입니다.
    // 실패해도 로그인 자체는 막지 않고 서버 콘솔에만 남깁니다.
    await recordDailyCheckin(uid);
    await recordLoginEvent({
      uid,
      deviceId,
      deviceName,
      platform,
      ip,
      userAgent: ua,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        uid: user.uid,
        username: user.username,
        exchange: user.exchange,
        nationality: user.nationality ?? null,
        is_verified: user.is_verified,
        must_change_password: !!user.must_change_password,
        role: user.role,
      },
      token,
      device: deviceResult.data ?? null,
      device_policy: {
        max_devices: MAX_DEVICES,
        evicted: deviceResult.evicted
          ? {
              id: deviceResult.evicted.id,
              device_id: deviceResult.evicted.device_id,
              deleted_at: deviceResult.evicted.deleted_at ?? null,
              revoked_at: deviceResult.evicted.revoked_at ?? null,
            }
          : null,
        pruned_count: prunedDevices.length,
      },
    });

    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set({
      name: COOKIE_NAME,
      value: session,
      httpOnly: true,
      secure: isProd, // 로컬은 false, 운영은 true
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}