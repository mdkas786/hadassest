
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.plan_type AS ENUM ('starter', 'growth', 'fortune');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'verified', 'rejected', 'completed');
CREATE TYPE public.transaction_type AS ENUM ('investment', 'return');
CREATE TYPE public.investment_status AS ENUM ('active', 'completed', 'paused');
CREATE TYPE public.asset_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');

-- =====================================================
-- USER ROLES (separate table, never on profiles)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  had_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  mobile TEXT,
  email TEXT,
  city TEXT,
  upi_id TEXT,
  wallet_address TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- INVESTMENTS
-- =====================================================
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  had_id TEXT NOT NULL,
  plan_name plan_type NOT NULL DEFAULT 'starter',
  plan_rate NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  amount_invested NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_2x NUMERIC(14,2) GENERATED ALWAYS AS (amount_invested * 2) STORED,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status investment_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own investments" ON public.investments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage investments" ON public.investments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRANSACTIONS
-- =====================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  had_id TEXT NOT NULL,
  type transaction_type NOT NULL DEFAULT 'investment',
  amount NUMERIC(14,2) NOT NULL,
  method TEXT,
  txn_ref TEXT,
  screenshot_url TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own txns" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own txns" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update txns" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRADING ASSETS (company portfolio — public read)
-- =====================================================
CREATE TABLE public.trading_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  coincap_id TEXT,
  asset_category TEXT NOT NULL DEFAULT 'crypto',
  entry_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  current_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  custom_current_price NUMERIC(18,4),
  use_manual_price BOOLEAN NOT NULL DEFAULT false,
  allocation_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  profit_target_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  expected_duration_days INTEGER NOT NULL DEFAULT 30,
  risk_level risk_level NOT NULL DEFAULT 'medium',
  admin_note TEXT,
  status asset_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trading_assets TO anon, authenticated;
GRANT ALL ON public.trading_assets TO service_role;
ALTER TABLE public.trading_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active assets" ON public.trading_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage assets" ON public.trading_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id TEXT NOT NULL, -- specific HAD ID or 'ALL'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notif_type TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own or broadcast" ON public.notifications FOR SELECT TO authenticated
  USING (had_id = 'ALL' OR had_id IN (SELECT had_id FROM public.profiles WHERE id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users mark own read" ON public.notifications FOR UPDATE TO authenticated
  USING (had_id IN (SELECT had_id FROM public.profiles WHERE id = auth.uid()) OR had_id = 'ALL');
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- APP SETTINGS (key/value, public read)
-- =====================================================
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('announcement_banner', ''),
  ('support_whatsapp', '+91'),
  ('support_email', 'support@hadinvestment.com'),
  ('min_investment', '10000'),
  ('max_investment', '5000000'),
  ('starter_rate', '5'),
  ('growth_rate', '6'),
  ('fortune_rate', '7'),
  ('starter_slab_max', '500000'),
  ('growth_slab_max', '1000000'),
  ('referral_enabled', 'true'),
  ('referral_bonus', '0'),
  ('wallet_upi', ''),
  ('wallet_btc', ''),
  ('wallet_eth', ''),
  ('wallet_usdt_trc20', ''),
  ('wallet_usdt_erc20', ''),
  ('wallet_bnb', '');

-- =====================================================
-- LOGIN ATTEMPTS (admin rate limit)
-- =====================================================
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_attempts TO anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert attempt" ON public.login_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone read own attempts" ON public.login_attempts FOR SELECT TO anon, authenticated USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_had_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  new_id TEXT;
  exists_check INT;
BEGIN
  LOOP
    new_id := 'HAD' || LPAD(floor(random() * 100000)::text, 5, '0');
    SELECT COUNT(*) INTO exists_check FROM public.profiles WHERE had_id = new_id;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_had_id TEXT;
  v_ref_code TEXT;
BEGIN
  v_had_id := public.generate_had_id();
  v_ref_code := 'REF' || substr(md5(NEW.id::text), 1, 6);

  INSERT INTO public.profiles (id, had_id, full_name, email, mobile, city, upi_id, wallet_address, referred_by, referral_code)
  VALUES (
    NEW.id,
    v_had_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'upi_id',
    NEW.raw_user_meta_data->>'wallet_address',
    NEW.raw_user_meta_data->>'referred_by',
    v_ref_code
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER investments_touch BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trading_assets_touch BEFORE UPDATE ON public.trading_assets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- =====================================================
-- STORAGE
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own screenshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-screenshots' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
