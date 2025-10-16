-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'enterprise');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type subscription_plan NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can modify subscriptions
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.uid() IS NULL);

-- Create function to get user subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_type FROM public.subscriptions WHERE user_id = user_uuid AND status = 'active'),
    'free'::subscription_plan
  );
$$;

-- Create function to verify ownership without RLS bypass risk
CREATE OR REPLACE FUNCTION public.verify_account_owner(account_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = account_uuid AND owner_id = user_uuid
  );
$$;

-- Create function to check if user can add team member
CREATE OR REPLACE FUNCTION public.can_add_team_member(account_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
  current_member_count INT;
BEGIN
  -- Get user's plan
  user_plan := public.get_user_subscription(user_uuid);
  
  -- Only enterprise can add team members
  IF user_plan != 'enterprise' THEN
    RETURN FALSE;
  END IF;
  
  -- Check current member count
  SELECT COUNT(DISTINCT user_id) INTO current_member_count
  FROM public.account_members
  WHERE account_id = account_uuid;
  
  -- Enterprise allows up to 5 members
  RETURN current_member_count < 5;
END;
$$;

-- Create audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Account owners can view their audit logs
CREATE POLICY "Owners can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE accounts.id = audit_logs.account_id 
    AND accounts.owner_id = auth.uid()
  )
);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_account_id UUID,
  p_action TEXT,
  p_details JSONB,
  p_ip_address TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (user_id, account_id, action, details, ip_address)
  VALUES (p_user_id, p_account_id, p_action, p_details, p_ip_address);
$$;

-- Add updated_at trigger to subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();