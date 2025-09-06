-- Fix the profiles table RLS policies to ensure users can only access their own data
-- The current issue is that authenticated users could potentially access other users' phone numbers

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Ensure we have proper restrictive policies for profile access
-- Users should only be able to see and modify their own profile data

-- Policy for viewing own profile only
CREATE POLICY "Users can view their own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy for updating own profile only  
CREATE POLICY "Users can update their own profile only"
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for inserting own profile only
CREATE POLICY "Users can insert their own profile only"
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for deleting own profile only
CREATE POLICY "Users can delete their own profile only"
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);