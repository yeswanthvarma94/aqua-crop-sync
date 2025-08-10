-- Enable RLS on core tables (safe if already enabled)
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_members ENABLE ROW LEVEL SECURITY;

-- ACCOUNTS policies
DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK ( owner_id = auth.uid() );

DROP POLICY IF EXISTS "Members can view accounts" ON public.accounts;
CREATE POLICY "Members can view accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING ( public.current_user_is_account_member(id) );

DROP POLICY IF EXISTS "Owners can update their accounts" ON public.accounts;
CREATE POLICY "Owners can update their accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING ( owner_id = auth.uid() )
WITH CHECK ( owner_id = auth.uid() );

DROP POLICY IF EXISTS "Owners can delete their accounts" ON public.accounts;
CREATE POLICY "Owners can delete their accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING ( owner_id = auth.uid() );

-- ACCOUNT_MEMBERS policies
DROP POLICY IF EXISTS "Members can view memberships of their accounts" ON public.account_members;
CREATE POLICY "Members can view memberships of their accounts"
ON public.account_members
FOR SELECT
TO authenticated
USING ( public.current_user_is_account_member(account_id) );

DROP POLICY IF EXISTS "Owners can add members to own account" ON public.account_members;
CREATE POLICY "Owners can add members to own account"
ON public.account_members
FOR INSERT
TO authenticated
WITH CHECK ( public.current_user_is_account_owner(account_id) );

DROP POLICY IF EXISTS "Owners can update members" ON public.account_members;
CREATE POLICY "Owners can update members"
ON public.account_members
FOR UPDATE
TO authenticated
USING ( public.current_user_is_account_owner(account_id) )
WITH CHECK ( public.current_user_is_account_owner(account_id) );

DROP POLICY IF EXISTS "Owners can remove members" ON public.account_members;
CREATE POLICY "Owners can remove members"
ON public.account_members
FOR DELETE
TO authenticated
USING ( public.current_user_is_account_owner(account_id) );