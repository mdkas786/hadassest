ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_id uuid,
  ADD COLUMN IF NOT EXISTS slab_id uuid,
  ADD COLUMN IF NOT EXISTS monthly_roi numeric,
  ADD COLUMN IF NOT EXISTS duration_months integer,
  ADD COLUMN IF NOT EXISTS total_return numeric,
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS offer_id uuid,
  ADD COLUMN IF NOT EXISTS slab_id uuid;