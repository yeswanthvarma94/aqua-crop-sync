
-- 1) Ensure RLS is enabled on pending_changes (safe if already enabled)
ALTER TABLE IF EXISTS public.pending_changes ENABLE ROW LEVEL SECURITY;

-- 2) Allow OWNERS to INSERT into pending_changes explicitly
DROP POLICY IF EXISTS "Owners can insert pending changes" ON public.pending_changes;
CREATE POLICY "Owners can insert pending changes"
ON public.pending_changes
FOR INSERT
TO authenticated
WITH CHECK ( public.current_user_is_account_owner(account_id) );

-- 3) Prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS account_members_unique
ON public.account_members (account_id, user_id);

-- 4) Auto-create owner membership whenever an account is created
CREATE OR REPLACE FUNCTION public.ensure_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert owner as a member if not already present
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner'::membership_role)
  ON CONFLICT (account_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger safely
DROP TRIGGER IF EXISTS trg_accounts_owner_membership ON public.accounts;
CREATE TRIGGER trg_accounts_owner_membership
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_owner_membership();
