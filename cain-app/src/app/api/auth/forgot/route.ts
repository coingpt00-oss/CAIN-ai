// src/app/api/auth/forgot/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

const MAX_REQ_PER_DAY = 5;

const ALLOWED_EXCHANGES = new Set([
  "binance",
  "bybit",
  "bitget",
  "okx",
  "upbit",
  "bithumb",
]);

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function kstDayString() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function normPhone(p: string) {
  return String(p || "").replace(/[^0-9]/g, "");
}

function normText(s: string) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function normExchange(s: string) {
  return String(s || "").trim().toLowerCase();
}

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function maskUsername(username: string) {
  const s = String(username || "").trim();
  if (!s) return "";
  if (s.length <= 2) return `${s[0] || ""}*`;
  return `${s[0]}${"*".repeat(Math.max(1, s.length - 2))}${s[s.length - 1]}`;
}

async function checkAndBumpResetLimit(key: string, day: string) {
  const { data, error: readErr } = await supabaseAdmin
    .from("password_reset_requests")
    .select("count")
    .eq("key", key)
    .eq("day", day)
    .maybeSingle();

  if (readErr) {
    console.error("[forgot] reset limit read error:", readErr.message);
    return true;
  }

  const current = data?.count ?? 0;
  if (current >= MAX_REQ_PER_DAY) return false;

  const { error: upsertErr } = await supabaseAdmin
    .from("password_reset_requests")
    .upsert(
      { key, day, count: current + 1, updated_at: new Date().toISOString() },
      { onConflict: "key,day" }
    );

  if (upsertErr) {
    console.error("[forgot] reset limit upsert error:", upsertErr.message);
    return true;
  }

  return true;
}

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "lookup").trim();

    const name = normText(body.name);
    const phone = normPhone(body.phone);
    const exchange = normExchange(body.exchange);
    const uid = normText(body.uid);

    if (!name || !phone || !exchange || !uid) {
      return json(400, {
        ok: false,
        error: "missing_fields",
        message: "이름, 전화번호, 거래소, UID를 모두 입력해주세요.",
      });
    }

    if (!ALLOWED_EXCHANGES.has(exchange)) {
      return json(400, {
        ok: false,
        error: "invalid_exchange",
        message: "지원하지 않는 거래소입니다.",
      });
    }

    if (action !== "lookup" && action !== "reset") {
      return json(400, {
        ok: false,
        error: "invalid_action",
        message: "잘못된 요청입니다.",
      });
    }

    const day = kstDayString();
    const ip = clientIp(req);

    if (!(await checkAndBumpResetLimit(`ip:${ip}`, day))) {
      return json(429, {
        ok: false,
        error: "rate_limited",
        message: "오늘 요청 횟수를 초과했습니다. 내일 다시 시도해주세요.",
      });
    }

    if (!(await checkAndBumpResetLimit(`uid:${exchange}:${uid}`, day))) {
      return json(429, {
        ok: false,
        error: "rate_limited",
        message: "해당 UID의 오늘 요청 횟수를 초과했습니다. 내일 다시 시도해주세요.",
      });
    }

    // 기존 exact match는 BINANCE/binance, 010-0000/0100000 저장 형식 차이 때문에 실패할 수 있습니다.
    // 그래서 UID 후보를 먼저 가져온 뒤 JS에서 정규화 비교합니다.
    const { data: candidates, error: findErr } = await supabaseAdmin
      .from("users")
      .select("uid, username, name, phone, exchange")
      .eq("uid", uid);

    if (findErr) {
      return json(500, {
        ok: false,
        error: "find_user_failed",
        message: findErr.message,
      });
    }

    const user = (candidates || []).find((u: any) => {
      return (
        normExchange(u?.exchange || "") === exchange &&
        normText(u?.name || "") === name &&
        normPhone(u?.phone || "") === phone
      );
    });

    if (!user) {
      return json(200, {
        ok: true,
        found: false,
        message: "입력하신 정보와 일치하는 가입 정보를 찾지 못했습니다.",
      });
    }

    if (action === "lookup") {
      return json(200, {
        ok: true,
        found: true,
        username: user.username,
        username_masked: maskUsername(user.username),
        message: "가입 정보를 찾았습니다.",
      });
    }

    const temp = genTempPassword();
    const hash = await bcrypt.hash(temp, 10);

    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: hash,
        must_change_password: true,
        temp_password_issued_at: new Date().toISOString(),
      })
      .eq("uid", user.uid);

    if (updateErr) {
      return json(500, {
        ok: false,
        error: "password_reset_failed",
        message: updateErr.message,
      });
    }

    return json(200, {
      ok: true,
      found: true,
      username: user.username,
      username_masked: maskUsername(user.username),
      temp_password: temp,
      message: "임시 비밀번호가 발급되었습니다.",
    });
  } catch (e: any) {
    return json(500, {
      ok: false,
      error: "unexpected",
      message: e?.message || String(e),
    });
  }
}