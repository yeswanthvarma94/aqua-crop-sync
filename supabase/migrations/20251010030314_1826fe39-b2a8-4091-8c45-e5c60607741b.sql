-- Remove MPIN-related columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS mpin_hash,
DROP COLUMN IF EXISTS has_mpin,
DROP COLUMN IF EXISTS mpin_created_at;

-- Drop MPIN-related functions if they exist
DROP FUNCTION IF EXISTS public.verify_user_mpin(text, text);
DROP FUNCTION IF EXISTS public.set_user_mpin(uuid, text);
DROP FUNCTION IF EXISTS public.user_has_mpin(text);