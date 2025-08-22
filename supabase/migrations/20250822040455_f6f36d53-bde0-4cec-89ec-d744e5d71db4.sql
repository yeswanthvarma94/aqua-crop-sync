-- Fix RLS policies for tanks soft delete
-- Same issue as locations - policy restricts updates to when deleted_at IS NULL
-- But we need to allow setting deleted_at from NULL to a timestamp

DROP POLICY IF EXISTS "Owners and managers can update tanks" ON public.tanks;

-- Create a unified policy that allows both updating non-deleted tanks AND soft deleting them
CREATE POLICY "Owners and managers can update tanks" 
ON public.tanks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM account_members m
    WHERE m.account_id = tanks.account_id 
    AND m.user_id = auth.uid() 
    AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM account_members m
    WHERE m.account_id = tanks.account_id 
    AND m.user_id = auth.uid() 
    AND m.role = ANY (ARRAY['owner'::membership_role, 'manager'::membership_role])
  )
);