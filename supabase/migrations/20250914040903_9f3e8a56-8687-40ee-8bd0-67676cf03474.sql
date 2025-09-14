-- Create RPC function to get team members with all details
CREATE OR REPLACE FUNCTION public.get_team_members(account_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  phone text,
  role membership_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    am.user_id,
    p.name,
    u.username as phone,
    am.role
  FROM account_members am
  JOIN profiles p ON p.user_id = am.user_id
  JOIN usernames u ON u.user_id = am.user_id AND u.account_id = am.account_id
  WHERE am.account_id = account_id_param
  ORDER BY 
    CASE am.role 
      WHEN 'owner' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'partner' THEN 3 
    END,
    p.name;
$$;