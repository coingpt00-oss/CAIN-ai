// src/components/TierBadge.tsx
"use client";

import CrownMaskIcon, { tierColor } from "@/components/CrownMaskIcon";

type TierBadgeProps = {
  tier?: number | null;
  size?: "xs" | "sm" | "md" | "lg" | number;
  showLabel?: boolean;
  className?: string;
};

function getSizePx(size: TierBadgeProps["size"]) {
  if (typeof size === "number") return size;

  switch (size) {
    case "xs":
      return 16;
    case "sm":
      return 20;
    case "lg":
      return 34;
    case "md":
    default:
      return 26;
  }
}

function getTierLabel(tier: number) {
  if (tier >= 1) return "RED";
  return "WHITE";
}

export default function TierBadge({
  tier = 0,
  size = "sm",
  showLabel = false,
  className = "",
}: TierBadgeProps) {
  const safeTier = Number.isFinite(Number(tier)) ? Number(tier) : 0;
  const color = tierColor(safeTier);
  const sizePx = getSizePx(size);
  const label = getTierLabel(safeTier);

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle ${className}`}
      title={`CAIN ${label} 등급`}
      aria-label={`CAIN ${label} 등급`}
    >
      <CrownMaskIcon src="/tier-logo.png" size={sizePx} color={color} />

      {showLabel ? (
        <span
          className="text-[10px] font-semibold leading-none"
          style={{ color }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}