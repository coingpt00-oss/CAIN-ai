// src/app/news/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import TimeAgo from "@/components/TimeAgo";
import NewsThumb from "@/components/NewsThumb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewsRow = {
  id?: string;
  slot_key?: string;
  source_code?: string | null;
  source?: string | null;
  title?: string | null;
  url?: string | null;
  summary?: string | null;
  image_url?: string | null;
  origin_image_url?: string | null;
  origin_site_name?: string | null;
  lang?: string | null;
  created_at?: string | null;
  primary_category?: string | null;
  news_categories?: string[] | null;
};

type NewsApiResponse = {
  ok?: boolean;
  items?: NewsRow[];
  page?: {
    limit?: number;
    offset?: number;
    total?: number | null;
    page?: number;
    totalPages?: number | null;
  };
  error?: string;
};

type SearchParams = {
  q?: string | string[];
  source?: string | string[];
  lang?: string | string[];
  tab?: string | string[];
  page?: string | string[];
};

const PAGE_SIZE = 20;

const SOURCE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "blockmedia", label: "블록미디어" },
  { value: "tokenpost", label: "토큰포스트" },
  { value: "blockchaintoday", label: "블록체인투데이" },
  { value: "coindesk_en", label: "CoinDesk" },
  { value: "cointelegraph_en", label: "Cointelegraph" },
];

const LANG_OPTIONS = [
  { value: "", label: "전체" },
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
];

const CATEGORY_TABS = [
  {
    key: "all",
    label: "전체",
    description: "다채로운 코인 시장 소식들을 한곳에서 확인합니다.",
  },
  {
    key: "market",
    label: "시황",
    description: "시장 흐름, 가격, ETF 자금, 청산, 브리핑 뉴스를 확인합니다.",
  },
  {
    key: "bitcoin",
    label: "비트코인",
    description: "BTC, 비트코인 ETF, 채굴, 고래, 비트코인 수급 뉴스를 확인합니다.",
  },
  {
    key: "ethereum",
    label: "이더리움",
    description: "ETH, 이더리움 ETF, L2, 스테이킹, 생태계 뉴스를 확인합니다.",
  },
  {
    key: "alt_onchain",
    label: "알트·온체인",
    description: "알트코인, 온체인, 디파이, RWA, 토큰화 뉴스를 확인합니다.",
  },
  {
    key: "exchange_policy",
    label: "거래소·정책",
    description: "거래소, 상장, 상장폐지, 규제, 정책, 기관 관련 뉴스를 확인합니다.",
  },
];

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function sourceLabel(item: NewsRow) {
  return item.source || item.origin_site_name || item.source_code || "CAIN";
}

function itemKey(item: NewsRow, fallbackIndex: number) {
  return String(
    item.id || item.slot_key || `${item.source_code || "news"}-${fallbackIndex}`
  );
}

function detailId(item: NewsRow, fallbackIndex: number) {
  return String(item.id || item.slot_key || itemKey(item, fallbackIndex));
}

