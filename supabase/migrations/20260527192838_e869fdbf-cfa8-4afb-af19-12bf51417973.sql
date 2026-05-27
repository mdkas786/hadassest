
-- Set search_path on functions
ALTER FUNCTION public.generate_had_id() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- Lock down SECURITY DEFINER execute: only used internally/by trigger or in policies
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_had_id() FROM PUBLIC, anon, authenticated;
-- has_role is used inside RLS policies; keep callable so policies work
-- (policies execute as the row owner so callable is fine, but explicitly grant to auth roles)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;

-- Tighten login_attempts: replace permissive policies
DROP POLICY IF EXISTS "Anyone read own attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Anyone insert attempt" ON public.login_attempts;
CREATE POLICY "Admin reads attempts" ON public.login_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon insert attempt" ON public.login_attempts FOR INSERT TO anon, authenticated
  WITH CHECK (length(identifier) > 0 AND length(identifier) < 200);
