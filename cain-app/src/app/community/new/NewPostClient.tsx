// src/app/community/new/NewPostClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CainUser = {
  uid: string;
  username: string;
  role?: string;
};

type CategoryOption = {
  label: string;
  value: "btc" | "alt" | "derivatives" | "airdrop_event" | "free";
};

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const categories: CategoryOption[] = [
  { label: "비트코인", value: "btc" },
  { label: "알트코인", value: "alt" },
  { label: "선물·마진", value: "derivatives" },
  { label: "에어드랍&이벤트", value: "airdrop_event" },
  { label: "자유", value: "free" },
];

function readLocalUser(): CainUser | null {
  try {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem("cain_user");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CainUser;
    if (!parsed?.uid) return null;

    return parsed;
  } catch {
    return null;
  }
}

function readLocalToken() {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("cain_token") || "";
  } catch {
    return "";
  }
}

function parseTags(value: string) {
  return value
    .split(/[,\s#]+/g)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function validateImageFiles(files: File[]) {
  if (files.length > MAX_IMAGES) {
    return `이미지는 게시글당 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`;
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return "이미지는 jpg, png, webp 파일만 업로드할 수 있습니다.";
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return "이미지는 장당 최대 5MB까지만 업로드할 수 있습니다.";
    }
  }

  return null;
}

async function uploadImage(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/community/upload-image", {
    method: "POST",
    headers,
    body: formData,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `image_upload_failed_${res.status}`);
  }

  const url = json.publicUrl || json.url;
  if (!url) {
    throw new Error("image_url_missing");
  }

  return String(url);
}

export default function NewPostClient() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<CainUser | null>(null);
  const [token, setToken] = useState("");

  const [category, setCategory] = useState<CategoryOption["value"]>("btc");
  const [coinSymbol, setCoinSymbol] = useState("BTC");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isAuthed = useMemo(() => !!user?.uid || !!token, [user?.uid, token]);

  useEffect(() => {
    const nextUser = readLocalUser();
    const nextToken = readLocalToken();

    setUser(nextUser);
    setToken(nextToken);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!isAuthed) {
      alert("커뮤니티 글쓰기는 CAIN 회원 전용 기능입니다.\n로그인 후 이용해 주세요.");
      router.replace("/login?next=/community/new");
    }
  }, [authChecked, isAuthed, router]);

  function handleImageFileChange(files: FileList | null) {
    const selected = Array.from(files || []);
    const validationError = validateImageFiles(selected);

    if (validationError) {
      setMsg(validationError);
      setImageFiles([]);
      return;
    }

    setMsg(null);
    setImageFiles(selected.slice(0, MAX_IMAGES));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthed) {
      alert("커뮤니티 글쓰기는 CAIN 회원 전용 기능입니다.\n로그인 후 이용해 주세요.");
      router.replace("/login?next=/community/new");
      return;
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanCoinSymbol = coinSymbol.trim().toUpperCase();

    if (!cleanTitle) {
      setMsg("제목을 입력해 주세요.");
      return;
    }

    if (!cleanContent) {
      setMsg("내용을 입력해 주세요.");
      return;
    }

    const validationError = validateImageFiles(imageFiles);
    if (validationError) {
      setMsg(validationError);
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const uploadedImageUrls: string[] = [];

      for (const file of imageFiles) {
        const url = await uploadImage(file, token);
        uploadedImageUrls.push(url);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category,
          title: cleanTitle,
          content: cleanContent,
          coin_symbol: cleanCoinSymbol || null,
          tags: parseTags(tagsText),
          images: uploadedImageUrls,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `post_create_failed_${res.status}`);
      }

      const newId = json?.id ?? json?.post?.id;

      if (!newId) {
        router.push("/community");
        return;
      }

      router.push(`/community/${encodeURIComponent(String(newId))}`);
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message || "글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        로그인 상태를 확인하는 중입니다.
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        로그인 페이지로 이동 중입니다.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">새 글 쓰기</h1>
        <p className="text-xs text-white/60">
          시장 상황 공유, 전략 정리, 리딩방 후기 등 자유롭게 작성하시면 됩니다.
          단, 과도한 홍보/사기는 운영 정책에 따라 제재될 수 있습니다.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryOption["value"])}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">관련 코인 심볼</label>
        <input
          value={coinSymbol}
          onChange={(e) => setCoinSymbol(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          placeholder="예: BTC, ETH, SOL"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          placeholder="제목을 입력하세요."
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[var(--brand)]"
          rows={10}
          placeholder={
            "내용을 입력하세요.\n\n시황 분석, 진입/청산 시나리오, 주의할 점 등을 자세히 적어주시면 다른 회원들에게 큰 도움이 됩니다."
          }
          maxLength={20000}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">태그</label>
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          placeholder="예: 비트코인 단타 시황"
        />
        <p className="text-[11px] text-white/40">
          쉼표, 공백, # 기준으로 최대 8개까지 저장됩니다.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">이미지</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleImageFileChange(e.target.files)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-[var(--brand)]/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--brand)]"
          disabled={submitting}
        />

        {imageFiles.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
            이미지 {imageFiles.length}장 선택됨: {" "}
            {imageFiles.map((file) => file.name).join(", ")}
          </div>
        ) : null}

        <p className="text-[11px] text-white/40">
          게시글당 최대 4장, 장당 최대 5MB. jpg, png, webp만 허용됩니다.
          gif, mp4, mov 등 영상 파일은 업로드할 수 없습니다.
        </p>
      </div>

      {msg && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          {msg}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/community")}
          className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/70 hover:bg-white/5"
          disabled={submitting}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] text-xs font-semibold hover:bg-[var(--brand)]/30 disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </form>
  );
}