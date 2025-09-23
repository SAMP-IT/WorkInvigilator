-- Fix infinite recursion in profiles RLS policies
-- Run this in your Supabase SQL Editor

-- First, drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a proper admin policy that doesn't cause recursion
-- This assumes the admin user has a known ID, or we can use a different approach

-- Option 1: If you know the admin user ID, use it directly
-- Replace 'your-admin-user-id-here' with your actual admin user ID
-- You can find it by running: SELECT id FROM auth.users WHERE email = 'abillkishoreraj@gmail.com';

-- For now, let's create a policy that allows the specific admin user to see all profiles
-- Replace the UUID below with your admin user's ID
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'  -- Replace with your admin user ID
  );

-- Alternative Option 2: Create a simple policy that allows all authenticated users to see profiles
-- (This is less secure but avoids recursion - use only temporarily)
-- CREATE POLICY "Temp allow all authenticated users to view profiles" ON profiles
--   FOR SELECT USING (auth.role() = 'authenticated');

-- Also fix the other policies to avoid recursion
DROP POLICY IF EXISTS "Admins can view all recordings" ON recordings;
DROP POLICY IF EXISTS "Admins can view all screenshots" ON screenshots;
DROP POLICY IF EXISTS "Admins can view all sessions" ON recording_sessions;

-- Create proper admin policies for other tables
CREATE POLICY "Admin can view all recordings" ON recordings
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'  -- Replace with your admin user ID
  );

CREATE POLICY "Admin can view all screenshots" ON screenshots
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'  -- Replace with your admin user ID
  );

CREATE POLICY "Admin can view all sessions" ON recording_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'  -- Replace with your admin user ID
  );
