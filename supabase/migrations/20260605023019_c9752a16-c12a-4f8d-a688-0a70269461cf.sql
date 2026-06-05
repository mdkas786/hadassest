CREATE OR REPLACE VIEW public.trading_assets_public
WITH (security_invoker = on) AS
SELECT
  id,
  asset_name,
  symbol,
  coincap_id,
  asset_category,
  entry_price,
  current_price,
  custom_current_price,
  use_manual_price,
  allocation_percent,
  profit_target_percent,
  expected_duration_days,
  risk_level,
  status,
  created_at,
  updated_at
FROM public.trading_assets;

GRANT SELECT ON public.trading_assets_public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated can read own channel" ON realtime.messages;
CREATE POLICY "Authenticated can read own channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() IN ('public:app_settings', 'public:app_wallets', 'public:trading_assets', 'ALL')
);