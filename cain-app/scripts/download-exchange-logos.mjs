// scripts/download-exchange-logos.mjs
import fs from "fs/promises";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "exchanges");

const TARGETS = {
  binance: {
    ids: ["binance"],
    names: ["binance"],
  },
  bybit: {
    ids: ["bybit_spot", "bybit"],
    names: ["bybit"],
  },
  bitget: {
    ids: ["bitget"],
    names: ["bitget"],
  },
  okx: {
    ids: ["okex", "okx"],
    names: ["okx", "okex"],
  },
  kraken: {
    ids: ["kraken"],
    names: ["kraken"],
  },
  coinbase: {
    ids: ["gdax", "coinbase_exchange", "coinbase"],
    names: ["coinbase"],
  },
  upbit: {
    ids: ["upbit"],
    names: ["upbit"],
  },
  bithumb: {
    ids: ["bithumb"],
    names: ["bithumb"],
  },
  coinone: {
    ids: ["coinone"],
    names: ["coinone", "coin one"],
  },
  korbit: {
    ids: ["korbit"],
    names: ["korbit"],
  },
};

function extFromContentType(contentType = "") {
  const ct = contentType.toLowerCase();
  if (ct.includes("svg")) return "svg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  return "png";
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${url}`);
  }

  return res.json();
}

async function downloadFile(url, outBaseName) {
  const res = await fetch(url, {
    headers: {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} while downloading ${url}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const ext = extFromContentType(contentType);
  const buf = Buffer.from(await res.arrayBuffer());

  if (!buf.length) {
    throw new Error(`Downloaded empty file from ${url}`);
  }

  const outPath = path.join(OUT_DIR, `${outBaseName}.${ext}`);
  await fs.writeFile(outPath, buf);

  return {
    outPath,
    bytes: buf.length,
    contentType,
  };
}

function findExchange(exchanges, target) {
  for (const id of target.ids) {
    const found = exchanges.find(
      (ex) => String(ex.id || "").toLowerCase() === id
    );
    if (found) return found;
  }

  for (const name of target.names) {
    const found = exchanges.find((ex) =>
      String(ex.name || "").toLowerCase().includes(name)
    );
    if (found) return found;
  }

  return null;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const all = [];

  for (let page = 1; page <= 4; page += 1) {
    const url = `https://api.coingecko.com/api/v3/exchanges?per_page=250&page=${page}`;
    const rows = await fetchJson(url);

    if (!Array.isArray(rows) || !rows.length) break;

    all.push(...rows);

    // CoinGecko API 과호출 방지
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  console.log(`Loaded ${all.length} exchanges from CoinGecko`);

  const manifest = {};

  for (const [key, target] of Object.entries(TARGETS)) {
    const found = findExchange(all, target);

    if (!found) {
      console.log(`MISS ${key}: exchange not found`);
      manifest[key] = { ok: false, reason: "not_found" };
      continue;
    }

    if (!found.image) {
      console.log(`MISS ${key}: image missing for ${found.id} / ${found.name}`);
      manifest[key] = { ok: false, reason: "image_missing", found };
      continue;
    }

    try {
      const saved = await downloadFile(found.image, key);

      console.log(
        `OK ${key}: ${found.id} / ${found.name} -> ${saved.outPath} (${saved.bytes} bytes)`
      );

      manifest[key] = {
        ok: true,
        coingecko_id: found.id,
        name: found.name,
        source_image: found.image,
        file: path.basename(saved.outPath),
        bytes: saved.bytes,
        content_type: saved.contentType,
      };
    } catch (e) {
      console.log(`FAIL ${key}: ${e.message}`);

      manifest[key] = {
        ok: false,
        reason: e.message,
        found,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Saved manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});