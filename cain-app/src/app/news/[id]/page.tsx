// src/app/news/[id]/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AiBox from "@/components/ai/AiBox";

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

  content?: string | null;
  thumb?: string | null;
  image?: string | null;
  published_at?: string | null;
  via?: string | null;
};

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

function formatDateKR(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ko-KR");
}

async function getNewsDetailFromSupabase(id: string): Promise<NewsRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("news_posts")
    .select("id, slot_key, source_code, source, title, url, summary, image_url, origin_image_url, origin_site_name, lang, created_at")
    .or(`slot_key.eq.${id},id.eq.${id}`)
    .limit(1);

  if (error) return null;
  return (data?.[0] as NewsRow) || null;
}

function stripMoreLabel(s: string) {
  if (!s) return s;
  const patterns = [/…\s*더보기\s*$/i, /\.{3}\s*더보기\s*$/i, /\(\s*더보기\s*\)\s*$/i, /\[\s*더보기\s*\]\s*$/i, /\s*더보기\s*$/i];
  let out = s.trim();
  for (const p of patterns) out = out.replace(p, "").trim();
  if (out.length > 0 && !out.endsWith("…")) out = out.replace(/\.*$/, "").trim() + "…";
  return out;
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let item: NewsRow | null = null;
  try {
    item = await getNewsDetailFromSupabase(id);
  } catch {
    item = null;
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/news" className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.06]">
              ← 뉴스 목록으로
            </Link>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50">원문 없음</span>
          </div>

          <h1 className="text-2xl font-bold text-white">뉴스</h1>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/80">
            <p className="mb-2 font-semibold">현재 이 뉴스 상세 데이터를 가져오지 못했습니다요, 보스.</p>
            <div className="text-sm text-white/60 leading-relaxed">
              1) Supabase RLS에서 <code className="text-white/70">news_posts</code> 읽기 허용 확인
              <br />
              2) 해당 <code className="text-white/70">slot_key</code> 값이 실제로 존재하는지 확인
              <br />
              3) ENV <code className="text-white/70">NEXT_PUBLIC_SUPABASE_URL</code> / <code className="text-white/70">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 확인
            </div>
          </div>
        </div>
      </main>
    );
  }

  const title = (item.title || "뉴스").trim();
  const rawBody = (item.summary || item.content || "").trim();
  const body = rawBody ? stripMoreLabel(rawBody) : "";

  const thumb = item.image_url || item.origin_image_url || item.thumb || item.image || null;

  const sourceLabel = item.source || item.origin_site_name || item.via || item.source_code || "CAIN";
  const timeText = formatDateKR(item.published_at || item.created_at);
  const originalUrl = item.url || null;

  const neonBtn =
    "rounded-full border bg-white/[0.03] px-4 py-2 text-sm transition " +
    "border-[var(--brand)]/60 text-[var(--brand)] " +
    "hover:bg-white/[0.06] hover:border-[var(--brand)]/90 " +
    "hover:shadow-[0_0_18px_rgba(0,255,255,0.18)]";

  const disabledBtn = "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50";

  const aiContext = {
    type: "news",
    id: item.id || id,
    slot_key: item.slot_key || null,
    source: sourceLabel,
    title,
    summary: body || null,
    url: originalUrl,
    created_at: item.created_at || null,
    lang: item.lang || null,
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/news" className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.06]">
            ← 뉴스 목록으로
          </Link>
        </div>

        <div className="mb-2 text-sm text-white/40">
          {sourceLabel}
          {timeText ? <span className="ml-2">· {timeText}</span> : null}
        </div>

        <h1 className="text-3xl font-extrabold leading-snug text-cyan-300">{title}</h1>

        {thumb ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt={title} className="h-auto w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          </div>
        ) : null}

        {body ? (
          <p className="mt-4 whitespace-pre-line text-white/70 leading-relaxed">{body}</p>
        ) : (
          <p className="mt-4 text-white/50 text-sm">요약 내용이 없습니다요, 보스. (RSS/OG 메타가 비어있는 케이스일 수 있습니다요)</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {originalUrl ? (
            <a href={originalUrl} target="_blank" rel="noreferrer" className={neonBtn}>
              원문 링크 보기 ↗
            </a>
          ) : (
            <span className={disabledBtn}>원문 없음</span>
          )}

          <Link href={`/coin-gpt?news=${encodeURIComponent(id)}`} className={neonBtn}>
            CoinGPT로 분석하러 가기 🤖
          </Link>
        </div>

        <div className="mt-6">
          <AiBox
            context={aiContext}
            title="🤖 CAIN AI 분석 (뉴스)"
            buttonLabel="AI로 분석하기"
            placeholder="예) 이 뉴스가 시장에 미칠 영향(단기/중기)과 리스크를 정리해줘"
            helperText="* 이 뉴스의 핵심 요약/출처/링크 등 최소 정보만 AI에 전달됩니다."
            defaultPrompt="이 뉴스의 핵심 요약 + 시장 영향(단기/중기) + 리스크를 한국어로 정리해줘"
            showDebug={false}
          />
        </div>
      </div>
    </main>
  );
}
