
-- Permissive RLS for cloned app (uses localStorage had_id auth, not Supabase Auth)
DROP POLICY IF EXISTS "Users insert own txns" ON public.transactions;
DROP POLICY IF EXISTS "Users view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Admins update txns" ON public.transactions;
DROP POLICY IF EXISTS "Admins delete txns" ON public.transactions;
CREATE POLICY "public_all_transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;

-- Storage: allow app to upload/read/delete offer banners and payment screenshots (app-level auth)
DROP POLICY IF EXISTS "Users upload own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users read own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users update own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "public_rw_payment_screenshots" ON storage.objects;
DROP POLICY IF EXISTS "public_rw_special_offers" ON storage.objects;

CREATE POLICY "public_rw_payment_screenshots" ON storage.objects FOR ALL
  USING (bucket_id = 'payment-screenshots') WITH CHECK (bucket_id = 'payment-screenshots');
CREATE POLICY "public_rw_special_offers" ON storage.objects FOR ALL
  USING (bucket_id = 'special-offers') WITH CHECK (bucket_id = 'special-offers');
