-- Add deleted_at column to locations table for soft delete functionality
ALTER TABLE public.locations 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update RLS policies for locations to handle soft delete
DROP POLICY IF EXISTS "Members can view locations" ON public.locations;
CREATE POLICY "Members can view non-deleted locations" 
ON public.locations 
FOR SELECT 
USING (current_user_is_account_member(account_id) AND deleted_at IS NULL);

-- Add policy for viewing deleted locations (for recycle bin functionality)
CREATE POLICY "Members can view deleted locations" 
ON public.locations 
FOR SELECT 
USING (current_user_is_account_member(account_id) AND deleted_at IS NOT NULL);

-- Update existing policies to work with soft delete
DROP POLICY IF EXISTS "Owners and managers can update locations" ON public.locations;
CREATE POLICY "Owners and managers can update non-deleted locations" 
ON public.locations 
FOR UPDATE 
USING (
  deleted_at IS NULL 
  AND EXISTS (
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

-- Add policy for restoring deleted locations
CREATE POLICY "Owners and managers can restore deleted locations" 
ON public.locations 
FOR UPDATE 
USING (
  deleted_at IS NOT NULL 
  AND EXISTS (
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