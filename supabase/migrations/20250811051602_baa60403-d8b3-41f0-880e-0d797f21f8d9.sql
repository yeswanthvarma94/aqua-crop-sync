-- Ensure RLS is enabled on accounts (idempotent)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create an explicit INSERT policy for accounts so authenticated users can create their own accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Allow owners to create accounts'
  ) THEN
    CREATE POLICY "Allow owners to create accounts"
    ON public.accounts
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Create an explicit SELECT policy so owners can view their own accounts even before membership exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Owners can view their own accounts'
  ) THEN
    CREATE POLICY "Owners can view their own accounts"
    ON public.accounts
    FOR SELECT
    USING (owner_id = auth.uid());
  END IF;
END $$;

-- Create trigger to ensure owners are added to account_members automatically upon account creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_owner_membership_on_accounts'
  ) THEN
    CREATE TRIGGER ensure_owner_membership_on_accounts
    AFTER INSERT ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_owner_membership();
  END IF;
END $$;