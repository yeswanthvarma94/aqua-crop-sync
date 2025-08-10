-- Fix linter: set search_path on ensure_owner_membership
CREATE OR REPLACE FUNCTION public.ensure_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner'::membership_role)
  ON CONFLICT (account_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;