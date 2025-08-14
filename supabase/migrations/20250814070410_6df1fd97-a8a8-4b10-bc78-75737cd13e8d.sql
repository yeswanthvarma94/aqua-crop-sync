-- Fix the trigger and add missing memberships

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_owner_membership_trigger ON public.accounts;

-- Recreate the ensure_owner_membership function with better error handling
CREATE OR REPLACE FUNCTION public.ensure_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert the owner as a member with 'owner' role
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner'::membership_role)
  ON CONFLICT (account_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger to automatically add owners as members
CREATE TRIGGER ensure_owner_membership_trigger
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_owner_membership();

-- Fix existing accounts that are missing owner memberships
INSERT INTO public.account_members (account_id, user_id, role)
SELECT a.id, a.owner_id, 'owner'::membership_role
FROM public.accounts a
LEFT JOIN public.account_members am ON a.id = am.account_id AND a.owner_id = am.user_id
WHERE am.user_id IS NULL
ON CONFLICT (account_id, user_id) DO NOTHING;