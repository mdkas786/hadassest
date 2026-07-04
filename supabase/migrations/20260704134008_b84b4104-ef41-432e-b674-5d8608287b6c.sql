
-- Align schema with cloned codebase (adds missing columns and tables)

-- notifications: add is_read + type expected by clone code
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info';
UPDATE public.notifications SET is_read = (read_at IS NOT NULL);
UPDATE public.notifications SET type = COALESCE(notif_type, 'info') WHERE type = 'info' AND notif_type IS NOT NULL;

-- investments: add special-offer + income columns
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS total_income_received numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_id uuid,
  ADD COLUMN IF NOT EXISTS slab_id uuid,
  ADD COLUMN IF NOT EXISTS monthly_roi numeric,
  ADD COLUMN IF NOT EXISTS duration_months integer,
  ADD COLUMN IF NOT EXISTS total_return numeric,
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

-- transactions: add offer_id, slab_id, type
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS offer_id uuid,
  ADD COLUMN IF NOT EXISTS slab_id uuid,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'investment';

-- sponsor_income: add legacy columns clone code reads
ALTER TABLE public.sponsor_income
  ADD COLUMN IF NOT EXISTS source_had_id text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS investment_id uuid,
  ADD COLUMN IF NOT EXISTS percentage numeric,
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS income_amount numeric,
  ADD COLUMN IF NOT EXISTS month text;

-- users: cloned code expects a public.users table (separate from auth.users / profiles).
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id text UNIQUE NOT NULL,
  name text NOT NULL,
  mobile text,
  city text,
  email text,
  upi_id text,
  trc20_wallet text,
  bep20_wallet text,
  referred_by text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_users" ON public.users;
CREATE POLICY "public_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- config
CREATE TABLE IF NOT EXISTS public.config (
  key text PRIMARY KEY,
  value text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config TO anon, authenticated;
GRANT ALL ON public.config TO service_role;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_config" ON public.config;
CREATE POLICY "public_all_config" ON public.config FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.config (key, value) VALUES
  ('starter_rate','5'),('growth_rate','6'),('fortune_rate','7'),
  ('starter_min','50000'),('starter_max','1000000'),
  ('growth_min','1000001'),('growth_max','3000000'),
  ('fortune_min','3000001'),('fortune_max','5000000'),
  ('referral_percent','5'),('level_percent','10'),
  ('payout_day','10'),('maintenance_mode','false'),
  ('maintenance_message',''),('announcement_banner',''),
  ('support_email','support@hadinvestment.com'),
  ('support_whatsapp','+91'),('min_investment','50000'),
  ('verification_mode','manual')
ON CONFLICT (key) DO NOTHING;

-- wallets (simple table clone expects)
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  address text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO anon, authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_wallets" ON public.wallets;
CREATE POLICY "public_all_wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_had_id text,
  performed_by text,
  data_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO anon, authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_audit" ON public.audit_logs;
CREATE POLICY "public_all_audit" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- special_offers
CREATE TABLE IF NOT EXISTS public.special_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  name text,
  description text,
  image text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  published boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_offers TO anon, authenticated;
GRANT ALL ON public.special_offers TO service_role;
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_special_offers" ON public.special_offers;
CREATE POLICY "public_all_special_offers" ON public.special_offers FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.special_offer_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.special_offers(id) ON DELETE CASCADE,
  slab_label text,
  investment_amount numeric NOT NULL,
  monthly_profit numeric NOT NULL,
  duration_months integer NOT NULL,
  total_return numeric NOT NULL,
  benefits text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_offer_slabs TO anon, authenticated;
GRANT ALL ON public.special_offer_slabs TO service_role;
ALTER TABLE public.special_offer_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_special_offer_slabs" ON public.special_offer_slabs;
CREATE POLICY "public_all_special_offer_slabs" ON public.special_offer_slabs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.user_special_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id text NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.special_offers(id) ON DELETE CASCADE,
  slab_id uuid NOT NULL REFERENCES public.special_offer_slabs(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  monthly_profit numeric NOT NULL DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 0,
  total_return numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  transaction_id uuid,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_special_investments TO anon, authenticated;
GRANT ALL ON public.user_special_investments TO service_role;
ALTER TABLE public.user_special_investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_user_special_investments" ON public.user_special_investments;
CREATE POLICY "public_all_user_special_investments" ON public.user_special_investments FOR ALL USING (true) WITH CHECK (true);

-- Team count RPC used by clone code
CREATE OR REPLACE FUNCTION public.get_team_count(root_had_id text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE team AS (
    SELECT had_id FROM public.profiles WHERE referred_by = root_had_id
    UNION ALL
    SELECT p.had_id FROM public.profiles p JOIN team t ON p.referred_by = t.had_id
  )
  SELECT count(*)::int FROM team;
$$;
GRANT EXECUTE ON FUNCTION public.get_team_count(text) TO anon, authenticated, service_role;

-- Overloaded admin_delete_user(text,text) — clone code passes had_id text.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_had_id text, admin_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  INSERT INTO public.audit_logs (action, target_had_id, performed_by, data_summary)
  VALUES ('user_deleted', target_had_id, admin_id, jsonb_build_object('had_id', target_had_id));

  SELECT id INTO v_user_id FROM public.profiles WHERE had_id = target_had_id;

  DELETE FROM public.sponsor_income WHERE earner_had_id = target_had_id OR source_had_id = target_had_id OR referred_had_id = target_had_id;
  DELETE FROM public.partner_income WHERE earner_had_id = target_had_id;
  DELETE FROM public.notifications WHERE had_id = target_had_id;
  DELETE FROM public.return_payments WHERE had_id = target_had_id;
  DELETE FROM public.transactions WHERE had_id = target_had_id;
  DELETE FROM public.investments WHERE had_id = target_had_id;
  DELETE FROM public.user_special_investments WHERE had_id = target_had_id;
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = target_had_id;
  UPDATE public.users SET referred_by = NULL WHERE referred_by = target_had_id;
  DELETE FROM public.users WHERE had_id = target_had_id;
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(text, text) TO anon, authenticated, service_role;
