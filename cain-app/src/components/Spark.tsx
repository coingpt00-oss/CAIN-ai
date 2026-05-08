// components/Spark.tsx
"use client";
type Props = { data?: number[]; width?: number; height?: number; positive?: boolean };
export default function Spark({ data = [], width = 100, height = 28, positive }: Props) {
  if (!data?.length) return <div className="w-[100px] h-[28px] opacity-30">-</div>;
  const min = Math.min(...data), max = Math.max(...data);
  const norm = (v: number) => ((v - min) / (max - min || 1));
  const step = width / (data.length - 1);
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step},${height - norm(v) * height}`).join(" ");
  const stroke = positive ? "stroke-emerald-400" : "stroke-rose-400";
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} className={`${stroke}`} fill="none" strokeWidth="2" />
    </svg>
  );
}
