// src/app/community/[id]/edit/EditPostClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CainUser = {
  uid: string;
  username: string;
  role?: string;
};

type EditPostClientProps = {
  id: string;
};

type CategoryOption = {
  label: string;
  value: "btc" | "alt" | "derivatives" | "airdrop_event" | "free";
};

type CommunityPost = {
  id: number | string;
  category: CategoryOption["value"];
  title: string;
  content: string;
  author_uid?: string | null;
  coin_symbol?: string | null;
  tags?: string[];
  images?: string[];
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

function toCategory(value: any): CategoryOption["value"] {
  const v = String(value || "free").trim().toLowerCase();
  if (v === "btc") return "btc";
  if (v === "alt") return "alt";
  if (v === "derivatives") return "derivatives";
  if (v === "airdrop_event") return "airdrop_event";
  return "free";
}

function normalizeTags(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s#]+/g)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function normalizeImages(value: any): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((v) => {
      if (typeof v === "string") return v;
      return v?.url || v?.publicUrl || v?.src || "";
    })
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .slice(0, MAX_IMAGES);
}

function parseTags(value: string) {
  return value
    .split(/[,\s#]+/g)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function getPostFromResponse(json: any) {
  return json?.post ?? json?.item ?? json?.data ?? json?.payload?.post ?? null;
}

function normalizePost(raw: any): CommunityPost | null {
  const id = raw?.id;
  const title = String(raw?.title || "").trim();

  if (!id || !title) return null;

  return {
    id,
    category: toCategory(raw?.category),
    title,
    content: String(raw?.content || ""),
    author_uid: raw?.author_uid ?? null,
    coin_symbol: raw?.coin_symbol ?? null,
    tags: normalizeTags(raw?.tags),
    images: normalizeImages(raw?.images ?? raw?.image_urls ?? raw?.imageUrls),
  };
}

function validateImageFiles(files: File[], existingCount: number) {
  if (existingCount + files.length > MAX_IMAGES) {
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

export default function EditPostClient({ id }: EditPostClientProps) {
  const router = useRouter();

  const safeId = useMemo(() => String(id || "").trim(), [id]);

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<CainUser | null>(null);
  const [token, setToken] = useState("");

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<CategoryOption["value"]>("free");
  const [coinSymbol, setCoinSymbol] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isAuthed = useMemo(() => !!user?.uid || !!token, [user?.uid, token]);
  const canManage =
    !!post &&
    !!user?.uid &&
    (String(post.author_uid || "") === String(user.uid) || user.role === "admin");

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
      alert("글 수정은 CAIN 회원 전용 기능입니다.\n로그인 후 이용해 주세요.");
      router.replace(`/login?next=/community/${encodeURIComponent(safeId)}/edit`);
    }
  }, [authChecked, isAuthed, router, safeId]);

  useEffect(() => {
    let alive = true;

    async function loadPost() {
      if (!safeId || safeId === "undefined" || safeId === "null") {
        setMsg("잘못된 게시글 ID입니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setMsg(null);

      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`/api/community/posts/${encodeURIComponent(safeId)}`, {
          cache: "no-store",
          headers,
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || `post_fetch_failed_${res.status}`);
        }

        const normalized = normalizePost(getPostFromResponse(json));
        if (!normalized) {
          throw new Error("post_not_found");
        }

        if (alive) {
          setPost(normalized);
          setCategory(normalized.category);
          setCoinSymbol(String(normalized.coin_symbol || ""));
          setTitle(normalized.title);
          setContent(normalized.content);
          setTagsText((normalized.tags || []).join(" "));
          setExistingImages(normalized.images || []);
        }
      } catch (err: any) {
        if (alive) {
          setPost(null);
          setMsg(err?.message || "게시글을 불러오지 못했습니다.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (authChecked && isAuthed) {
      loadPost();
    }

    return () => {
      alive = false;
    };
  }, [safeId, token, authChecked, isAuthed]);

  useEffect(() => {
    if (!authChecked || loading || !post) return;

    if (!canManage) {
      alert("이 글을 수정할 권한이 없습니다.");
      router.replace(`/community/${encodeURIComponent(safeId)}`);
    }
  }, [authChecked, loading, post, canManage, router, safeId]);

  function handleImageFileChange(files: FileList | null) {
    const selected = Array.from(files || []);
    const validationError = validateImageFiles(selected, existingImages.length);

    if (validationError) {
      setMsg(validationError);
      setImageFiles([]);
      return;
    }

    setMsg(null);
    setImageFiles(selected.slice(0, MAX_IMAGES - existingImages.length));
  }

  function removeExistingImage(url: string) {
    setExistingImages((prev) => prev.filter((item) => item !== url));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthed) {
      alert("글 수정은 로그인 후 이용 가능합니다.");
      router.replace(`/login?next=/community/${encodeURIComponent(safeId)}/edit`);
      return;
    }

    if (!post || !canManage) {
      setMsg("수정 권한이 없습니다.");
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

    const validationError = validateImageFiles(imageFiles, existingImages.length);
    if (validationError) {
      setMsg(validationError);
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of imageFiles) {
        const url = await uploadImage(file, token);
        uploadedUrls.push(url);
      }

      const images = [...existingImages, ...uploadedUrls].slice(0, MAX_IMAGES);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`/api/community/posts/${encodeURIComponent(String(post.id))}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          category,
          title: cleanTitle,
          content: cleanContent,
          coin_symbol: cleanCoinSymbol || null,
          tags: parseTags(tagsText),
          images,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `post_update_failed_${res.status}`);
      }

      router.push(`/community/${encodeURIComponent(String(post.id))}`);
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message || "글 수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        게시글 정보를 확인하는 중입니다.
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

  if (!post) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200">
          게시글을 불러오지 못했습니다.
          {msg ? <div className="mt-1 text-xs text-red-200/70">{msg}</div> : null}
        </div>

        <button
          type="button"
          onClick={() => router.push("/community")}
          className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/70 hover:bg-white/5"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">글 수정</h1>
        <p className="text-xs text-white/60">
          작성한 커뮤니티 글의 제목, 내용, 태그, 이미지를 수정할 수 있습니다.
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
          placeholder="내용을 입력하세요."
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

      <div className="space-y-3">
        <label className="text-xs text-white/60">이미지</label>

        {existingImages.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {existingImages.map((src) => (
              <div
                key={src}
                className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="existing community image" className="h-44 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(src)}
                  className="w-full border-t border-white/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
                  disabled={submitting}
                >
                  이미지 제거
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleImageFileChange(e.target.files)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-[var(--brand)]/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--brand)]"
          disabled={submitting || existingImages.length >= MAX_IMAGES}
        />

        {imageFiles.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
            추가 이미지 {imageFiles.length}장 선택됨: {" "}
            {imageFiles.map((file) => file.name).join(", ")}
          </div>
        ) : null}

        <p className="text-[11px] text-white/40">
          게시글당 최대 4장, 장당 최대 5MB. jpg, png, webp만 허용됩니다.
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
          onClick={() => router.push(`/community/${encodeURIComponent(String(post.id))}`)}
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
          {submitting ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </form>
  );
}