-- Create profile for the employee user manoj@gmail.com
-- Run this in your Supabase SQL Editor

INSERT INTO profiles (id, email, role)
VALUES ('c5723e64-5e60-44c1-8b36-a92013a55cae', 'manoj@gmail.com', 'user')
ON CONFLICT (id) DO NOTHING;

-- Verify the profile was created
SELECT id, email, role, created_at FROM profiles WHERE email = 'manoj@gmail.com';
