import os
import time
import json
import requests
import ccxt
from datetime import datetime, timezone

# =========================
# CONFIG
# =========================

DEFAULT_TOP100 = [
    "BTC","ETH","USDT","BNB","SOL","XRP","USDC","DOGE","TON","ADA",
    "AVAX","TRX","SHIB","DOT","LINK","BCH","MATIC","ICP","UNI","LTC",
    "NEAR","APT","ETC","XLM","ATOM","HBAR","FIL","IMX","INJ","OP",
    "ARB","STX","TAO","AAVE","MKR","GRT","RUNE","KAS","QNT","FTM",
    "ALGO","TIA","THETA","SAND","MANA","EGLD","AXS","FLOW","EOS","KAVA",
    "NEO","XTZ","CRV","SNX","DYDX","COMP","KSM","ZEC","DASH","CHZ",
    "ENJ","BAT","LDO","WIF","JUP","PYTH","BONK","PEPE","FLOKI","SUI",
    "SEI","JTO","MINA","CFX","WLD","AR","ROSE","IOTA","GALA","1INCH",
    "RNDR","RPL","ENS","ANKR","OCEAN","BLUR","GMT","ZIL","CELO","HNT",
    "XMR","WAVES","QTUM","HOT","IOTX","GLM","LRC","ICX","ONT","ELF",
]

# =========================
# HELPERS
# =========================

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def must_env(name: str) -> str:
    v = (os.getenv(name) or "").strip()
    if not v:
        raise RuntimeError(f"Missing env: {name}")
    return v

def env_top100():
    raw = (os.getenv("TOP100") or "").strip()
    if not raw:
        return DEFAULT_TOP100
    return [x.strip().upper() for x in raw.split(",") if x.strip()]

def safe_get(url: str, timeout=12):
    headers = {
        "Accept": "application/json",
        "User-Agent": "CAIN-BBB-Collector/1.0",
        "Cache-Control": "no-cache",
    }
    return requests.get(url, headers=headers, timeout=timeout)

# =========================
# EXCHANGE FETCHERS
# =========================

def fetch_binance_spot(top100):
    url = "https://api.binance.com/api/v3/ticker/price"
    r = safe_get(url)
    r.raise_for_status()
    data = r.json()

    wanted = set(top100)
    out = {}

    for it in data:
        sym = it["symbol"]
        if sym.endswith("USDT"):
            base = sym[:-4]
            if base in wanted:
                out[base] = float(it["price"])

    if "USDT" in wanted:
        out["USDT"] = 1.0
    if "USDC" in wanted:
        out["USDC"] = 1.0

    return out

def fetch_bybit_spot(top100):
    url = "https://api.bybit.com/v5/market/tickers?category=spot"
    r = safe_get(url)
    r.raise_for_status()
    data = r.json()["result"]["list"]

    wanted = set(top100)
    out = {}

    for it in data:
        sym = it["symbol"]
        if sym.endswith("USDT"):
            base = sym[:-4]
            if base in wanted:
                out[base] = float(it["lastPrice"])

    if "USDT" in wanted:
        out["USDT"] = 1.0
    if "USDC" in wanted:
        out["USDC"] = 1.0

    return out

def fetch_bitget_spot(top100):
    exchange = ccxt.bitget({"enableRateLimit": True})
    exchange.load_markets()

    wanted = set(top100)
    out = {}

    symbols = []
    for base in wanted:
        pair = f"{base}/USDT"
        if pair in exchange.markets:
            symbols.append(pair)

    for i in range(0, len(symbols), 40):
        chunk = symbols[i:i+40]
        tickers = exchange.fetch_tickers(chunk)
        for pair, t in tickers.items():
            base = pair.split("/")[0]
            out[base] = t["last"]
        time.sleep(0.2)

    if "USDT" in wanted:
        out["USDT"] = 1.0
    if "USDC" in wanted:
        out["USDC"] = 1.0

    return out

# =========================
# SUPABASE INSERT
# =========================

def insert_supabase(url, key, payload):
    endpoint = f"{url}/rest/v1/markets_prices"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = {
        "ts": payload["ts"],
        "payload": payload,
    }
    r = requests.post(endpoint, headers=headers, data=json.dumps(body))
    if r.status_code not in (200, 201, 204):
        raise RuntimeError(f"Supabase insert failed: {r.status_code} {r.text}")

# =========================
# MAIN
# =========================

def main():
    SUPABASE_URL = must_env("SUPABASE_URL")
    SUPABASE_KEY = must_env("SUPABASE_SERVICE_ROLE_KEY")

    top100 = env_top100()
    ts = now_iso()

    errors = []

    try:
        binance = fetch_binance_spot(top100)
    except Exception as e:
        binance = {}
        errors.append(f"binance: {e}")

    try:
        bybit = fetch_bybit_spot(top100)
    except Exception as e:
        bybit = {}
        errors.append(f"bybit: {e}")

    try:
        bitget = fetch_bitget_spot(top100)
    except Exception as e:
        bitget = {}
        errors.append(f"bitget: {e}")

    payload = {
        "ts": ts,
        "global": {"spot": {}, "futures": {}},
        "korea": {"spot": {}},
        "meta": {
            "source": "github-actions",
            "errors": errors,
        },
    }

    for sym in top100:
        payload["global"]["spot"][sym] = {}

    for sym, px in binance.items():
        payload["global"]["spot"][sym]["binance"] = px
    for sym, px in bybit.items():
        payload["global"]["spot"][sym]["bybit"] = px
    for sym, px in bitget.items():
        payload["global"]["spot"][sym]["bitget"] = px

    if not any(payload["global"]["spot"][s] for s in payload["global"]["spot"]):
        raise RuntimeError("No exchange returned data")

    insert_supabase(SUPABASE_URL, SUPABASE_KEY, payload)
    print("SUCCESS:", ts)

if __name__ == "__main__":
    main()
