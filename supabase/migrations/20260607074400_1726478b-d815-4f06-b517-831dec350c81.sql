
-- Core tables for H.A.D. Asset Management
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  city TEXT,
  email TEXT,
  upi_id TEXT,
  trc20_wallet TEXT,
  bep20_wallet TEXT,
  referred_by TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id TEXT NOT NULL,
  plan_name TEXT NOT NULL DEFAULT 'STARTER',
  plan_rate NUMERIC NOT NULL DEFAULT 5,
  amount_invested NUMERIC NOT NULL DEFAULT 0,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  total_income_received NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investments_had_id ON public.investments(had_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'investment',
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  utr_number TEXT,
  screenshot_url TEXT,
  plan_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_had_id ON public.transactions(had_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

CREATE TABLE IF NOT EXISTS public.sponsor_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earner_had_id TEXT NOT NULL,
  source_had_id TEXT,
  investment_id UUID,
  type TEXT NOT NULL,
  percentage NUMERIC NOT NULL,
  base_amount NUMERIC NOT NULL,
  income_amount NUMERIC NOT NULL,
  month TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_income_earner ON public.sponsor_income(earner_had_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_had_id ON public.notifications(had_id);

CREATE TABLE IF NOT EXISTS public.trading_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'crypto',
  coincap_id TEXT,
  entry_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL DEFAULT 0,
  allocation_percent NUMERIC NOT NULL DEFAULT 0,
  target_percent NUMERIC NOT NULL DEFAULT 10,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_had_id TEXT,
  performed_by TEXT,
  data_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants (anon access for HAD ID localStorage auth model per spec)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_income TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_assets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO anon, authenticated;
GRANT ALL ON public.users, public.investments, public.transactions, public.sponsor_income, public.notifications, public.trading_assets, public.config, public.wallets, public.audit_logs TO service_role;

-- Enable RLS with permissive policies (HAD ID auth model from spec)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_investments" ON public.investments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.sponsor_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_sponsor" ON public.sponsor_income FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.trading_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_trading" ON public.trading_assets FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_config" ON public.config FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_audit" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

-- Secure delete user RPC
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_had_id TEXT, admin_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'had_id', target_had_id,
    'total_invested', (SELECT COALESCE(SUM(amount_invested),0) FROM public.investments WHERE had_id = target_had_id)
  ) INTO user_summary;
  INSERT INTO public.audit_logs (action, target_had_id, performed_by, data_summary)
  VALUES ('user_deleted', target_had_id, admin_id, user_summary);
  DELETE FROM public.sponsor_income WHERE earner_had_id = target_had_id OR source_had_id = target_had_id;
  DELETE FROM public.notifications WHERE had_id = target_had_id;
  DELETE FROM public.transactions WHERE had_id = target_had_id;
  DELETE FROM public.investments WHERE had_id = target_had_id;
  UPDATE public.users SET referred_by = NULL WHERE referred_by = target_had_id;
  DELETE FROM public.users WHERE had_id = target_had_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT, TEXT) TO anon, authenticated, service_role;

-- Seed config
INSERT INTO public.config (key, value) VALUES
  ('starter_rate', '5'), ('growth_rate', '6'), ('fortune_rate', '7'),
  ('starter_min', '50000'), ('starter_max', '1000000'),
  ('growth_min', '1100000'), ('growth_max', '3000000'),
  ('fortune_min', '3100000'), ('fortune_max', '5000000'),
  ('referral_percent', '5'), ('level_percent', '10'),
  ('payout_day', '10'), ('maintenance_mode', 'false'),
  ('maintenance_message', ''), ('announcement_banner', ''),
  ('support_email', 'support@hadinvestment.com'),
  ('support_whatsapp', '+91'), ('min_investment', '50000')
ON CONFLICT (key) DO NOTHING;
