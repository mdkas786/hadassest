CREATE POLICY "special-offers public read" ON storage.objects FOR SELECT USING (bucket_id = 'special-offers');
CREATE POLICY "special-offers anyone upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'special-offers');
CREATE POLICY "special-offers anyone update" ON storage.objects FOR UPDATE USING (bucket_id = 'special-offers');
CREATE POLICY "special-offers anyone delete" ON storage.objects FOR DELETE USING (bucket_id = 'special-offers');