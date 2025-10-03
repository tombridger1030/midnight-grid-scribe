-- Migration 017: Add admin field to user profiles
-- This allows certain users to be marked as administrators who can impersonate other users

-- Add is_admin column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set default admin users (replace with actual admin user IDs)
-- This example sets the tombridger user as admin
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.is_admin IS 'Indicates if the user has administrative privileges, including the ability to impersonate other users';

-- Create an index for faster admin user queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles (is_admin) WHERE is_admin = TRUE;
