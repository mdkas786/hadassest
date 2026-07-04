
ALTER PUBLICATION supabase_realtime DROP TABLE public.trading_assets;
DROP VIEW IF EXISTS public.trading_assets_public;

ALTER TABLE public.investments ALTER COLUMN plan_name TYPE text USING plan_name::text;
ALTER TABLE public.investments ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.trading_assets ALTER COLUMN risk_level TYPE text USING risk_level::text;
ALTER TABLE public.trading_assets ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.transactions ALTER COLUMN type TYPE text USING type::text;

CREATE VIEW public.trading_assets_public AS
SELECT id, asset_name, symbol, coincap_id, asset_category, entry_price, current_price,
       custom_current_price, use_manual_price, allocation_percent, profit_target_percent,
       expected_duration_days, risk_level, status, created_at, updated_at
FROM public.trading_assets;
GRANT SELECT ON public.trading_assets_public TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_assets;

ALTER TABLE public.sponsor_income ALTER COLUMN earner_user_id DROP NOT NULL;
ALTER TABLE public.sponsor_income ALTER COLUMN referred_had_id DROP NOT NULL;
ALTER TABLE public.sponsor_income ALTER COLUMN referred_user_id DROP NOT NULL;
ALTER TABLE public.sponsor_income ALTER COLUMN sponsor_amount DROP NOT NULL;
ALTER TABLE public.sponsor_income ALTER COLUMN investment_amount DROP NOT NULL;
