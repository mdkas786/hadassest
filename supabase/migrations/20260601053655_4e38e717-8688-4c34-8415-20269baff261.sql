
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_plan TEXT,
  ADD COLUMN IF NOT EXISTS trc20_wallet TEXT,
  ADD COLUMN IF NOT EXISTS bep20_wallet TEXT;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS utr_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS slab_amount NUMERIC;

CREATE TABLE IF NOT EXISTS public.app_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('upi','usdt_trc20','usdt_bep20')),
  wallet_address TEXT NOT NULL,
  wallet_label TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_wallets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_wallets TO authenticated;
GRANT ALL ON public.app_wallets TO service_role;

ALTER TABLE public.app_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active wallets" ON public.app_wallets;
CREATE POLICY "Anyone reads active wallets"
  ON public.app_wallets FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage wallets" ON public.app_wallets;
CREATE POLICY "Admins manage wallets"
  ON public.app_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS app_wallets_touch ON public.app_wallets;
CREATE TRIGGER app_wallets_touch
  BEFORE UPDATE ON public.app_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.return_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  txn_ref TEXT,
  notes TEXT,
  paid_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_payments TO authenticated;
GRANT ALL ON public.return_payments TO service_role;

ALTER TABLE public.return_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own returns" ON public.return_payments;
CREATE POLICY "Users see own returns"
  ON public.return_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage returns" ON public.return_payments;
CREATE POLICY "Admins manage returns"
  ON public.return_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_users INTEGER DEFAULT 0,
  total_invested NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  report_data JSONB,
  email_sent BOOLEAN DEFAULT FALSE,
  email_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage daily reports" ON public.daily_reports;
CREATE POLICY "Admins manage daily reports"
  ON public.daily_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.app_wallets (wallet_type, wallet_address, wallet_label, display_order, is_active)
SELECT 'upi', '6307565252@axisbank', 'Faizan Khan', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.app_wallets WHERE wallet_type = 'upi' AND wallet_address = '6307565252@axisbank');

INSERT INTO public.app_settings (key, value) VALUES
  ('report_email', 'hadasset2021@gmail.com'),
  ('last_report_sent', '2020-01-01T00:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Realtime: add only tables not already in publication
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_wallets','investments','transactions','notifications','return_payments']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
