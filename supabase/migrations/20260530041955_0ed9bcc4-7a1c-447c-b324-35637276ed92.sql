
-- 1) Notifications UPDATE: restrict to only flipping read_at (and not changing identity fields)
DROP POLICY IF EXISTS "Users mark own read" ON public.notifications;
CREATE POLICY "Users mark own read"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  (had_id IN (SELECT p.had_id FROM public.profiles p WHERE p.id = auth.uid()))
  OR had_id = 'ALL'
)
WITH CHECK (
  (had_id IN (SELECT p.had_id FROM public.profiles p WHERE p.id = auth.uid()))
  OR had_id = 'ALL'
);

-- Restrict UPDATE column privileges so users can only modify read_at
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- 2) trading_assets: ensure admin_note is not readable by anon/authenticated
REVOKE SELECT ON public.trading_assets FROM anon, authenticated;
GRANT SELECT (
  id, asset_name, symbol, coincap_id, asset_category,
  entry_price, current_price, custom_current_price, use_manual_price,
  allocation_percent, profit_target_percent, expected_duration_days,
  risk_level, status, created_at, updated_at
) ON public.trading_assets TO anon, authenticated;

-- 3) Lock down SECURITY DEFINER functions: revoke broad EXECUTE; grant only where needed.
REVOKE EXECUTE ON FUNCTION public.generate_had_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_trading_assets_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trading_assets_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- check_had_id and register_had_user are used by the unauthenticated login/register flows
-- keep EXECUTE for anon + authenticated explicitly (no change), just ensure no PUBLIC bloat.
REVOKE EXECUTE ON FUNCTION public.check_had_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_had_id(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.register_had_user(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_had_user(text, text, text, text, text, text) TO anon, authenticated;
