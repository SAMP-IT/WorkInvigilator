-- Fix profile creation for admin-created users
-- Run this in your Supabase SQL Editor

-- Create policy to allow service role to insert profiles
CREATE POLICY "Allow service role profile inserts" ON profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create the missing profile for manoj@gmail.com
INSERT INTO profiles (id, email, role)
VALUES ('c5723e64-5e60-44c1-8b36-a92013a55cae', 'manoj@gmail.com', 'user')
ON CONFLICT (id) DO NOTHING;

-- Verify both exist
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users WHERE email = 'manoj@gmail.com'
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles WHERE email = 'manoj@gmail.com';
