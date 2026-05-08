// src/components/CrownMaskIcon.tsx
"use client";

// ✅ tier -> color (보스 등급 정책)
export function tierColor(tier: number) {
  switch (tier) {
    case 1:
      return "#ff3b3b"; // red
    case 2:
      return "#3b82f6"; // blue
    case 3:
      return "#39ff14"; // neon green
    case 4:
      return "#a855f7"; // purple
    case 5:
      return "#c0c0c0"; // silver
    case 6:
      return "#ffd700"; // gold
    default:
      return "#ffffff"; // white
  }
}

export function tierName(tier: number) {
  switch (tier) {
    case 1:
      return "RED";
    case 2:
      return "BLUE";
    case 3:
      return "GREEN";
    case 4:
      return "PURPLE";
    case 5:
      return "SILVER";
    case 6:
      return "GOLD";
    default:
      return "WHITE";
  }
}

export default function CrownMaskIcon({
  // ✅ 보스가 만든 파일
  src = "/tier-logo.png",
  size = 52,
  color = "#ffffff",
  glow = true,
}: {
  src?: string;
  size?: number;
  color?: string;
  glow?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "inline-block",
        backgroundColor: color,

        WebkitMaskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        WebkitMaskPosition: "center",

        maskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        maskSize: "contain",
        maskPosition: "center",

        filter: glow ? "drop-shadow(0 0 10px rgba(0,255,255,0.25))" : undefined,
      }}
    />
  );
}
