-- ===========================================
-- QUICK DATABASE SETUP FOR WORK VIGILATOR
-- Run this in Supabase SQL Editor FIRST
-- ===========================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- CREATE TABLES
-- ===========================================

-- Create profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT,
  file_url TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recording_chunks table for chunked audio storage
CREATE TABLE IF NOT EXISTS recording_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start_time TIMESTAMP WITH TIME ZONE,
  chunk_number INTEGER,
  filename TEXT,
  file_url TEXT,
  duration_seconds INTEGER,
  chunk_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recording_sessions table for session summaries
CREATE TABLE IF NOT EXISTS recording_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start_time TIMESTAMP WITH TIME ZONE,
  session_end_time TIMESTAMP WITH TIME ZONE,
  total_duration_seconds INTEGER,
  total_chunks INTEGER,
  total_chunk_duration_seconds INTEGER,
  chunk_files JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create break_sessions table for break tracking
CREATE TABLE IF NOT EXISTS break_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  break_date DATE,
  break_start_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  break_duration_ms INTEGER,
  session_type TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_sessions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- CREATE SECURITY POLICIES
-- ===========================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow profile creation during signup (this is key!)
CREATE POLICY "Enable insert for authenticated users only" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND auth.role() = 'authenticated');

-- Recordings policies
DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;

CREATE POLICY "Users can view own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Screenshots policies
DROP POLICY IF EXISTS "Users can view own screenshots" ON screenshots;
DROP POLICY IF EXISTS "Users can insert own screenshots" ON screenshots;

CREATE POLICY "Users can view own screenshots" ON screenshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots" ON screenshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recording chunks policies
DROP POLICY IF EXISTS "Users can view own recording chunks" ON recording_chunks;
DROP POLICY IF EXISTS "Users can insert own recording chunks" ON recording_chunks;

CREATE POLICY "Users can view own recording chunks" ON recording_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recording chunks" ON recording_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recording sessions policies
DROP POLICY IF EXISTS "Users can view own recording sessions" ON recording_sessions;
DROP POLICY IF EXISTS "Users can insert own recording sessions" ON recording_sessions;

CREATE POLICY "Users can view own recording sessions" ON recording_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recording sessions" ON recording_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Break sessions policies
DROP POLICY IF EXISTS "Users can view own break sessions" ON break_sessions;
DROP POLICY IF EXISTS "Users can insert own break sessions" ON break_sessions;

CREATE POLICY "Users can view own break sessions" ON break_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own break sessions" ON break_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- CREATE TRIGGER FOR NEW USER PROFILES
-- ===========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- VERIFY SETUP
-- ===========================================

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'recordings', 'screenshots', 'recording_chunks', 'recording_sessions', 'break_sessions')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('profiles', 'recordings', 'screenshots', 'recording_chunks', 'recording_sessions', 'break_sessions')
  AND schemaname = 'public'
ORDER BY tablename;

-- Check policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'recordings', 'screenshots', 'recording_chunks', 'recording_sessions', 'break_sessions')
ORDER BY tablename, policyname;
