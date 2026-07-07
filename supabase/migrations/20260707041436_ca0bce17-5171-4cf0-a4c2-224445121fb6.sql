
-- Relax RLS to match localStorage/HAD-ID auth model used by the cloned app
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('investments','sponsor_income','notifications','partner_income','return_payments','daily_reports','app_wallets')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY public_all_investments      ON public.investments      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_all_sponsor_income   ON public.sponsor_income   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_all_notifications    ON public.notifications    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_all_partner_income   ON public.partner_income   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_all_return_payments  ON public.return_payments  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_all_daily_reports    ON public.daily_reports    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_all_app_wallets      ON public.app_wallets      FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments, public.sponsor_income, public.notifications, public.partner_income, public.return_payments, public.daily_reports, public.app_wallets TO anon, authenticated;
GRANT ALL ON public.investments, public.sponsor_income, public.notifications, public.partner_income, public.return_payments, public.daily_reports, public.app_wallets TO service_role;

-- Backfill missing investment for already-verified transaction (HAD90317, 50000, STARTER)
INSERT INTO public.investments (had_id, amount_invested, plan_name, plan_rate, is_special, transaction_id)
SELECT t.had_id, t.amount, 'STARTER', 5.00, false, t.id
FROM public.transactions t
WHERE t.id = 'd267fddd-5576-4e87-b400-7b9e873f4ad5'
  AND NOT EXISTS (SELECT 1 FROM public.investments i WHERE i.transaction_id = t.id);
