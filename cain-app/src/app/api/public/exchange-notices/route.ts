// src/app/api/public/exchange-notices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExchangeNoticeItem = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  last_checked_at: string | null;
  source: string | null;
  source_id: string | null;
  exchange: string | null;
  title: string | null;
  summary_ko: string | null;
  detail_excerpt: string | null;
  url: string | null;
  category: string | null;
  notice_type: string | null;
  severity: string | null;
  symbols: string[] | null;
  chains: string[] | null;
  markets: string[] | null;
  published_at: string | null;
  source_published_at: string | null;
  modified_at: string | null;
  detail_fetch_status: string | null;
  detail_fetched_at: string | null;
  is_active: boolean | null;
  is_important: boolean | null;
};

type ApiResponse =
  | {
      ok: true;
      items: ExchangeNoticeItem[];
      page: { limit: number; offset: number; total: number | null };
      filters: {
        exchange: string;
        category: string;
        severity: string;
        important: boolean;
        symbol: string;
        q: string;
      };
      updatedAt: string;
    }
  | { ok: false; items: []; error: string; detail?: any; updatedAt: string };

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

const PRIVATE_HEADERS = {
  ...JSON_HEADERS,
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  vary: "Authorization, Cookie",
};

const EXCHANGES = new Set([
  "upbit",
  "bithumb",
  "coinone",
  "korbit",
  "binance",
  "bybit",
  "bitget",
  "okx",
]);

const CATEGORIES = new Set([
  "deposit_withdrawal",
  "listing",
  "delisting",
  "trading_update",
  "futures_margin",
  "maintenance",
  "network_upgrade",
  "token_migration",
  "security_api",
]);

const SEVERITIES = new Set(["critical", "high", "medium", "low"]);

function j(status: number, body: ApiResponse) {
  return new NextResponse(JSON.stringify(body), { status, headers: PRIVATE_HEADERS });
}

function unauthorized() {
  return j(401, {
    ok: false,
    items: [],
    error: "auth_required",
    updatedAt: new Date().toISOString(),
  });
}

function clean(v: string | null) {
  return String(v || "").trim().toLowerCase();
}

function cleanUpper(v: string | null) {
  return String(v || "").trim().toUpperCase();
}

function validSetValue(value: string, set: Set<string>) {
  return value && set.has(value) ? value : "";
}

function parseBool(v: string | null) {
  const s = clean(v);
  return s === "1" || s === "true" || s === "yes" || s === "important";
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

function matchesSearch(row: ExchangeNoticeItem, q: string) {
  if (!q) return true;

  const haystack = [
    row.exchange,
    row.title,
    row.summary_ko,
    row.detail_excerpt,
    row.category,
    row.notice_type,
    row.severity,
    row.url,
    ...(row.symbols || []),
    ...(row.chains || []),
    ...(row.markets || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q.toLowerCase());
}

export async function GET(req: NextRequest) {
  try {
    if (!requireCainAuth(req)) {
      return unauthorized();
    }

    const url = new URL(req.url);

    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || "80") || 80, 1),
      200
    );
    const offset = Math.max(Number(url.searchParams.get("offset") || "0") || 0, 0);

    const exchange = validSetValue(clean(url.searchParams.get("exchange")), EXCHANGES);
    const category = validSetValue(clean(url.searchParams.get("category")), CATEGORIES);
    const severity = validSetValue(clean(url.searchParams.get("severity")), SEVERITIES);
    const important = parseBool(url.searchParams.get("important"));
    const symbol = cleanUpper(url.searchParams.get("symbol"));
    const qText = String(url.searchParams.get("q") || "").trim();

    const needsClientFilter = Boolean(qText);
    const fetchLimit = needsClientFilter ? Math.min(Math.max(limit * 8, 300), 1000) : limit;

    let query: any = (supabaseAdmin.from("exchange_notices_public") as any)
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
        ].join(","),
        { count: "exact" }
      )
      .order("source_published_at", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (exchange) query = query.eq("exchange", exchange);
    if (category) query = query.eq("category", category);
    if (severity) query = query.eq("severity", severity);
    if (important) query = query.eq("is_important", true);
    if (symbol) query = query.contains("symbols", [symbol]);

    if (needsClientFilter) query = query.range(0, fetchLimit - 1);
    else query = query.range(offset, offset + fetchLimit - 1);

    const result = (await query) as {
      data: ExchangeNoticeItem[] | null;
      error: { message?: string; details?: string; hint?: string } | null;
      count: number | null;
    };

    if (result.error) {
      return j(500, {
        ok: false,
        items: [],
        error: result.error.message || "supabase_error",
        detail: result.error,
        updatedAt: new Date().toISOString(),
      });
    }

    let rows = result.data || [];
    if (qText) rows = rows.filter((row) => matchesSearch(row, qText)).slice(offset, offset + limit);

    return j(200, {
      ok: true,
      items: rows,
      page: { limit, offset, total: qText ? null : result.count ?? null },
      filters: { exchange, category, severity, important, symbol, q: qText },
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return j(500, {
      ok: false,
      items: [],
      error: err?.message || "unexpected_error",
      detail: String(err),
      updatedAt: new Date().toISOString(),
    });
  }
}