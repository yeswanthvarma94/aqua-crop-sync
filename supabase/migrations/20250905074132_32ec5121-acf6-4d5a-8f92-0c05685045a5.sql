-- Add phone number validation to usernames table
ALTER TABLE public.usernames 
ADD CONSTRAINT username_phone_format 
CHECK (username ~ '^[+]?[1-9]\d{1,14}$');

-- Add comment to clarify username should be phone number
COMMENT ON COLUMN public.usernames.username IS 'Phone number in E.164 format or local format';

-- Create function to validate phone number format
CREATE OR REPLACE FUNCTION public.validate_phone_number(phone_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow formats like: +1234567890, 1234567890, +91-9876543210, etc.
  RETURN phone_text ~ '^[+]?[1-9]\d{1,14}$' OR phone_text ~ '^[+]?[1-9][\d\-\s]{7,15}$';
END;
$$;

-- Create function to safely delete user account and all related data
CREATE OR REPLACE FUNCTION public.delete_user_account(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to delete their own account
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete in order to respect foreign key constraints
  DELETE FROM public.feeding_logs WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.material_logs WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.expenses WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.tank_crops WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.tanks WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.stocks WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.locations WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.pending_changes WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.usernames WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.account_members WHERE account_id IN (
    SELECT id FROM public.accounts WHERE owner_id = user_uuid
  );
  
  DELETE FROM public.accounts WHERE owner_id = user_uuid;
  
  DELETE FROM public.profiles WHERE user_id = user_uuid;
  
  -- Note: The auth.users record will be handled by Supabase Auth
END;
$$;

-- Create function to check if user is Enterprise plan owner
CREATE OR REPLACE FUNCTION public.is_enterprise_owner(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function will be updated when we have plan information in the database
  -- For now, assume all account owners can manage teams
  RETURN EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE owner_id = user_uuid
  );
END;
$$;