-- Remove owner-only RLS for write operations and allow all account members to write

-- LOCATIONS
DROP POLICY IF EXISTS "Owners can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Owners can update locations" ON public.locations;
DROP POLICY IF EXISTS "Owners can delete locations" ON public.locations;

CREATE POLICY "Members can insert locations"
ON public.locations
FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can update locations"
ON public.locations
FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can delete locations"
ON public.locations
FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- TANKS
DROP POLICY IF EXISTS "Owners can insert tanks" ON public.tanks;
DROP POLICY IF EXISTS "Owners can update tanks" ON public.tanks;
DROP POLICY IF EXISTS "Owners can delete tanks" ON public.tanks;

CREATE POLICY "Members can insert tanks"
ON public.tanks
FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can update tanks"
ON public.tanks
FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can delete tanks"
ON public.tanks
FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- TANK CROPS
DROP POLICY IF EXISTS "Owners can insert tank crops" ON public.tank_crops;
DROP POLICY IF EXISTS "Owners can update tank crops" ON public.tank_crops;
DROP POLICY IF EXISTS "Owners can delete tank crops" ON public.tank_crops;

CREATE POLICY "Members can insert tank crops"
ON public.tank_crops
FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can update tank crops"
ON public.tank_crops
FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can delete tank crops"
ON public.tank_crops
FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- STOCKS
DROP POLICY IF EXISTS "Owners can insert stocks" ON public.stocks;
DROP POLICY IF EXISTS "Owners can update stocks" ON public.stocks;
DROP POLICY IF EXISTS "Owners can delete stocks" ON public.stocks;

CREATE POLICY "Members can insert stocks"
ON public.stocks
FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can update stocks"
ON public.stocks
FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can delete stocks"
ON public.stocks
FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- MATERIAL LOGS
DROP POLICY IF EXISTS "Owners can insert material logs" ON public.material_logs;
DROP POLICY IF EXISTS "Owners can update material logs" ON public.material_logs;
DROP POLICY IF EXISTS "Owners can delete material logs" ON public.material_logs;

CREATE POLICY "Members can insert material logs"
ON public.material_logs
FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can update material logs"
ON public.material_logs
FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can delete material logs"
ON public.material_logs
FOR DELETE
USING (public.current_user_is_account_member(account_id));

-- EXPENSES
DROP POLICY IF EXISTS "Owners can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owners can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owners can delete expenses" ON public.expenses;

CREATE POLICY "Members can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can update expenses"
ON public.expenses
FOR UPDATE
USING (public.current_user_is_account_member(account_id))
WITH CHECK (public.current_user_is_account_member(account_id));

CREATE POLICY "Members can delete expenses"
ON public.expenses
FOR DELETE
USING (public.current_user_is_account_member(account_id));