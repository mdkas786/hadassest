
-- recursive flat team count
CREATE OR REPLACE FUNCTION public.get_team_count(root_had_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE team AS (
    SELECT had_id FROM public.users WHERE referred_by = root_had_id
    UNION ALL
    SELECT u.had_id FROM public.users u JOIN team t ON u.referred_by = t.had_id
  )
  SELECT count(*)::int FROM team;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_count(text) TO anon, authenticated, service_role;

-- storage policies for payment-screenshots bucket (bucket created via tool)
CREATE POLICY "public_upload_payment_screenshots"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "public_read_payment_screenshots"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'payment-screenshots');

CREATE POLICY "public_delete_payment_screenshots"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id = 'payment-screenshots');
