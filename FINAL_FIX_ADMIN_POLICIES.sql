-- FINAL FIX: Remove infinite recursion policies and create proper admin policies
-- Run this in your Supabase SQL Editor

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all recordings" ON recordings;
DROP POLICY IF EXISTS "Admins can view all screenshots" ON screenshots;
DROP POLICY IF EXISTS "Admins can view all sessions" ON recording_sessions;

-- Create proper admin policies using the admin user ID directly
-- Admin user ID: 9403702c-071d-4976-8298-2c55447a8549

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'
  );

CREATE POLICY "Admin can view all recordings" ON recordings
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'
  );

CREATE POLICY "Admin can view all screenshots" ON screenshots
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'
  );

CREATE POLICY "Admin can view all sessions" ON recording_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'recordings', 'screenshots', 'recording_sessions')
ORDER BY tablename, policyname;
