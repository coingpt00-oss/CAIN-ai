// scripts/gen-binance-map.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const CG_PATH = path.join(ROOT, "src", "lib", "coingecko-market250.json");

// Binance exchangeInfo는 실시간 fetch로 가져옴
const BINANCE_EXCHANGEINFO = "https://api.binance.com/api/v3/exchangeInfo";

function loadCgItems() {
  const raw = fs.readFileSync(CG_PATH, "utf-8");
  const json = JSON.parse(raw);

  // ✅ 케이스1) { items: [...] }
  if (json && Array.isArray(json.items)) return json.items;

  // ✅ 케이스2) 그냥 배열로 저장된 경우
  if (Array.isArray(json)) return json;

  throw new Error("coingecko-market250.json 형식이 예상과 다릅니다. items 배열이 없음.");
}

async function loadBinanceSymbols() {
  const r = await fetch(BINANCE_EXCHANGEINFO);
  if (!r.ok) throw new Error(`Binance exchangeInfo fetch 실패: ${r.status}`);
  const j = await r.json();

  // USDT 스팟 페어만 대상(차트는 USDT 기준으로 붙일 거라 이게 제일 깔끔)
  const usdtSymbols = new Set(
    (j.symbols || [])
      .filter(s =>
        s.status === "TRADING" &&
        s.quoteAsset === "USDT" &&
        s.isSpotTradingAllowed
      )
      .map(s => s.symbol)
  );

  return usdtSymbols;
}

function buildCandidates(cgSymbolUpper) {
  const cands = [];

  // ✅ 1순위: {SYMBOL}USDT
  cands.push(`${cgSymbolUpper}USDT`);

  // ✅ 2순위: 혹시 "1000SHIB" 같은 바이낸스 특수 네이밍 대응
  // (cg 심볼이 SHIB인데 바이낸스가 1000SHIBUSDT인 경우 등)
  cands.push(`1000${cgSymbolUpper}USDT`);

  return cands;
}

async function main() {
  const cgItems = loadCgItems();
  const binanceSet = await loadBinanceSymbols();

  console.log("CG coins:", cgItems.length);

  const map = {};
  const missing = [];

  for (const c of cgItems) {
    const cgId = c.id;
    const sym = (c.symbol || "").toUpperCase();
    if (!cgId || !sym) {
      missing.push({ id: cgId, reason: "no id/symbol" });
      continue;
    }

    const candidates = buildCandidates(sym);
    const found = candidates.find(x => binanceSet.has(x));

    if (found) {
      map[cgId] = found;
    } else {
      missing.push({ id: cgId, symbol: sym });
    }
  }

  const outTs = `// src/lib/binanceMap.ts
export const BINANCE_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};
`;

  const OUT_MAP = path.join(ROOT, "src", "lib", "binanceMap.ts");
  fs.writeFileSync(OUT_MAP, outTs, "utf-8");

  const OUT_MISSING = path.join(ROOT, "scripts", "missing-binance.json");
  fs.writeFileSync(OUT_MISSING, JSON.stringify(missing, null, 2), "utf-8");

  console.log("✅ 매칭 성공:", Object.keys(map).length);
  console.log("❌ 매칭 실패:", missing.length);
  console.log("binanceMap.ts 생성 완료:", OUT_MAP);
  console.log("missing-binance.json 저장:", OUT_MISSING);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
