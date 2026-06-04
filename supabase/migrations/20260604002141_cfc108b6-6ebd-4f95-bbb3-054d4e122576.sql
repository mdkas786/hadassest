REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_had_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_trading_assets_admin() FROM PUBLIC, anon;

ALTER PUBLICATION supabase_realtime DROP TABLE public.trading_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_assets
  (id, asset_name, symbol, coincap_id, asset_category, entry_price,
   current_price, custom_current_price, use_manual_price, allocation_percent,
   profit_target_percent, expected_duration_days, risk_level, status,
   created_at, updated_at);