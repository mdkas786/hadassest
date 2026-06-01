# H.A.D. Asset Management — Phase 3 Update Plan

This is a large 13-fix request. I'll break it into 4 implementation waves so each migration + code batch is verifiable. Nothing existing will be removed — only added/fixed.

## Wave 1 — Database foundation (one migration)

Add columns + tables needed by every later wave:

- `profiles`: `selected_plan`, `trc20_wallet`, `bep20_wallet`
- `transactions`: `utr_number`, `payment_method`, `plan_name`, `slab_amount` (keep existing `txn_ref`, `method`, `screenshot_url`)
- New table `app_wallets` (wallet_type, address, label, display_order, is_active) — RLS: public SELECT, admin write
- New table `daily_reports` — RLS: admin only
- New table `return_payments` (admin → user payouts) so we don't pollute `transactions` semantics
- Seed `app_wallets` with existing UPI `6307565252@axisbank / Faizan Khan`
- Seed `app_settings` keys: `last_report_sent`, `report_email=hadasset2021@gmail.com`
- Realtime publication for `app_wallets`, `investments`, `transactions`, `notifications`

I will NOT use the over-permissive `anon ALL` policies from the prompt — they would leak every user's investments to the public. Instead:
- `app_wallets`: anon SELECT active only; admin ALL
- `investments`: authenticated SELECT own / admin ALL (already correct)
- `daily_reports`: admin only

## Wave 2 — User-facing fixes (Fix 1, 4, 5, 6, 12)

- **Slab selection screen** (`src/routes/plan.tsx`): shown after registration success, before dashboard. 3 cards (Starter/Growth/Fortune), "Skip" link. Writes `profiles.selected_plan`.
- **Register flow**: redirect to `/plan` instead of `/dashboard` on first registration.
- **Pay page rebuild**: fetch all active `app_wallets`, render UPI cards (with GPay/PhonePe/Paytm intent buttons + QR) and crypto tabs (TRC20/BEP20). Plan auto-detect badge from amount. On submit, write full transaction row with `utr_number`, `payment_method`, `plan_name`, `slab_amount`, `screenshot_url`.
- **Profile page**: replace single wallet field with TRC20 + BEP20 inputs (validated: `T` len 34, `0x` len 42) + keep UPI.
- **Dashboard**: investment summary (Invested / Received / 2X Target / Remaining / progress bar), projected returns table (1/3/6/12mo), plan badge, Supabase Realtime subscription on `investments` + `transactions` for own had_id.

## Wave 3 — Admin fixes (Fix 3, 7, 8, 9, 10, 13)

- **Admin Wallets rebuild** (`admin.wallets.tsx`): 3 sections (UPI / TRC20 / BEP20), each up to 3 rows with address+label+active+delete, add/save buttons. CRUD against `app_wallets`.
- **Admin Payments**: query fix so verified pending rows actually appear (currently filtering may miss new `transactions` schema). On Approve: upsert into `investments` (aggregate per had_id), auto-detect plan from amount, send Hinglish notification.
- **Admin Investments rebuild**: top summary row, full table grouped by had_id, click-row → modal with: summary, algorithm projection table, eligibility ("Amount eligible today"), user's wallets (with copy buttons + UPI QR), "Mark Return Paid" form (writes `return_payments`, updates `investments.amount_received`, sends notification), transaction history.
- **Admin Users**: add Delete button + confirmation modal; cascade delete transactions/investments/notifications/profile + auth user.
- **Admin Trading**: rename search label, add "Publish to Users" toggle (uses existing `status` field), "Notify Users" button broadcasts notification.
- **Admin Dashboard**: keep existing cards; add pending-alert banner, 3 new quick actions, recent activity feed (last 10 events from transactions/profiles/return_payments, Realtime).

## Wave 4 — Daily report (Fix 11)

- Server function `sendDailyReport` (createServerFn, admin-only) that builds the report (user stats, financial summary, per-user breakdown, projections) and emails it via Lovable's Resend integration to `hadasset2021@gmail.com`. Updates `app_settings.last_report_sent` + inserts `daily_reports` row.
- "Send Report Now" button on admin dashboard.
- pg_cron job hitting a public route `/api/public/hooks/daily-report` once per 24h (with apikey header check + dedupe via `last_report_sent`).
- Email infra: requires Lovable Email domain setup — I'll detect status and surface the setup dialog if not configured.

## Technical notes

- All new tables get explicit `GRANT` + RLS per the security rules.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE …` for `app_wallets`, `investments`, `transactions`, `notifications`.
- Plan detection helper centralised in `src/lib/plans.ts` (Starter <5L @5%, Growth 5–10L @6%, Fortune ≥10L @7%) — used by Pay page, admin approval, projections.
- No breaking changes to existing routes; admin login, AI suite, markets, referral untouched.

## Order of operations

1. Wave 1 migration (must be approved before code changes — types regenerate after).
2. Wave 2 code batch.
3. Wave 3 code batch.
4. Wave 4 (email infra check → server fn → cron).

Shall I start with the Wave 1 migration?
