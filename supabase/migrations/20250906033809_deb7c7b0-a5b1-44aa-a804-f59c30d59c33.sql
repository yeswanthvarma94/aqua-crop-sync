-- Fix the security vulnerability by making the anonymous denial policy restrictive
-- This ensures anonymous users cannot access the profiles table under any circumstances

-- Drop the existing permissive policy that's not working properly
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Create a restrictive policy that properly blocks anonymous access
-- Restrictive policies use AND logic, so ALL restrictive policies must pass
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
AS RESTRICTIVE
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Ensure the existing policies are properly configured for authenticated access only
-- The existing permissive policies will work together with this restrictive policy