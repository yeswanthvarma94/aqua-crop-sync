-- 1) Expand stocks to support location-specific inventory and richer fields
ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS price_per_unit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;

-- Unique helper to prevent duplicates per location/account for same stock name+unit
CREATE UNIQUE INDEX IF NOT EXISTS stocks_account_location_name_unit_unique
ON public.stocks (account_id, location_id, name, unit);

-- Useful index for common filters
CREATE INDEX IF NOT EXISTS stocks_account_location_idx
ON public.stocks (account_id, location_id);

-- 2) Add location to material logs and align on timestamp field name
-- Existing column is logged_at; the UI will be updated to use this.
ALTER TABLE public.material_logs
  ADD COLUMN IF NOT EXISTS location_id uuid;

-- Helpful composite index for date-range and per-tank queries
CREATE INDEX IF NOT EXISTS material_logs_acc_loc_tank_time_idx
ON public.material_logs (account_id, location_id, tank_id, logged_at);

-- 3) Enrich expenses for per-tank/location and better categorization
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS tank_id uuid,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Helpful index for reporting
CREATE INDEX IF NOT EXISTS expenses_acc_loc_tank_date_idx
ON public.expenses (account_id, location_id, tank_id, incurred_at);

-- Note:
-- - We are not adding foreign keys to avoid accidental RLS recursion or deletes breaking data.
-- - Existing RLS policies remain valid as they gate by account_id.