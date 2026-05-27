# H.A.D. Asset Management — Build Plan

This is a large platform (user webapp + admin panel + shared backend that your Android app will also use). I'll build it in phases so we can verify each layer works before piling on the next.

## Backend (new, replaces old Supabase)
- Enable **Lovable Cloud** — provisions a fresh Supabase project (URL + anon key you can reuse in your Flutter Android app).
- Schema: `users`, `user_roles` (admin role separated), `investments`, `transactions`, `notifications`, `trading_assets`, `app_settings`, `config`, `company_wallets`.
- Storage bucket: `payment-screenshots`.
- RLS on every table; admin checks via `has_role()` security-definer function (NOT localStorage flags — that is unsafe).
- Realtime enabled on `investments`, `notifications`, `trading_assets`, `app_settings`.

## Security correction
Your prompt stores admin auth in `localStorage` with a SHA256 in a public table. That is trivially bypassable. I'll instead use **Supabase Auth** for admin login + a `user_roles` table with an `admin` role. Same UX (username/password, lockout after 3 fails), but actually secure. The `hadmaster2026` account will be seeded.

## Phase 1 — Foundation (this turn)
1. Splash screen with animated H.A.D. logo (shield + arrow reveal, gold shimmer, fade to app).
2. Brand tokens: Navy `#0A1628`, Gold `#C9A84C`, serif/clean type pair.
3. Landing page (`/`) with hero, 3 plan cards (Starter 5% / Growth 6% / Fortune 7%), how-it-works, CTA.
4. Auth pages: `/register` (3-step), `/login`, `/admin/login`.
5. Lovable Cloud enabled + full schema + seed data + RLS.

## Phase 2 — User app
Dashboard, Markets (CoinCap integration), Coin detail w/ live WS price, Pay page (UPI deeplinks + crypto QR + screenshot upload), Referral, Profile, Notifications, Realtime subs, Maintenance overlay.

## Phase 3 — Admin panel (`/admin/*`)
Dashboard stats, Users, Investments, Payment Verification (approve/reject + auto plan tiering), Trading Control (CoinCap search → add to portfolio), Return Payments, Notifications broadcaster, App Settings, Wallet Manager (QR), Reports (CSV/PDF), Market Monitor.

## Phase 4 — Integrations
- **CoinCap** service (`src/services/coinCapService.ts`) with all 10 functions + localStorage TTL cache + WebSocket live prices.
- **Gemini** AI analysis via edge function (key stored as secret, never in client).
- Recharts everywhere, jsPDF + PapaParse for exports, qrcode.react for QR.

## Secrets I'll need from you
- `GEMINI_API_KEY` — I'll prompt for it when we reach the AI analysis step.
- CoinCap key you pasted is fine to embed (public-tier key), but I'll still store it as a Vite env for hygiene.

## What you'll get for the Android app
After Phase 1, I'll give you:
- New Supabase URL
- New Supabase anon key
- Full SQL of the schema so your Flutter app reads/writes the exact same tables.

## Confirm before I start
1. **OK to use Lovable Cloud** (new Supabase, replaces `jgwehkuwwdgidimfpbzt`)?
2. **OK to use secure Supabase Auth for admin** instead of the localStorage SHA256 scheme? (Same login UX, real security.)
3. **Admin seed password** — I'll generate a strong one and show it once, or you give me one now?

Reply "go" with answers to those 3 and I'll start Phase 1.