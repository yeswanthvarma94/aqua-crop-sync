-- Add deleted_at column to tanks table for soft deletion
ALTER TABLE public.tanks 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance when querying non-deleted tanks
CREATE INDEX idx_tanks_deleted_at ON public.tanks(deleted_at) WHERE deleted_at IS NULL;

-- Create index for querying deleted tanks
CREATE INDEX idx_tanks_deleted_at_not_null ON public.tanks(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update existing RLS policies to exclude deleted tanks from normal operations
DROP POLICY IF EXISTS "Members can view tanks" ON public.tanks;
CREATE POLICY "Members can view tanks" 
ON public.tanks 
FOR SELECT 
USING (current_user_is_account_member(account_id) AND deleted_at IS NULL);

-- Create separate policy for viewing deleted tanks (recycle bin)
CREATE POLICY "Members can view deleted tanks" 
ON public.tanks 
FOR SELECT 
USING (current_user_is_account_member(account_id) AND deleted_at IS NOT NULL);

-- Update other policies to exclude deleted tanks
DROP POLICY IF EXISTS "Owners and managers can update tanks" ON public.tanks;
CREATE POLICY "Owners and managers can update tanks" 
ON public.tanks 
FOR UPDATE 
USING (
  deleted_at IS NULL AND 
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

-- Create policy for restoring tanks from recycle bin
CREATE POLICY "Owners and managers can restore tanks" 
ON public.tanks 
FOR UPDATE 
USING (
  deleted_at IS NOT NULL AND 
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

-- Create function to auto-cleanup tanks deleted more than 6 months ago
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_tanks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Hard delete tanks that have been in recycle bin for more than 6 months
  DELETE FROM public.tanks 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '6 months';
  
  -- Also cleanup associated tank_crops for deleted tanks
  DELETE FROM public.tank_crops 
  WHERE tank_id NOT IN (SELECT id FROM public.tanks);
  
  -- Cleanup feeding_logs for deleted tanks
  DELETE FROM public.feeding_logs 
  WHERE tank_id NOT IN (SELECT id FROM public.tanks);
  
  -- Cleanup material_logs for deleted tanks
  DELETE FROM public.material_logs 
  WHERE tank_id NOT IN (SELECT id FROM public.tanks);
  
  -- Cleanup expenses for deleted tanks
  DELETE FROM public.expenses 
  WHERE tank_id NOT IN (SELECT id FROM public.tanks);
END;
$$;