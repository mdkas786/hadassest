ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;