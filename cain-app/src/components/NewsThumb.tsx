//src/components/NewsThumb.tsx
"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  fallbackSrc: string;
  sourceLabel: string;
  className?: string;
};

export default function NewsThumb({
  src,
  alt = "",
  fallbackSrc,
  sourceLabel,
  className = "",
}: Props) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  return (
    <div className={`relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/10 ${className}`}>
      {/* 정사각형 + 꽉 채우기 */}
      <img
        src={imgSrc}
        alt={alt || sourceLabel}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setImgSrc(fallbackSrc)}  // ✅ 폴백 이미지
      />

      {/* 출처 라벨 */}
      <span className="absolute bottom-1.5 right-1.5 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-md">
        {sourceLabel}
      </span>
    </div>
  );
}
