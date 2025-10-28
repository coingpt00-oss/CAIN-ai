# 👑 CAIN — Coin Artificial Intelligence Network

### _“The first to defy God — now defying the market.”_

CAIN is a next-generation crypto intelligence platform that integrates **verified airdrops, real-time market news, instant exchange events, AI-powered analysis,** and **embedded TradingView charts** — accessible only to authenticated users registered via referral verification.

---

## ⚙️ Overview

| Feature | Description |
|----------|-------------|
| 🧠 **AI Chat (CoinGPT)** | Ask anything about crypto, airdrops, or trading strategies. Exclusive to verified users. |
| 💸 **Airdrops Dashboard** | Daily verified airdrop alerts with reward value and KYC info. |
| 📊 **Market News Feed** | 1-hour interval market updates from BlockMedia, Coinness, and CoinDesk. |
| 🎟️ **Exchange Events** | Instant reward CEX events (Upbit, Bithumb, Binance, Bitget, Bybit, OKX). |
| 📈 **TradingView Integration** | Built-in chart viewer with basic free functions. |
| 🔐 **Referral-Based Authentication** | Users must join via official referral link + admin verification. |
| 💻 **Device Protection** | Max 2 devices per token, auto logout on 3rd login. |

---

## 🧩 Architecture


- **Frontend:** Lovable (Next.js) + Vercel  
- **Backend:** Cloudflare Workers + Supabase  
- **Database:** Supabase (PostgreSQL)  
- **AI Layer:** OpenAI / Custom GPT endpoint  
- **Auth Flow:** UID + Password + Token (JWT)  
- **Scheduler:** Airdrop (07:00), Market (Hourly), Events (Instant)  

---

## 🎨 Brand Identity

| Element | Description |
|----------|-------------|
| **Logo** | Blue Crown — symbol of power, leadership, and AI sovereignty. |
| **Primary Color** | Neon Blue `#00E5FF` |
| **Secondary Color** | Electric Violet `#5B00FF` |
| **Background** | Jet Black `#000000` |
| **Font** | Montserrat (Title), Inter / Noto Sans KR (Body) |
| **Slogan** | _“인류 최초로 신에게 맞선 자, 이제 시장의 질서에 도전한다.”_ |

---

## 🧱 Tech Stack

- **Frontend:** Next.js (Lovable / Vercel)
- **Backend:** Cloudflare Workers
- **Database:** Supabase (RLS-enabled)
- **Auth:** Supabase Auth + Custom JWT Device Control
- **AI:** OpenAI GPT Models (for CoinGPT chat)
- **UI:** Tailwind + Framer Motion
- **Analytics:** Telegram Logs + Supabase dispatch_log

---

## 🔑 Environment Variables (core)

| Key | Purpose |
|-----|----------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side auth (never expose) |
| `SUPABASE_ANON_KEY` | Public client key |
| `OPENAI_API_KEY` | AI chat |
| `CF_API_TOKEN` | Cloudflare Worker deployment |
| `VERCEL_TOKEN` | App deployment automation |

---

## 🚀 Development Roadmap

| Phase | Milestone | ETA |
|-------|------------|-----|
| **v1.0** | CAIN App (User + Auth + News + Airdrop) | ✅ In progress |
| **v1.1** | Admin App + Verification Flow | 🔜 Next |
| **v2.0** | GPT Integration + Multi-Language | 🔜 Planned |
| **v3.0** | CAIN+ Premium Tier / Ads System | 🔜 Future |

---

## 🧭 Mission Statement
> _CAIN aims to end the era of misinformation and closed trading rooms by building the world’s first AI-powered, verified crypto network._  
> “Fair data, fair access, fair profit.”

---

## 🪪 License
Released under the **MIT License**.  
(c) 2025 CAIN. All rights reserved.

---

### 🌐 Links
- Website: [https://cain.network](https://cain.network) _(TBD)_
- YouTube: **CAIN Official**
- Telegram: **@coin_gpt**
- Contact: **cain.app@gmail.com**
