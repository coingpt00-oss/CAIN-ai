// src/lib/tier.ts

export function tierColor(tier: number) {
  switch (tier) {
    case 1: return "#ff3b3b";  // red
    case 2: return "#3b82f6";  // blue
    case 3: return "#39ff14";  // neon green
    case 4: return "#a855f7";  // purple
    case 5: return "#c0c0c0";  // silver
    case 6: return "#ffd700";  // gold
    default: return "#ffffff"; // white (가입 직후)
  }
}
