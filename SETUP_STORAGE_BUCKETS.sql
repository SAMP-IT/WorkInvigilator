-- ===========================================
-- WORK VIGILATOR STORAGE BUCKET SETUP
-- Run these commands in Supabase Dashboard
-- ===========================================

-- ===========================================
-- 1. CREATE STORAGE BUCKETS
-- ===========================================

-- Create audio-recordings bucket (for storing audio files)
-- Go to: https://supabase.com/dashboard/project/qqnmilkgltcooqzytkxy/storage/buckets
-- Click "Create bucket"
-- Name: audio-recordings
-- Make it PRIVATE (not public)

-- ===========================================
-- 2. CREATE STORAGE POLICIES
-- ===========================================
-- After creating the bucket, go to Authentication > Policies
-- Or run these SQL commands:

-- Allow authenticated users to upload to their own folder in audio-recordings bucket
CREATE POLICY "Users can upload to their own audio folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-recordings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view their own audio files
CREATE POLICY "Users can view their own audio files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-recordings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own audio files
CREATE POLICY "Users can update their own audio files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'audio-recordings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio-recordings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow admin to view ALL audio files from ALL users
CREATE POLICY "Admin can view all audio files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-recordings'
    AND auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'  -- Admin user ID
  );

-- Allow admin to manage ALL audio files
CREATE POLICY "Admin can manage all audio files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'audio-recordings'
    AND auth.uid()::text = '9403702c-071d-4976-8298-2c55447a8549'  -- Admin user ID
  );

-- ===========================================
-- 3. VERIFY SETUP
-- ===========================================

-- Check if policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%audio%'
ORDER BY policyname;

-- ===========================================
-- 4. OPTIONAL: Create screenshots bucket (if needed later)
-- ===========================================

-- If you want to store screenshots in Supabase storage instead of local storage:
-- Create bucket: screenshots (private)
-- Apply similar policies as above but with bucket_id = 'screenshots'