function makeNewsHref({
  tab,
  source,
  lang,
  q,
  page,
}: {
  tab?: string;
  source?: string;
  lang?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (tab && tab !== "all") params.set("tab", tab);
  else if (tab === "all") params.set("tab", "all");

  if (source) params.set("source", source);
  if (lang) params.set("lang", lang);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/news?${qs}` : "/news";
}

function makePageNumbers(currentPage: number, totalPages: number) {
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);

  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + windowSize - 1);

  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

async function getNewsFromApi({
  source,
  lang,
  tab,
  q,
  page,
}: {
  source: string;
  lang: string;
  tab: string;
  q: string;
  page: number;
}): Promise<{
  items: NewsRow[];
  total: number | null;
  totalPages: number | null;
  error?: string;
  raw?: string;
}> {
  try {
    const baseUrl = await getBaseUrl();
    const offset = (page - 1) * PAGE_SIZE;

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    if (source) params.set("source", source);
    if (lang) params.set("lang", lang);
    if (tab) params.set("tab", tab);
    if (q) params.set("q", q);

    const res = await fetch(`${baseUrl}/api/public/news?${params.toString()}`, {
      method: "GET",
      headers: { accept: "application/json" },

      // Supabase 직접 조회가 아니라 /api/public/news를 거칩니다.
      // /api/public/news는 Vercel CDN 캐시가 걸려 있어 호출 과다를 줄입니다.
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as NewsApiResponse | null;

    if (!res.ok || !json?.ok) {
      return {
        items: [],
        total: null,
        totalPages: null,
        error: json?.error || `news_api_${res.status}`,
        raw: JSON.stringify(json || {}, null, 2),
      };
    }

    return {
      items: json.items || [],
      total: json.page?.total ?? null,
      totalPages: json.page?.totalPages ?? null,
    };
  } catch (e: any) {
    return {
      items: [],
      total: null,
      totalPages: null,
      error: String(e?.message || e),
      raw: String(e?.stack || e),
    };
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q = one(sp.q).trim();
  const source = one(sp.source).trim();
  const lang = one(sp.lang).trim();
  const tab = one(sp.tab).trim() || "all";
  const requestedPage = Math.max(1, Number(one(sp.page) || "1") || 1);

  const { items = [], totalPages, error, raw } = await getNewsFromApi({
    source,
    lang,
    tab,
    q,
    page: requestedPage,
  });

  const activeTabInfo =
    CATEGORY_TABS.find((x) => x.key === tab) || CATEGORY_TABS[0];

  const safeTotalPages = Math.max(1, totalPages || 1);
  const currentPage = Math.min(requestedPage, safeTotalPages);
  const pageNumbers = makePageNumbers(currentPage, safeTotalPages);

  const currentFilters = { tab, source, lang, q };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <section className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand)]">
          뉴스
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          코인 시장의 주요 흐름과 다채로운 소식들을 한곳에서 확인하세요.
        </p>
      </section>

      <section className="mb-5 flex flex-wrap gap-2">
        {CATEGORY_TABS.map((x) => {
          const active = tab === x.key;
          return (
            <Link
              key={x.key}
              href={makeNewsHref({ ...currentFilters, tab: x.key, page: 1 })}
              className={cx(
                "rounded-full border px-4 py-2 text-sm transition",
                active
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] shadow-[0_0_18px_rgba(0,255,255,0.14)]"
                  : "border-white/10 bg-black/20 text-white/70 hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
              )}
            >
              {x.label}
            </Link>
          );
        })}
      </section>

      <section className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-sm font-semibold text-white">
          {activeTabInfo.label}
        </div>
        <div className="mt-1 text-sm text-white/60">
          {activeTabInfo.description}
        </div>
      </section>

      <section className="mb-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div>
          <div className="mb-2 text-xs font-semibold text-white/45">출처</div>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((x) => {
              const active = source === x.value;
              return (
                <Link
                  key={x.value || "all-source"}
                  href={makeNewsHref({
                    ...currentFilters,
                    source: x.value,
                    page: 1,
                  })}
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                      : "border-white/10 bg-black/20 text-white/65 hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
                  )}
                >
                  {x.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-white/45">언어</div>
          <div className="flex flex-wrap gap-2">
            {LANG_OPTIONS.map((x) => {
              const active = lang === x.value;
              return (
                <Link
                  key={x.value || "all-lang"}
                  href={makeNewsHref({
                    ...currentFilters,
                    lang: x.value,
                    page: 1,
                  })}
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                      : "border-white/10 bg-black/20 text-white/65 hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
                  )}
                >
                  {x.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <form
        action="/news"
        method="GET"
        className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4"
      >
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="lang" value={lang} />

        <div className="grid gap-3 md:grid-cols-[1fr_90px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="뉴스 검색 예: BTC, ETF, 상장, 온체인"
            className="h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--brand)]/60"
          />

          <button
            type="submit"
            className="h-12 rounded-xl border border-[var(--brand)]/60 bg-[var(--brand)]/10 px-4 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)]/15"
          >
            검색
          </button>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 text-xs text-white/45">
        <span>
          {currentPage} / {safeTotalPages} 페이지
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-200">
            뉴스 목록 데이터를 불러오지 못했습니다.
          </p>
          <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl bg-black/40 p-3 text-xs text-white/60">
            {String(raw || error).slice(0, 1400)}
          </pre>
        </div>
      )}

      {items.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/60">
          조건에 맞는 뉴스가 없습니다.
        </div>
      )}

      <section className="grid gap-4">
        {items.map((it, index) => {
          const absoluteIndex = (currentPage - 1) * PAGE_SIZE + index;
          const idOrKey = itemKey(it, absoluteIndex);
          const id = detailId(it, absoluteIndex);
          const label = sourceLabel(it);
          const detailHref = `/news/${encodeURIComponent(id)}`;

          return (
            <Link
              key={idOrKey}
              href={detailHref}
              className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-[var(--brand)]/40 hover:bg-white/[0.03]"
            >
              <article>
                <div className="flex gap-4">
                  <NewsThumb
                    src={it.image_url || it.origin_image_url}
                    fallbackSrc="/cain-news-default.png"
                    sourceLabel={label}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
                      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-white/70">
                        {label}
                      </span>

                      {it.created_at ? (
                        <span suppressHydrationWarning>
                          <TimeAgo iso={it.created_at} />
                        </span>
                      ) : null}
                    </div>

                    <h2 className="line-clamp-2 text-lg font-bold leading-snug text-white transition group-hover:text-[var(--brand)]">
                      {it.title || "제목 없음"}
                    </h2>

                    {it.summary ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/65">
                        {it.summary}
                      </p>
                    ) : null}

                    <div className="mt-3">
                      <span className="text-sm font-semibold text-[var(--brand)] underline underline-offset-4 group-hover:text-cyan-200">
                        상세보기 →
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </section>

      {safeTotalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={makeNewsHref({
              ...currentFilters,
              page: Math.max(1, currentPage - 1),
            })}
            className={cx(
              "rounded-full border px-4 py-2 text-sm transition",
              currentPage <= 1
                ? "pointer-events-none border-white/10 text-white/25"
                : "border-white/10 text-white/70 hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
            )}
          >
            이전
          </Link>

          {pageNumbers.map((p) => {
            const active = p === currentPage;
            return (
              <Link
                key={p}
                href={makeNewsHref({ ...currentFilters, page: p })}
                className={cx(
                  "min-w-10 rounded-full border px-4 py-2 text-center text-sm transition",
                  active
                    ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                    : "border-white/10 text-white/70 hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
                )}
              >
                {p}
              </Link>
            );
          })}

          <Link
            href={makeNewsHref({
              ...currentFilters,
              page: Math.min(safeTotalPages, currentPage + 1),
            })}
            className={cx(
              "rounded-full border px-4 py-2 text-sm transition",
              currentPage >= safeTotalPages
                ? "pointer-events-none border-white/10 text-white/25"
                : "border-white/10 text-white/70 hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
            )}
          >
            다음
          </Link>
        </nav>
      ) : null}

      <section className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-white/40">
        뉴스 제목, 요약, 이미지의 권리는 각 원문 제공처에 있으며, CAIN은 원문 링크와 함께 주요 소식을 정리해 제공합니다.
      </section>
    </main>
  );
}