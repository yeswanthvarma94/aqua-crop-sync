-- Add MPIN support to profiles table
ALTER TABLE public.profiles 
ADD COLUMN mpin_hash TEXT,
ADD COLUMN mpin_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN has_mpin BOOLEAN DEFAULT FALSE;

-- Create MPIN verification function
CREATE OR REPLACE FUNCTION public.verify_user_mpin(user_phone TEXT, mpin_input TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Get the MPIN hash for the user with this phone number
  SELECT p.mpin_hash INTO stored_hash
  FROM profiles p
  JOIN usernames u ON p.user_id = u.user_id
  WHERE u.username = user_phone AND p.has_mpin = true;
  
  -- If no hash found, return false
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify the MPIN (simple comparison for now, can be enhanced with proper hashing)
  RETURN stored_hash = mpin_input;
END;
$$;

-- Create function to set user MPIN
CREATE OR REPLACE FUNCTION public.set_user_mpin(user_id UUID, mpin_value TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Update the user's profile with MPIN
  UPDATE profiles 
  SET 
    mpin_hash = mpin_value,
    mpin_created_at = NOW(),
    has_mpin = TRUE,
    updated_at = NOW()
  WHERE profiles.user_id = set_user_mpin.user_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to check if user has MPIN by phone
CREATE OR REPLACE FUNCTION public.user_has_mpin(user_phone TEXT)
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT COALESCE(p.has_mpin, FALSE)
  FROM profiles p
  JOIN usernames u ON p.user_id = u.user_id
  WHERE u.username = user_phone;
$$;