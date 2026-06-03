-- Sponsor income: 5% of referred user's verified investment
CREATE TABLE IF NOT EXISTS public.sponsor_income (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  earner_user_id uuid NOT NULL,
  earner_had_id text NOT NULL,
  referred_user_id uuid NOT NULL,
  referred_had_id text NOT NULL,
  transaction_id uuid,
  investment_amount numeric NOT NULL DEFAULT 0,
  sponsor_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_income_earner ON public.sponsor_income(earner_had_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_income_status ON public.sponsor_income(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_income TO authenticated;
GRANT ALL ON public.sponsor_income TO service_role;

ALTER TABLE public.sponsor_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sponsor income"
  ON public.sponsor_income FOR SELECT TO authenticated
  USING (auth.uid() = earner_user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage sponsor income"
  ON public.sponsor_income FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Partner income: 10% of combined ROI of 2 directs (monthly)
CREATE TABLE IF NOT EXISTS public.partner_income (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  earner_user_id uuid NOT NULL,
  earner_had_id text NOT NULL,
  period_month text NOT NULL,
  direct1_had_id text,
  direct2_had_id text,
  direct1_roi numeric NOT NULL DEFAULT 0,
  direct2_roi numeric NOT NULL DEFAULT 0,
  total_bonus numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(earner_had_id, period_month)
);
CREATE INDEX IF NOT EXISTS idx_partner_income_earner ON public.partner_income(earner_had_id);
CREATE INDEX IF NOT EXISTS idx_partner_income_status ON public.partner_income(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_income TO authenticated;
GRANT ALL ON public.partner_income TO service_role;

ALTER TABLE public.partner_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own partner income"
  ON public.partner_income FOR SELECT TO authenticated
  USING (auth.uid() = earner_user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage partner income"
  ON public.partner_income FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Running totals on investments to surface inside 2X package
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS sponsor_income_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_income_total numeric NOT NULL DEFAULT 0;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_income;