
-- 1) Lock down SECURITY DEFINER helper functions: revoke broad EXECUTE
REVOKE ALL ON FUNCTION public.generate_had_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
-- has_role is used by RLS policies; keep it callable by authenticated only (no anon)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Tighten login_attempts inserts (require an email-like identifier, cap size)
DROP POLICY IF EXISTS "Anon insert attempt" ON public.login_attempts;
CREATE POLICY "Anon insert attempt"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(identifier) BETWEEN 3 AND 254
  AND identifier ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 3) Restrict admin_note column on trading_assets (no longer publicly readable)
REVOKE SELECT (admin_note) ON public.trading_assets FROM anon, authenticated;

-- Admin-only accessor for admin_note via SECURITY DEFINER (enforces admin check)
CREATE OR REPLACE FUNCTION public.get_trading_assets_admin()
RETURNS SETOF public.trading_assets
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.trading_assets ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_trading_assets_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trading_assets_admin() TO authenticated, service_role;

-- 4) Storage: add UPDATE/DELETE policies for payment-screenshots bucket
-- Files stored as <user_id>/<filename>
CREATE POLICY "Users delete own payment screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (auth.uid()::text = (storage.foldername(name))[1]
       OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Users update own payment screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (auth.uid()::text = (storage.foldername(name))[1]
       OR public.has_role(auth.uid(), 'admin'::public.app_role))
)
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND (auth.uid()::text = (storage.foldername(name))[1]
       OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- 5) Realtime channel-level authorization on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users may only subscribe to their own user-id channel topic,
-- or to broadcast 'ALL' / 'public:*' topics. Admins may subscribe to anything.
CREATE POLICY "Authenticated can read own channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() LIKE 'public:%'
  OR realtime.topic() = 'ALL'
);

CREATE POLICY "Authenticated can write own channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() = ('user:' || auth.uid()::text)
);
