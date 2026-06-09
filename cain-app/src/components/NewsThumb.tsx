// src/components/NewsThumb.tsx
"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <div
      className={[
        "relative shrink-0 overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/10",
        className,
      ].join(" ")}
      style={{
        width: 96,
        minWidth: 96,
        height: 96,
      }}
    >
      <img
        src={imgSrc}
        alt={alt || sourceLabel}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
        }}
      />

      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] leading-none text-white/75">
        {sourceLabel}
      </span>
    </div>
  );
}