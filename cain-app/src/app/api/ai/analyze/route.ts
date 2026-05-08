// src/app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Body = {
  prompt?: string;
  context?: any;
};

const COOKIE_NAME = "cain_sess";
const MAX_REQ_PER_DAY = 5;

// hard limits
const MAX_PROMPT_CHARS = 800;
const MAX_CONTEXT_CHARS = 12000;
const MAX_INPUT_CHARS = 14000;
const MAX_OUTPUT_TOKENS = 700;

// pending TTL
const PENDING_TTL_SECONDS = 180;

// ===== cookie verify helpers =====
function sign(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}
function b64urlDecode(input: string) {
  const pad = 4 - (input.length % 4 || 4);
  const b64 = input.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(pad);
  return Buffer.from(b64, "base64").toString("utf8");
}

function parseSessionCookie(
  raw?: string | null
): null | { uid: string; token: string; remember?: boolean } {
  if (!raw) return null;
  const secret = process.env.CAIN_COOKIE_SECRET || "";
  if (!secret) throw new Error("Missing env: CAIN_COOKIE_SECRET");

  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;

  const expected = sign(body, secret);

  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  const json = b64urlDecode(body);
  const obj = JSON.parse(json);

  const uid = (obj?.uid || "").toString().trim();
  const token = (obj?.token || "").toString().trim();
  if (!uid || !token) return null;

  return { uid, token, remember: !!obj?.remember };
}

function safeJsonStringify(v: any, maxChars = MAX_CONTEXT_CHARS) {
  try {
    const s = JSON.stringify(v);
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + "\n...(truncated)";
  } catch {
    return "[unserializable_context]";
  }
}

function kstDayString() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function json(status: number, body: any, headers?: Record<string, string>) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(headers || {}),
    },
  });
}

// ===== CSRF Origin allowlist =====
function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allow = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // 브라우저 쿠키 POST라면 Origin이 거의 항상 들어옵니다.
  if (!origin) return false;
  return allow.includes(origin);
}

async function reserveDaily(uid: string, dayStr: string) {
  const key = `uid:${uid}`;
  const { data, error } = await supabaseAdmin.rpc("ai_usage_reserve", {
    p_key: key,
    p_day: dayStr,
    p_max: MAX_REQ_PER_DAY,
    p_pending_ttl_seconds: PENDING_TTL_SECONDS,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: !!row?.allowed,
    requestId: (row?.request_id as string) || null,
    used: Number(row?.used ?? 0),
    remaining: Number(row?.remaining ?? 0),
    key,
  };
}

async function finalize(requestId: string | null, success: boolean) {
  if (!requestId) return;
  await supabaseAdmin.rpc("ai_usage_finalize", {
    p_request_id: requestId,
    p_success: success,
  });
}

// Responses API 표준 구조: output_text 우선, 없으면 message.content[].text에서 회수
function extractTextFromResponse(resp: any): string {
  const direct = (resp?.output_text ?? "").toString().trim();
  if (direct) return direct;

  const out = resp?.output;
  if (!Array.isArray(out)) return "";

  const chunks: string[] = [];
  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      const t = (c?.text ?? "").toString().trim();
      if (t) chunks.push(t);
    }
  }
  return chunks.join("\n").trim();
}

