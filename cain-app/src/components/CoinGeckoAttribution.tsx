//src/components/CoinGeckoAttribution.tsx
"use client";

type CoinGeckoAttributionProps = {
  className?: string;
};

export default function CoinGeckoAttribution({
  className = "",
}: CoinGeckoAttributionProps) {
  return (
    <div
      className={[
        "mx-auto mt-10 mb-4 w-full max-w-7xl px-4 text-center",
        "text-[11px] leading-relaxed text-white/35",
        className,
      ].join(" ")}
    >
      Data powered by{" "}
      <a
        href="https://www.coingecko.com/en/api"
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-300/70 underline-offset-4 hover:text-cyan-300 hover:underline"
      >
        CoinGecko
      </a>
      . All logos and trademarks belong to their respective owners and are used
      for identification purposes only.
    </div>
  );
}