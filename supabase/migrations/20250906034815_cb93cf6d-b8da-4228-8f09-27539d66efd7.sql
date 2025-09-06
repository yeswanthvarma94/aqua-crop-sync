-- Clean up duplicate RLS policies on profiles table
-- Keep the original policies and remove duplicates

-- Remove duplicate policies created
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile only" ON public.profiles;

-- Add the missing DELETE policy with consistent naming
CREATE POLICY "Authenticated users can delete own profile"
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);