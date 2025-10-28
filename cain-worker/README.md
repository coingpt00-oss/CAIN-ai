# CAIN Worker (Cloudflare)
Backend logic for CAIN — handles authentication, verification, and automated alerts.

- Token & session management (2-device limit, auto-logout on 3rd)
- Referral verification & admin approval hooks
- Scheduled jobs: Airdrop (07:00 KST), Market (hourly), Events (instant)
- Push delivery via Firebase Cloud Messaging (or OneSignal)
- Supabase integration (PostgreSQL, RLS)
