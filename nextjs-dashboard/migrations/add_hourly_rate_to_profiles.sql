-- Migration: Add hourly_rate field to profiles table
-- Purpose: Support salary calculations in monthly hours tracking
-- Date: 2025-10-15

-- Add hourly_rate column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Add comment to document the column
COMMENT ON COLUMN profiles.hourly_rate IS 'Hourly rate for salary calculations (in dollars). Used for monthly hours salary computation.';

-- Create index for faster queries when filtering by hourly rate
CREATE INDEX IF NOT EXISTS idx_profiles_hourly_rate ON profiles(hourly_rate) WHERE hourly_rate > 0;

-- Optional: Update existing employees with a default hourly rate
-- Uncomment and modify as needed
-- UPDATE profiles SET hourly_rate = 15.00 WHERE hourly_rate = 0 AND role = 'employee';
