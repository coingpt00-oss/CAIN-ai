// src/app/news/page.tsx
import Link from "next/link";
import TimeAgo from "@/components/TimeAgo";
import NewsThumb from "@/components/NewsThumb";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // dev 캐시 방지

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
};

async function getNewsFromSupabase(): Promise<{
  items: NewsRow[];
  updatedAt: string | null;
  error?: string;
  raw?: string;
  via: "supabase";
}> {
  try {
    const sb = getSupabaseServer();

    // ✅ 최신 60개만 (원하면 조절)
    const { data, error } = await sb
      .from("news_posts")
      .select(
        "id, slot_key, source_code, source, title, url, summary, image_url, origin_image_url, origin_site_name, lang, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      return {
        items: [],
        updatedAt: null,
        error: error.message,
        raw: JSON.stringify(error, null, 2),
        via: "supabase",
      };
    }

    const items = (data || []) as NewsRow[];
    const updatedAt = items?.[0]?.created_at ?? null;

    return { items, updatedAt, via: "supabase" };
  } catch (e: any) {
    return {
      items: [],
      updatedAt: null,
      error: String(e?.message || e),
      raw: String(e?.stack || e),
      via: "supabase",
    };
  }
}

export default async function Page() {
  const { items = [], updatedAt, error, raw, via } =
    await getNewsFromSupabase();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2 text-[var(--brand)]">뉴스</h1>

      <p className="text-sm opacity-70 mb-6">
        Updated: <span suppressHydrationWarning>{updatedAt ?? "-"}</span>
        {updatedAt && (
          <span className="ml-2 text-xs text-teal-300">
            (<TimeAgo iso={updatedAt} />)
          </span>
        )}
        <span className="ml-2 text-xs opacity-50">via: {via}</span>
      </p>

      {error && (
        <div className="mb-6">
          <p className="text-sm opacity-70">
            목록 데이터를 읽는 데 실패했습니다요, 보스.
          </p>
          <pre className="mt-3 p-3 rounded bg-black/40 whitespace-pre-wrap text-xs">
            {String(raw).slice(0, 1400)}
          </pre>
        </div>
      )}

      {items.length === 0 && !error && (
        <div className="opacity-60 text-sm">표시할 뉴스가 없습니다.</div>
      )}

      <div className="grid gap-5">
        {items.map((it: any) => {
          const idOrKey = it.id ?? it.slot_key;
          const sourceLabel = it.source || it.source_code || "CAIN";

          return (
            <article
              key={idOrKey}
              className="block rounded-2xl bg-[var(--background)]/40 ring-1 ring-white/10 hover:ring-[var(--brand)]/40 transition p-5 group"
            >
              <div className="flex items-start gap-4">
                <NewsThumb
                  src={it.image_url || it.origin_image_url}
                  fallbackSrc="/cain-news-default.png"
                  sourceLabel={sourceLabel}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs opacity-60 mb-1">
                    <span className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5">
                      {sourceLabel}
                    </span>
                    <span>•</span>
                    {it.created_at ? (
                      <>
                        <span suppressHydrationWarning>{it.created_at}</span>
                        <span className="ml-1">
                          (<TimeAgo iso={it.created_at} />)
                        </span>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold leading-snug group-hover:text-[var(--brand)] transition">
                    {it.title}
                  </h2>

                  {it.summary && (
                    <p className="text-sm opacity-80 mt-1 line-clamp-2">
                      {it.summary}
                    </p>
                  )}

                  <div className="mt-2">
                    <Link
                      href={`/news/${encodeURIComponent(String(idOrKey))}`}
                      className="text-[var(--brand)] text-xs underline underline-offset-4"
                    >
                      상세보기 →
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
