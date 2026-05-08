// src/lib/airdropReward.ts

export type AirdropRewardLike = {
  reward_usd_lo?: number | null;
  reward_usd_hi?: number | null;
  reward_min?: number | null;
  reward_max?: number | null;
};

function formatUsd(n: number) {
  const isInt = Number.isInteger(n);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: isInt ? 0 : 2,
  }).format(n);
}

// ✅ 이 이름이 "유일한 정답"
export function rewardUsdText(item: AirdropRewardLike) {
  const lo = item.reward_usd_lo ?? item.reward_min ?? null;
  const hi = item.reward_usd_hi ?? item.reward_max ?? null;

  if (lo == null && hi == null) return "정보 없음";

  if (lo != null && hi != null && lo !== hi) {
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    return `${formatUsd(a)} ~ ${formatUsd(b)}`;
  }

  const v = lo ?? hi;
  return v != null ? formatUsd(v) : "정보 없음";
}
