-- 1) Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create enum type safely (no IF NOT EXISTS for CREATE TYPE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'membership_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.membership_role AS ENUM ('owner', 'manager', 'partner');
  END IF;
END$$;

-- 3) Tables (use IF NOT EXISTS to be idempotent)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.membership_role NOT NULL DEFAULT 'partner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_members_unique UNIQUE (account_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tank_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  seed_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stock_id UUID REFERENCES public.stocks(id) ON DELETE SET NULL,
  tank_id UUID REFERENCES public.tanks(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  incurred_at DATE NOT NULL DEFAULT (now()::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_account_members_account ON public.account_members(account_id);
CREATE INDEX IF NOT EXISTS idx_account_members_user ON public.account_members(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_account ON public.locations(account_id);
CREATE INDEX IF NOT EXISTS idx_tanks_account ON public.tanks(account_id);
CREATE INDEX IF NOT EXISTS idx_tanks_location ON public.tanks(location_id);
CREATE INDEX IF NOT EXISTS idx_tank_crops_account ON public.tank_crops(account_id);
CREATE INDEX IF NOT EXISTS idx_tank_crops_tank ON public.tank_crops(tank_id);
CREATE INDEX IF NOT EXISTS idx_stocks_account ON public.stocks(account_id);
CREATE INDEX IF NOT EXISTS idx_material_logs_account ON public.material_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_material_logs_stock ON public.material_logs(stock_id);
CREATE INDEX IF NOT EXISTS idx_material_logs_tank ON public.material_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON public.expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_account ON public.pending_changes(account_id);

-- 5) Helper functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure stable, security definer membership checks
CREATE OR REPLACE FUNCTION public.current_user_is_account_owner(aid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = aid AND a.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_account_member(aid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_is_account_owner(aid)
         OR EXISTS (
           SELECT 1 FROM public.account_members m
           WHERE m.account_id = aid AND m.user_id = auth.uid()
         );
$$;

-- 6) Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tank_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_changes ENABLE ROW LEVEL SECURITY;

-- 7) Policies (drop then create to be idempotent)
-- accounts
DROP POLICY IF EXISTS "Accounts are viewable by members" ON public.accounts;
CREATE POLICY "Accounts are viewable by members"
ON public.accounts FOR SELECT
USING (public.current_user_is_account_member(id));

DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts"
ON public.accounts FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their accounts" ON public.accounts;
CREATE POLICY "Owners can update their accounts"
ON public.accounts FOR UPDATE
USING (public.current_user_is_account_owner(id))
WITH CHECK (public.current_user_is_account_owner(id));

DROP POLICY IF EXISTS "Owners can delete their accounts" ON public.accounts;
CREATE POLICY "Owners can delete their accounts"
ON public.accounts FOR DELETE
USING (public.current_user_is_account_owner(id));

-- account_members
DROP POLICY IF EXISTS "Members can view account members of their accounts" ON public.account_members;
CREATE POLICY "Members can view account members of their accounts"
ON public.account_members FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Owners can manage account members" ON public.account_members;
CREATE POLICY "Owners can manage account members"
ON public.account_members FOR ALL
USING (public.current_user_is_account_owner(account_id))
WITH CHECK (public.current_user_is_account_owner(account_id));

-- locations
DROP POLICY IF EXISTS "Members can view locations" ON public.locations;
CREATE POLICY "Members can view locations"
ON public.locations FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert locations" ON public.locations;
CREATE POLICY "Members can insert locations"
ON public.locations FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update locations" ON public.locations;
CREATE POLICY "Members can update locations"
ON public.locations FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete locations" ON public.locations;
CREATE POLICY "Members can delete locations"
ON public.locations FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- tanks
DROP POLICY IF EXISTS "Members can view tanks" ON public.tanks;
CREATE POLICY "Members can view tanks"
ON public.tanks FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert tanks" ON public.tanks;
CREATE POLICY "Members can insert tanks"
ON public.tanks FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update tanks" ON public.tanks;
CREATE POLICY "Members can update tanks"
ON public.tanks FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete tanks" ON public.tanks;
CREATE POLICY "Members can delete tanks"
ON public.tanks FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- tank_crops
DROP POLICY IF EXISTS "Members can view tank crops" ON public.tank_crops;
CREATE POLICY "Members can view tank crops"
ON public.tank_crops FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert tank crops" ON public.tank_crops;
CREATE POLICY "Members can insert tank crops"
ON public.tank_crops FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update tank crops" ON public.tank_crops;
CREATE POLICY "Members can update tank crops"
ON public.tank_crops FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete tank crops" ON public.tank_crops;
CREATE POLICY "Members can delete tank crops"
ON public.tank_crops FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- stocks
DROP POLICY IF EXISTS "Members can view stocks" ON public.stocks;
CREATE POLICY "Members can view stocks"
ON public.stocks FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert stocks" ON public.stocks;
CREATE POLICY "Members can insert stocks"
ON public.stocks FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update stocks" ON public.stocks;
CREATE POLICY "Members can update stocks"
ON public.stocks FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete stocks" ON public.stocks;
CREATE POLICY "Members can delete stocks"
ON public.stocks FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- material_logs
DROP POLICY IF EXISTS "Members can view material logs" ON public.material_logs;
CREATE POLICY "Members can view material logs"
ON public.material_logs FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert material logs" ON public.material_logs;
CREATE POLICY "Members can insert material logs"
ON public.material_logs FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update material logs" ON public.material_logs;
CREATE POLICY "Members can update material logs"
ON public.material_logs FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete material logs" ON public.material_logs;
CREATE POLICY "Members can delete material logs"
ON public.material_logs FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- expenses
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
CREATE POLICY "Members can view expenses"
ON public.expenses FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert expenses" ON public.expenses;
CREATE POLICY "Members can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update expenses" ON public.expenses;
CREATE POLICY "Members can update expenses"
ON public.expenses FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete expenses" ON public.expenses;
CREATE POLICY "Members can delete expenses"
ON public.expenses FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- pending_changes
DROP POLICY IF EXISTS "Members can view pending changes" ON public.pending_changes;
CREATE POLICY "Members can view pending changes"
ON public.pending_changes FOR SELECT
USING (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can insert pending changes" ON public.pending_changes;
CREATE POLICY "Members can insert pending changes"
ON public.pending_changes FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can update pending changes" ON public.pending_changes;
CREATE POLICY "Members can update pending changes"
ON public.pending_changes FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

DROP POLICY IF EXISTS "Members can delete pending changes" ON public.pending_changes;
CREATE POLICY "Members can delete pending changes"
ON public.pending_changes FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- 8) Triggers for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='accounts') THEN
    DROP TRIGGER IF EXISTS set_timestamp_accounts ON public.accounts;
    CREATE TRIGGER set_timestamp_accounts
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='account_members') THEN
    DROP TRIGGER IF EXISTS set_timestamp_account_members ON public.account_members;
    CREATE TRIGGER set_timestamp_account_members
    BEFORE UPDATE ON public.account_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='locations') THEN
    DROP TRIGGER IF EXISTS set_timestamp_locations ON public.locations;
    CREATE TRIGGER set_timestamp_locations
    BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tanks') THEN
    DROP TRIGGER IF EXISTS set_timestamp_tanks ON public.tanks;
    CREATE TRIGGER set_timestamp_tanks
    BEFORE UPDATE ON public.tanks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tank_crops') THEN
    DROP TRIGGER IF EXISTS set_timestamp_tank_crops ON public.tank_crops;
    CREATE TRIGGER set_timestamp_tank_crops
    BEFORE UPDATE ON public.tank_crops
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stocks') THEN
    DROP TRIGGER IF EXISTS set_timestamp_stocks ON public.stocks;
    CREATE TRIGGER set_timestamp_stocks
    BEFORE UPDATE ON public.stocks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='material_logs') THEN
    DROP TRIGGER IF EXISTS set_timestamp_material_logs ON public.material_logs;
    CREATE TRIGGER set_timestamp_material_logs
    BEFORE UPDATE ON public.material_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    DROP TRIGGER IF EXISTS set_timestamp_expenses ON public.expenses;
    CREATE TRIGGER set_timestamp_expenses
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pending_changes') THEN
    DROP TRIGGER IF EXISTS set_timestamp_pending_changes ON public.pending_changes;
    CREATE TRIGGER set_timestamp_pending_changes
    BEFORE UPDATE ON public.pending_changes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;