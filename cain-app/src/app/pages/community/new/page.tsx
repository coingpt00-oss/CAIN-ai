// src/app/pages/community/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category =
  | "all"
  | "btc"
  | "alt"
  | "derivatives"
  | "airdrop_event"
  | "free";

type CainUser = {
  uid: string;
  username: string;
  role?: string;
};

const categoryOptions: { value: Category; label: string }[] = [
  { value: "btc", label: "비트코인" },
  { value: "alt", label: "알트코인" },
  { value: "derivatives", label: "선물·마진" },
  { value: "airdrop_event", label: "에어드랍&이벤트" },
  { value: "free", label: "자유" },
];

export default function CommunityNewPage() {
  const router = useRouter();

  const [user, setUser] = useState<CainUser | null>(null);

  const [category, setCategory] = useState<Category>("btc");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coinSymbol, setCoinSymbol] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // 로그인 유저 정보 가져오기
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("cain_user");
      if (!raw) return;
      const parsed = JSON.parse(raw) as CainUser;
      setUser(parsed);
    } catch {
      // 무시
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인 후에만 글을 작성할 수 있습니다.");
      return;
    }

    if (!title.trim()) {
      alert("제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력해 주세요.");
      return;
    }

    const tags =
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0) ?? [];

    try {
      setSubmitting(true);

      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cain-uid": user.uid,
          "x-cain-username": user.username,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
          coinSymbol: coinSymbol.trim() || null,
          tags,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        console.error("create post error", json);
        alert("글 작성 중 오류가 발생했습니다.");
        return;
      }

      const newId = json.post.id as number;

      // 글 생성 성공 → 상세 페이지로 이동
      router.push(`/pages/community/${newId}`);
    } catch (err) {
      console.error("create post fatal", err);
      alert("네트워크 오류로 글을 작성하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="w-full px-4 md:px-8 py-10">
      <section className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            새 글 작성
          </h1>
          <p className="text-sm text-white/60">
            시장 이야기, 전략 공유, 에어드랍 정보까지 자유롭게 남겨 주세요.
          </p>
        </header>

        {!user && (
          <div className="mb-4 rounded-lg border border-dashed border-white/25 bg-black/30 px-4 py-3 text-xs text-white/70">
            로그인 정보가 없습니다.{" "}
            <span className="text-[var(--brand)]">
              (현재는 로컬스토리지의 cain_user 값을 기준으로 동작)
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 카테고리 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="rounded-md bg-zinc-900 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand)]"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 제목 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md bg-zinc-900 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="제목을 입력하세요."
            />
          </div>

          {/* 코인 심볼 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">
              코인 심볼 (선택, 예: BTC, SOL)
            </label>
            <input
              value={coinSymbol}
              onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
              className="rounded-md bg-zinc-900 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="BTC"
            />
          </div>

          {/* 태그 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">
              태그 (쉼표로 구분, 예: 비트코인, 레버리지)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="rounded-md bg-zinc-900 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="비트코인, 레버리지, 변동성"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="rounded-md bg-zinc-900 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand)] whitespace-pre-wrap"
              placeholder="내용을 입력하세요."
            />
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/pages/community")}
              className="px-4 py-2 rounded-full border border-white/20 text-xs md:text-sm text-white/70 hover:bg-white/5"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-full bg-[var(--brand)] text-black text-xs md:text-sm font-semibold hover:bg-[var(--brand)]/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "작성 중…" : "등록하기"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
