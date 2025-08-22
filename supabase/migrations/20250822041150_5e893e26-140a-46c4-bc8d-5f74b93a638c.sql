-- Create a comprehensive solution for authentication issues
-- Add a test user and ensure proper authentication flow works

-- First, let's create a test user in Supabase auth (this will be done via signup)
-- But we need to ensure the account_members table has proper data

-- Check if we have proper account setup for the existing account
DO $$
BEGIN
  -- Ensure the account exists and has proper owner
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = '40bf9885-4a3e-4d72-81bf-8244c21ce0b9') THEN
    INSERT INTO accounts (id, name, owner_id) 
    VALUES ('40bf9885-4a3e-4d72-81bf-8244c21ce0b9', 'Test Farm', '21f6e0c2-6af3-4af0-9357-965c77327808');
  END IF;
  
  -- Ensure the user is properly set as owner in account_members
  INSERT INTO account_members (user_id, account_id, role) 
  VALUES ('21f6e0c2-6af3-4af0-9357-965c77327808', '40bf9885-4a3e-4d72-81bf-8244c21ce0b9', 'owner')
  ON CONFLICT (user_id, account_id) DO UPDATE SET role = 'owner';
  
END $$;