-- Fix RLS policies for locations soft delete
-- The issue is that the current policy only allows updates when deleted_at IS NULL
-- But we need to allow setting deleted_at from NULL to a timestamp

DROP POLICY IF EXISTS "Owners and managers can update non-deleted locations" ON public.locations;

-- Create a unified policy that allows both updating non-deleted locations AND soft deleting them
CREATE POLICY "Owners and managers can update locations" 
ON public.locations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM account_members m
    WHERE m.account_id = locations.account_id 
    AND m.user_id = auth.uid() 
    AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM account_members m
    WHERE m.account_id = locations.account_id 
    AND m.user_id = auth.uid() 
    AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
  )
);