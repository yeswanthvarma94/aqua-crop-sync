-- Rename locations table to farms and update all related foreign keys
-- This migration ensures all location references become farm references

-- First, rename the main table
ALTER TABLE public.locations RENAME TO farms;

-- Update foreign key columns in related tables to use farm_id instead of location_id
ALTER TABLE public.expenses RENAME COLUMN location_id TO farm_id;
ALTER TABLE public.feeding_logs RENAME COLUMN location_id TO farm_id;
ALTER TABLE public.material_logs RENAME COLUMN location_id TO farm_id;
ALTER TABLE public.stocks RENAME COLUMN location_id TO farm_id;
ALTER TABLE public.tanks RENAME COLUMN location_id TO farm_id;

-- Update RLS policy names to reflect the new table name
-- Drop old policies with location references
DROP POLICY IF EXISTS "Members can view deleted locations" ON public.farms;
DROP POLICY IF EXISTS "Members can view non-deleted locations" ON public.farms;
DROP POLICY IF EXISTS "Owners and managers can delete locations" ON public.farms;
DROP POLICY IF EXISTS "Owners and managers can insert locations" ON public.farms;
DROP POLICY IF EXISTS "Owners and managers can restore deleted locations" ON public.farms;
DROP POLICY IF EXISTS "Owners and managers can update locations" ON public.farms;

-- Create new policies with farm terminology
CREATE POLICY "Members can view deleted farms" 
ON public.farms 
FOR SELECT 
USING (current_user_is_account_member(account_id) AND deleted_at IS NOT NULL);

CREATE POLICY "Members can view non-deleted farms" 
ON public.farms 
FOR SELECT 
USING (current_user_is_account_member(account_id) AND deleted_at IS NULL);

CREATE POLICY "Owners and managers can delete farms" 
ON public.farms 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM account_members m
  WHERE m.account_id = farms.account_id 
  AND m.user_id = auth.uid() 
  AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
));

CREATE POLICY "Owners and managers can insert farms" 
ON public.farms 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM account_members m
  WHERE m.account_id = farms.account_id 
  AND m.user_id = auth.uid() 
  AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
));

CREATE POLICY "Owners and managers can restore deleted farms" 
ON public.farms 
FOR UPDATE 
USING (deleted_at IS NOT NULL AND EXISTS (
  SELECT 1 FROM account_members m
  WHERE m.account_id = farms.account_id 
  AND m.user_id = auth.uid() 
  AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM account_members m
  WHERE m.account_id = farms.account_id 
  AND m.user_id = auth.uid() 
  AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
));

CREATE POLICY "Owners and managers can update farms" 
ON public.farms 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM account_members m
  WHERE m.account_id = farms.account_id 
  AND m.user_id = auth.uid() 
  AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM account_members m
  WHERE m.account_id = farms.account_id 
  AND m.user_id = auth.uid() 
  AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
));