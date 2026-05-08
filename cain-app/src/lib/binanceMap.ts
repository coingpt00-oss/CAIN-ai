// src/lib/binanceMap.ts
export const BINANCE_MAP: Record<string, string> = {
  // ===== TODO: manual Binance mapping candidates (from missing-binance.json) =====
  // ↓ 여기 있는 것들은 현재 Binance에 직통 심볼을 못 찾은 애들 (HTTP 400)
  //    나중에 보스가 진짜 심볼을 찾으면:
  //    1) 주석(//) 지우고
  //    2) 오른쪽 "" 자리에 실제 심볼 넣으면 됨 (예: "xxxx": "BTCUSDT")
  //    3) 트레이딩뷰 대신 바이낸스 차트로 전환됨

  // "staked-ether": "", // cg_symbol: steth, tried: STETHUSDT (HTTP 400)
  // "figure-heloc": "", // cg_symbol: figr_heloc, tried: FIGR_HELOCUSDT (HTTP 400)
  // "whitebit": "", // cg_symbol: wbt, tried: WBTUSDT (HTTP 400)
  // "wrapped-steth": "", // cg_symbol: wsteth, tried: WSTETHUSDT (HTTP 400)
  // "binance-bridged-usdt-bnb-smart-chain": "", // cg_symbol: bsc-usd, tried: BSC-USDUSDT (HTTP 400)
  // "leo-token": "", // cg_symbol: leo, tried: LEOUSDT (HTTP 400)
  // "hyperliquid": "", // cg_symbol: hype, tried: HYPEUSDT (HTTP 400)
  // "weth": "", // cg_symbol: weth, tried: WETHUSDT (HTTP 400)
  // "wrapped-eeth": "", // cg_symbol: weeth, tried: WEETHUSDT (HTTP 400)
  // "coinbase-wrapped-btc": "", // cg_symbol: cbbtc, tried: CBBTCUSDT (HTTP 400)
  // "ethena-staked-usde": "", // cg_symbol: susde, tried: SUSDEUSDT (HTTP 400)
  // "crypto-com-chain": "", // cg_symbol: cro, tried: CROUSDT (HTTP 400)
  // "usdt0": "", // cg_symbol: usdt0, tried: USDT0USDT (HTTP 400)
  // "susds": "", // cg_symbol: susds, tried: SUSDSUSDT (HTTP 400)
  // "paypal-usd": "", // cg_symbol: pyusd, tried: PYUSDUSDT (HTTP 400)
  // "memecore": "", // cg_symbol: m, tried: MUSDT (HTTP 400)
  // "mantle": "", // cg_symbol: mnt, tried: MNTUSDT (HTTP 400)
  // "canton-network": "", // cg_symbol: cc, tried: CCUSDT (HTTP 400)
  // "bitget-token": "", // cg_symbol: bgb, tried: BGBUSDT (HTTP 400)
  // "blackrock-usd-institutional-digital-liquidity-fund": "", // cg_symbol: buidl, tried: BUIDLUSDT (HTTP 400)
  // "okb": "", // cg_symbol: okb, tried: OKBUSDT (HTTP 400)
  // "falcon-finance": "", // cg_symbol: usdf, tried: USDFUSDT (HTTP 400)
  // "tether-gold": "", // cg_symbol: xaut, tried: XAUTUSDT (HTTP 400)
  // "pi-network": "", // cg_symbol: pi, tried: PIUSDT (HTTP 400)
  // "jito-staked-sol": "", // cg_symbol: jitosol, tried: JITOSOLUSDT (HTTP 400)
  // "jupiter-perpetuals-liquidity-provider-token": "", // cg_symbol: jlp, tried: JLPUSDT (HTTP 400)
  // "rain": "", // cg_symbol: rain, tried: RAINUSDT (HTTP 400)
  // "binance-peg-weth": "", // cg_symbol: weth, tried: WETHUSDT (HTTP 400)
  // "htx-dao": "", // cg_symbol: htx, tried: HTXUSDT (HTTP 400)
  // "kucoin-shares": "", // cg_symbol: kcs, tried: KCSUSDT (HTTP 400)
  // "usdtb": "", // cg_symbol: usdtb, tried: USDTBUSDT (HTTP 400)
  // "syrupusdc": "", // cg_symbol: syrupusdc, tried: SYRUPUSDCUSDT (HTTP 400)
  // "hash-2": "", // cg_symbol: hash, tried: HASHUSDT (HTTP 400)
  // "rocket-pool-eth": "", // cg_symbol: reth, tried: RETHUSDT (HTTP 400)
  // "hashnote-usyc": "", // cg_symbol: usyc, tried: USYCUSDT (HTTP 400)
  // "global-dollar": "", // cg_symbol: usdg, tried: USDGUSDT (HTTP 400)
  // "gatechain-token": "", // cg_symbol: gt, tried: GTUSDT (HTTP 400)
  // "ripple-usd": "", // cg_symbol: rlusd, tried: RLUSDUSDT (HTTP 400)
  // "wbnb": "", // cg_symbol: wbnb, tried: WBNBUSDT (HTTP 400)
  // "kaspa": "", // cg_symbol: kas, tried: KASUSDT (HTTP 400)
  // "flare-networks": "", // cg_symbol: flr, tried: FLRUSDT (HTTP 400)
  // "ignition-fbtc": "", // cg_symbol: fbtc, tried: FBTCUSDT (HTTP 400)
  // "kelp-dao-restaked-eth": "", // cg_symbol: rseth, tried: RSETHUSDT (HTTP 400)
  // "lombard-staked-btc": "", // cg_symbol: lbtc, tried: LBTCUSDT (HTTP 400)
  // "xdce-crowd-sale": "", // cg_symbol: xdc, tried: XDCUSDT (HTTP 400)
  // "kinetic-staked-hype": "", // cg_symbol: khype, tried: KHYPEUSDT (HTTP 400)
  // "liquid-staked-ethereum": "", // cg_symbol: lseth, tried: LSETHUSDT (HTTP 400)
  // "superstate-short-duration-us-government-securities-fund-ustb": "", // cg_symbol: ustb, tried: USTBUSDT (HTTP 400)
  // "solv-btc": "", // cg_symbol: solvbtc, tried: SOLVBTCUSDT (HTTP 400)
  // "ousg": "", // cg_symbol: ousg, tried: OUSGUSDT (HTTP 400)
  // "syrupusdt": "", // cg_symbol: syrupusdt, tried: SYRUPUSDTUSDT (HTTP 400)
  // "story-2": "", // cg_symbol: ip, tried: IPUSDT (HTTP 400)
  // "janus-henderson-anemoy-aaa-clo-fund": "", // cg_symbol: jaaa, tried: JAAAUSDT (HTTP 400)
  // "fasttoken": "", // cg_symbol: ftn, tried: FTNUSDT (HTTP 400)
  // "renzo-restaked-eth": "", // cg_symbol: ezeth, tried: EZETHUSDT (HTTP 400)
  // "mantle-staked-ether": "", // cg_symbol: meth, tried: METHUSDT (HTTP 400)
  // "ondo-us-dollar-yield": "", // cg_symbol: usdy, tried: USDYUSDT (HTTP 400)
  // "clbtc": "", // cg_symbol: clbtc, tried: CLBTCUSDT (HTTP 400)
  // "bridged-usdc-polygon-pos-bridge": "", // cg_symbol: usdc.e, tried: USDC.EUSDT (HTTP 400)
  // "jupiter-staked-sol": "", // cg_symbol: jupsol, tried: JUPSOLUSDT (HTTP 400)
  // "usdai": "", // cg_symbol: usdai, tried: USDAIUSDT (HTTP 400)
  // "beldex": "", // cg_symbol: bdx, tried: BDXUSDT (HTTP 400)
  // "aerodrome-finance": "", // cg_symbol: aero, tried: AEROUSDT (HTTP 400)
  // "stakewise-v3-oseth": "", // cg_symbol: oseth, tried: OSETHUSDT (HTTP 400)
  // "l2-standard-bridged-weth-base": "", // cg_symbol: weth, tried: WETHUSDT (HTTP 400)
  // "newton-project": "", // cg_symbol: ab, tried: ABUSDT (HTTP 400)
  // "usual-usd": "", // cg_symbol: usd0, tried: USD0USDT (HTTP 400)
  // "tbtc": "", // cg_symbol: tbtc, tried: TBTCUSDT (HTTP 400)
  // "myx-finance": "", // cg_symbol: myx, tried: MYXUSDT (HTTP 400)
  // "msol": "", // cg_symbol: msol, tried: MSOLUSDT (HTTP 400)
  // "telcoin": "", // cg_symbol: tel, tried: TELUSDT (HTTP 400)
  // "cgeth-hashkey-cloud": "", // cg_symbol: cgeth.hashkey, tried: CGETH.HASHKEYUSDT (HTTP 400)
  // "mantle-bridged-usdt-mantle": "", // cg_symbol: usdt, tried: USDTUSDT (HTTP 400)
  // "arbitrum-bridged-weth-arbitrum-one": "", // cg_symbol: weth, tried: WETHUSDT (HTTP 400)
  // "spx6900": "", // cg_symbol: spx, tried: SPXUSDT (HTTP 400)
  // "usdd": "", // cg_symbol: usdd, tried: USDDUSDT (HTTP 400)
  // "steakhouse-usdc-morpho-vault": "", // cg_symbol: steakusdc, tried: STEAKUSDCUSDT (HTTP 400)
  // "eutbl": "", // cg_symbol: eutbl, tried: EUTBLUSDT (HTTP 400)
  // "sbtc-2": "", // cg_symbol: sbtc, tried: SBTCUSDT (HTTP 400)
  // "stader-ethx": "", // cg_symbol: ethx, tried: ETHXUSDT (HTTP 400)
  // "gteth": "", // cg_symbol: gteth, tried: GTETHUSDT (HTTP 400)
  // "gho": "", // cg_symbol: gho, tried: GHOUSDT (HTTP 400)
  // "usdb": "", // cg_symbol: usdb, tried: USDBUSDT (HTTP 400)
  // "ether-fi-liquid-eth": "", // cg_symbol: liquideth, tried: LIQUIDETHUSDT (HTTP 400)
  // "bitcoin-cash-sv": "", // cg_symbol: bsv, tried: BSVUSDT (HTTP 400)
  // "ether-fi-staked-eth": "", // cg_symbol: eeth, tried: EETHUSDT (HTTP 400)
  // "apenft": "", // cg_symbol: nft, tried: NFTUSDT (HTTP 400)
  // "merlin-chain": "", // cg_symbol: merl, tried: MERLUSDT (HTTP 400)
  // "sweth": "", // cg_symbol: sweth, tried: SWETHUSDT (HTTP 400)
  // "wrapped-hype": "", // cg_symbol: whype, tried: WHYPEUSDT (HTTP 400)
  // "coinbase-wrapped-staked-eth": "", // cg_symbol: cbeth, tried: CBETHUSDT (HTTP 400)
  // "bitcoin-avalanche-bridged-btc-b": "", // cg_symbol: btc.b, tried: BTC.BUSDT (HTTP 400)
  // "olympus": "", // cg_symbol: ohm, tried: OHMUSDT (HTTP 400)
  // "benqi-liquid-staked-avax": "", // cg_symbol: savax, tried: SAVAXUSDT (HTTP 400)
  // "mimblewimblecoin": "", // cg_symbol: mwc, tried: MWCUSDT (HTTP 400)
  // "usx": "", // cg_symbol: usx, tried: USXUSDT (HTTP 400)
  // "euro-coin": "", // cg_symbol: eurc, tried: EURCUSDT (HTTP 400)
  // "ape-and-pepe": "", // cg_symbol: apepe, tried: APEPEUSDT (HTTP 400)
  // "kinesis-gold": "", // cg_symbol: kau, tried: KAUUSDT (HTTP 400)
  // "arbitrum-bridged-wrapped-eeth": "", // cg_symbol: weeth, tried: WEETHUSDT (HTTP 400)
  // "ultima": "", // cg_symbol: ultima, tried: ULTIMAUSDT (HTTP 400)
  // "lorenzo-wrapped-bitcoin": "", // cg_symbol: enzobtc, tried: ENZOBTCUSDT (HTTP 400)
  // "polygon-pos-bridged-weth-polygon-pos": "", // cg_symbol: weth, tried: WETHUSDT (HTTP 400)
  // "zebec-network": "", // cg_symbol: zbcn, tried: ZBCNUSDT (HTTP 400)
  // "janus-henderson-anemoy-treasury-fund": "", // cg_symbol: jtrsy, tried: JTRSYUSDT (HTTP 400)
  // "frax": "", // cg_symbol: frax, tried: FRAXUSDT (HTTP 400)
  // "unit-bitcoin": "", // cg_symbol: ubtc, tried: UBTCUSDT (HTTP 400)
  // "frax-ether": "", // cg_symbol: frxeth, tried: FRXETHUSDT (HTTP 400)
  // "mantle-restaked-eth": "", // cg_symbol: cmeth, tried: CMETHUSDT (HTTP 400)
  // "swissborg": "", // cg_symbol: borg, tried: BORGUSDT (HTTP 400)
  // "astherus-staked-bnb": "", // cg_symbol: asbnb, tried: ASBNBUSDT (HTTP 400)
  // "vision-3": "", // cg_symbol: vsn, tried: VSNUSDT (HTTP 400)
  // "fartcoin": "", // cg_symbol: fartcoin, tried: FARTCOINUSDT (HTTP 400)
  // "crvusd": "", // cg_symbol: crvusd, tried: CRVUSDUSDT (HTTP 400)
  // "undeads-games": "", // cg_symbol: uds, tried: UDSUSDT (HTTP 400)
  // "savings-dai": "", // cg_symbol: sdai, tried: SDAIUSDT (HTTP 400)
  // "cap-usd": "", // cg_symbol: cusd, tried: CUSDUSDT (HTTP 400)
  // "instadapp": "", // cg_symbol: fluid, tried: FLUIDUSDT (HTTP 400)
  // "origintrail": "", // cg_symbol: trac, tried: TRACUSDT (HTTP 400)
  // "ibc-bridged-usdc": "", // cg_symbol: usdc.n, tried: USDC.NUSDT (HTTP 400)
  // "ethena-staked-ena": "", // cg_symbol: sena, tried: SENAUSDT (HTTP 400)
  // "fidelity-digital-interest-token": "", // cg_symbol: fdit, tried: FDITUSDT (HTTP 400)
  // "aethir": "", // cg_symbol: ath, tried: ATHUSDT (HTTP 400)
  // "wrapped-ether-mantle-bridge": "", // cg_symbol: weth, tried: WETHUSDT (HTTP 400)
  // "zora": "", // cg_symbol: zora, tried: ZORAUSDT (HTTP 400)

  // ===== Active Binance mappings =====
  "bitcoin": "BTCUSDT",
  "ethereum": "ETHUSDT",

  // ✅ Tether (USDT / USD) — 바이낸스 현물 심볼
  "tether": "USDTUSD",

  "ripple": "XRPUSDT",
  "binancecoin": "BNBUSDT",
  "usd-coin": "USDCUSDT",
  "solana": "SOLUSDT",
  "tron": "TRXUSDT",
  "dogecoin": "DOGEUSDT",
  "cardano": "ADAUSDT",
  "bitcoin-cash": "BCHUSDT",
  "wrapped-bitcoin": "WBTCUSDT",
  "wrapped-beacon-eth": "WBETHUSDT",
  "zcash": "ZECUSDT",
  "chainlink": "LINKUSDT",
  "stellar": "XLMUSDT",
  "ethena-usde": "USDEUSDT",
  "litecoin": "LTCUSDT",
  "hedera-hashgraph": "HBARUSDT",
  "avalanche-2": "AVAXUSDT",
  "sui": "SUIUSDT",
  "shiba-inu": "SHIBUSDT",
  "world-liberty-financial": "WLFIUSDT",
  "uniswap": "UNIUSDT",
  "polkadot": "DOTUSDT",
  "the-open-network": "TONUSDT",
  "bittensor": "TAOUSDT",
  "usd1-wlfi": "USD1USDT",
  "aave": "AAVEUSDT",
  "near": "NEARUSDT",
  "aster-2": "ASTERUSDT",
  "internet-computer": "ICPUSDT",
  "ethereum-classic": "ETCUSDT",
  "ethena": "ENAUSDT",
  "pepe": "PEPEUSDT",
  "aptos": "APTUSDT",
  "wrapped-solana": "SOLUSDT",
  "pump-fun": "PUMPUSDT",
  "ondo-finance": "ONDOUSDT",
  "worldcoin-wld": "WLDUSDT",
  "polygon-ecosystem-token": "POLUSDT",
  "pax-gold": "PAXGUSDT",
  "bfusd": "BFUSDUSDT",
  "binance-bridged-usdc-bnb-smart-chain": "USDCUSDT",
  "algorand": "ALGOUSDT",
  "official-trump": "TRUMPUSDT",
  "cosmos": "ATOMUSDT",
  "filecoin": "FILUSDT",
  "arbitrum": "ARBUSDT",
  "quant-network": "QNTUSDT",
  "binance-staked-sol": "BNSOLUSDT",
  "vechain": "VETUSDT",
  "sky": "SKYUSDT",
  "nexo": "NEXOUSDT",
  "first-digital-usd": "FDUSDUSDT",
  "render-token": "RENDERUSDT",
  "sei-network": "SEIUSDT",
  "morpho": "MORPHOUSDT",
  "pancakeswap-token": "CAKEUSDT",
  "jupiter-exchange-solana": "JUPUSDT",
  "bonk": "BONKUSDT",
  "fetch-ai": "FETUSDT",
  "dash": "DASHUSDT",
  "arbitrum-bridged-wbtc-arbitrum-one": "WBTCUSDT",
  "pudgy-penguins": "PENGUUSDT",
  "starknet": "STRKUSDT",
  "optimism": "OPUSDT",
  "virtual-protocol": "VIRTUALUSDT",
  "lido-dao": "LDOUSDT",
  "blockstack": "STXUSDT",
  "curve-dao-token": "CRVUSDT",
  "injective-protocol": "INJUSDT",
  "the-graph": "GRTUSDT",
  "celestia": "TIAUSDT",
  "tezos": "XTZUSDT",
  "true-usd": "TUSDUSDT",
  "iota": "IOTAUSDT",
  "kaia": "KAIAUSDT",
  "floki": "FLOKIUSDT",
  "trust-wallet-token": "TWTUSDT",
  "ether-fi": "ETHFIUSDT",
  "pyth-network": "PYTHUSDT",
  "ethereum-name-service": "ENSUSDT",
  "conflux-token": "CFXUSDT",
  "doublezero": "2ZUSDT",
  "sun-token": "SUNUSDT",
  "decred": "DCRUSDT",
  "the-sandbox": "SANDUSDT",
  "sonic-3": "SUSDT",
  "pendle": "PENDLEUSDT",
  "binance-peg-dogecoin": "DOGEUSDT",
  "flow": "FLOWUSDT",
  "just": "JSTUSDT",
  "jasmycoin": "JASMYUSDT",
  "theta-token": "THETAUSDT",
  "gala": "GALAUSDT",
  "dogwifcoin": "WIFUSDT",
  "plasma": "XPLUSDT",
  "gnosis": "GNOUSDT",
  "syrup": "SYRUPUSDT",
  "vaulta": "AUSDT",
  "decentraland": "MANAUSDT",
  "basic-attention-token": "BATUSDT",
  "neo": "NEOUSDT",
  "falcon-finance-ff": "FFUSDT",
  "chiliz": "CHZUSDT",
  "raydium": "RAYUSDT",
  "compound-governance-token": "COMPUSDT",
  "zksync": "ZKUSDT",
  "1inch": "1INCHUSDT",
  "zero-gravity": "0GUSDT",
  "arweave": "ARUSDT",
  "apecoin": "APEUSDT",
  "layerzero": "ZROUSDT",
  "immutable-x": "IMXUSDT",
  "eigenlayer": "EIGENUSDT",
  "ecash": "XECUSDT",
  "cheems-token": "1000CHEEMSUSDT"
};
