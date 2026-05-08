"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function MarketsToolbar({
  initialVs,
  initialSparkline,
}: { initialVs: string; initialSparkline: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback((patch: Record<string, string | null>) => {
    const qs = new URLSearchParams(searchParams?.toString() ?? "");
    Object.entries(patch).forEach(([k, v]) => (v === null ? qs.delete(k) : qs.set(k, v)));
    router.replace(`/pages/markets?${qs.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="mb-4 flex items-center gap-3">
      {/* ✅ 통화 옵션 확장 */}
      <select
        defaultValue={initialVs}
        onChange={(e) => update({ vs: e.target.value })}
        className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
      >
        <option value="krw">KRW</option>
        <option value="usd">USD</option>
        <option value="eur">EUR</option>
        <option value="jpy">JPY</option>
      </select>

      {/* ✅ 7일 스파크라인 토글 */}
      <label className="inline-flex items-center gap-2 text-sm opacity-80">
        <input
          type="checkbox"
          defaultChecked={initialSparkline}
          onChange={(e) => update({ sparkline: e.target.checked ? "1" : null })}
        />
        7일 스파크라인
      </label>
    </div>
  );
}
