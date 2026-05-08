// scripts/check-binance.mjs
import fs from "fs/promises";

// Node 18+ 에서 fetch 기본 지원
const CG_PATH = new URL("../src/lib/coingecko-market250.json", import.meta.url);
const MAP_PATH = new URL("../src/lib/binanceMap.ts", import.meta.url);

// binanceMap.ts에서 객체 리터럴만 대충 뽑아오기
async function readBinanceMap() {
  const ts = await fs.readFile(MAP_PATH, "utf8");
  const m = ts.match(/BINANCE_MAP:\s*Record<string,\s*string>\s*=\s*({[\s\S]*?});/);
  if (!m) return {};
  // TS 객체를 JS로 eval하기 위해 최소 전처리
  const objLiteral = m[1]
    .replace(/\/\/.*$/gm, "")     // 주석 제거
    .replace(/,\s*}/g, "}");      // trailing comma 정리
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${objLiteral});`)();
}

async function readCG() {
  const raw = await fs.readFile(CG_PATH, "utf8");
  const json = JSON.parse(raw);
  // 보스 CG JSON 구조: { ok:true, items:[...] }
  return Array.isArray(json.items) ? json.items : [];
}

function guessSymbol(coin, binanceMap) {
  // 1) 수동/자동 매핑 우선
  if (binanceMap[coin.id]) return binanceMap[coin.id];

  // 2) 없으면 CG symbol 기반으로 USDT 페어 추정
  const base = String(coin.symbol || "").toUpperCase();
  if (!base) return "";
  return `${base}USDT`;
}

async function checkOne(symbol) {
  if (!symbol) return { ok: false, reason: "empty symbol" };

  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1h");
  url.searchParams.set("limit", "1");

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const j = await r.json();
    // 정상: 배열 길이 1 이상
    if (Array.isArray(j) && j.length > 0) return { ok: true };
    return { ok: false, reason: "empty klines" };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

// 간단 동시성 제한
async function mapLimit(list, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < list.length) {
      const idx = i++;
      out[idx] = await fn(list[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const [cg, binanceMap] = await Promise.all([readCG(), readBinanceMap()]);

  console.log("CG coins:", cg.length);

  const results = await mapLimit(
    cg,
    20, // 동시 20개씩만 (바이낸스 레이트리밋 보호)
    async (coin) => {
      const symbol = guessSymbol(coin, binanceMap);
      const res = await checkOne(symbol);
      return { coin, symbol, ...res };
    }
  );

  const okList = results.filter((r) => r.ok);
  const badList = results.filter((r) => !r.ok);

  console.log("✅ 매칭 성공:", okList.length);
  console.log("❌ 매칭 실패:", badList.length);

  // 파일로 저장
  const OK_PATH = new URL("./binance-ok.json", import.meta.url);
  const BAD_PATH = new URL("./missing-binance.json", import.meta.url);

  await fs.writeFile(
    OK_PATH,
    JSON.stringify(
      okList.map((r) => ({ id: r.coin.id, cg_symbol: r.coin.symbol, symbol: r.symbol })),
      null,
      2
    )
  );

  await fs.writeFile(
    BAD_PATH,
    JSON.stringify(
      badList.map((r) => ({
        id: r.coin.id,
        cg_symbol: r.coin.symbol,
        tried: r.symbol,
        reason: r.reason,
      })),
      null,
      2
    )
  );

  console.log("ok 리스트 저장:", OK_PATH.pathname);
  console.log("missing 리스트 저장:", BAD_PATH.pathname);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
