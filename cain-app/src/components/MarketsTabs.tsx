// src/components/MarketsTabs.tsx
"use client";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export default function MarketsTabs() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const tab = sp.get("tab") ?? "value"; // value | trending

  const link = (t: "value" | "trending") => {
    const p = new URLSearchParams(sp);
    p.set("tab", t);
    return `${pathname}?${p.toString()}`;
  };

  const base =
    "px-4 py-2 rounded-full text-sm border transition-colors";
  const on  = base + " bg-[var(--brand)]/20 border-[var(--brand)] text-[var(--brand)]";
  const off = base + " border-white/15 hover:bg-white/5 text-white/80";

  return (
    <div className="mb-4 flex gap-2">
      <Link className={tab === "value" ? on : off} href={link("value")}>가치</Link>
      <Link className={tab === "trending" ? on : off} href={link("trending")}>인기</Link>
    </div>
  );
}