export async function POST(req: NextRequest) {
  let requestId: string | null = null;
  let finalized = false;
  const day = kstDayString();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return json(500, { ok: false, error: "missing_openai_api_key" });
    }
    if (!process.env.CAIN_COOKIE_SECRET) {
      return json(500, { ok: false, error: "missing_cain_cookie_secret" });
    }

    // CSRF 방어
    if (!isAllowedOrigin(req)) {
      return json(403, { ok: false, error: "forbidden_origin" });
    }

    // 세션 쿠키 확인
    const sessRaw = req.cookies.get(COOKIE_NAME)?.value ?? null;
    const sess = parseSessionCookie(sessRaw);

    if (!sess?.uid) {
      return json(401, {
        ok: false,
        error: "members_only",
        message: "회원만 사용할 수 있는 기능입니다.",
      });
    }

    const uid = sess.uid;
    const token = sess.token;

    // 회원 검증 + 토큰 일치 확인
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("uid, is_verified, tier, role, token")
      .eq("uid", uid)
      .maybeSingle();

    if (userErr) return json(500, { ok: false, error: userErr.message });
    if (!user) {
      return json(401, {
        ok: false,
        error: "members_only",
        message: "회원만 사용할 수 있는 기능입니다.",
      });
    }

    if ((user as any)?.token && String((user as any).token) !== token) {
      return json(401, {
        ok: false,
        error: "session_invalid",
        message: "세션이 만료되었거나 다른 기기에서 재로그인되었습니다.",
      });
    }

    // 1) reserve
    const reserved = await reserveDaily(uid, day);
    requestId = reserved.requestId;

    if (!reserved.allowed) {
      return json(
        429,
        {
          ok: false,
          error: "daily_limit_exceeded",
          message: `AI 기능은 하루 ${MAX_REQ_PER_DAY}회까지 사용 가능합니다.`,
          limit: MAX_REQ_PER_DAY,
          used: reserved.used,
          day,
        },
        {
          "x-ratelimit-limit": String(MAX_REQ_PER_DAY),
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-day": day,
        }
      );
    }

    // 2) body
    let bodyJson: Body = {};
    try {
      bodyJson = (await req.json()) as Body;
    } catch {
      bodyJson = {};
    }

    const rawPrompt = (bodyJson?.prompt || "이 데이터 요약해줘").toString().trim();
    const prompt =
      rawPrompt.length > MAX_PROMPT_CHARS ? rawPrompt.slice(0, MAX_PROMPT_CHARS) : rawPrompt;

    const context = bodyJson?.context ?? null;
    const contextText = context ? safeJsonStringify(context) : "";

    let inputText =
      `요청:\n${prompt}\n\n` + (contextText ? `컨텍스트(JSON):\n${contextText}\n` : "");

    if (inputText.length > MAX_INPUT_CHARS) {
      inputText = inputText.slice(0, MAX_INPUT_CHARS) + "\n...(input_truncated)";
    }

    // 3) timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    let response: any;
    try {
      response = await client.responses.create(
        {
          model: process.env.OPENAI_MODEL || "gpt-5-nano",
          input: inputText,
          max_output_tokens: MAX_OUTPUT_TOKENS,

          // ✅ 핵심 수정: gpt-5-nano는 "none" 지원 안 함 → "minimal"로 고정
          reasoning: { effort: "minimal" },

          // ✅ 안전: verbosity는 low/medium/high 중 하나만
          text: { verbosity: "low" },
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = extractTextFromResponse(response);

    if (!text) {
      console.error("[AI_ANALYZE_EMPTY_TEXT]", {
        uid,
        day,
        model: process.env.OPENAI_MODEL || "gpt-5-nano",
        output_text_len: (response?.output_text ?? "").length,
        output_types: Array.isArray(response?.output)
          ? response.output.map((o: any) => o?.type).slice(0, 20)
          : null,
        first_output: Array.isArray(response?.output) ? response.output[0] : null,
      });

      if (!finalized) {
        await finalize(requestId, false);
        finalized = true;
      }

      return json(500, {
        ok: false,
        error: "empty_ai_text",
        message: "AI 응답 텍스트를 추출하지 못했습니다. (output_text/message 출력 확인 필요)",
      });
    }

    if (!finalized) {
      await finalize(requestId, true);
      finalized = true;
    }

    // rolling 연장
    const remember = !!sess.remember;
    const maxAgeSeconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;

    const res = json(
      200,
      {
        ok: true,
        text,
        usage: (response as any).usage ?? null,
        limit: {
          day,
          used: reserved.used,
          remaining: reserved.remaining,
          max: MAX_REQ_PER_DAY,
        },
      },
      {
        "x-ratelimit-limit": String(MAX_REQ_PER_DAY),
        "x-ratelimit-remaining": String(reserved.remaining),
        "x-ratelimit-reset-day": day,
      }
    );

    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set({
      name: COOKIE_NAME,
      value: sessRaw!,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    return res;
  } catch (e: any) {
    console.error("[AI_ANALYZE_ERROR]", e);

    try {
      if (requestId && !finalized) {
        await finalize(requestId, false);
        finalized = true;
      }
    } catch {}

    const msg = e?.name === "AbortError" ? "openai_timeout" : e?.message || "server_error";
    return json(500, { ok: false, error: msg });
  }
}
