
CREATE TABLE public.special_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  name text,
  description text,
  image text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  published boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_offers TO anon, authenticated;
GRANT ALL ON public.special_offers TO service_role;
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_special_offers" ON public.special_offers FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.special_offer_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.special_offers(id) ON DELETE CASCADE,
  slab_label text,
  investment_amount numeric NOT NULL,
  monthly_profit numeric NOT NULL,
  duration_months integer NOT NULL,
  total_return numeric NOT NULL,
  benefits text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_offer_slabs TO anon, authenticated;
GRANT ALL ON public.special_offer_slabs TO service_role;
ALTER TABLE public.special_offer_slabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_special_offer_slabs" ON public.special_offer_slabs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.user_special_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  had_id text NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.special_offers(id) ON DELETE CASCADE,
  slab_id uuid NOT NULL REFERENCES public.special_offer_slabs(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  monthly_profit numeric NOT NULL DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 0,
  total_return numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  transaction_id uuid,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_special_investments TO anon, authenticated;
GRANT ALL ON public.user_special_investments TO service_role;
ALTER TABLE public.user_special_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_user_special_investments" ON public.user_special_investments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_special_slabs_offer ON public.special_offer_slabs(offer_id);
CREATE INDEX idx_user_special_inv_had ON public.user_special_investments(had_id);
CREATE INDEX idx_user_special_inv_offer ON public.user_special_investments(offer_id);
