-- Fix Row Level Security policies for skill_progression table
-- This script ensures the app can read/write skill progression data

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "skill_progression_select_policy" ON skill_progression;
DROP POLICY IF EXISTS "skill_progression_insert_policy" ON skill_progression;
DROP POLICY IF EXISTS "skill_progression_update_policy" ON skill_progression;
DROP POLICY IF EXISTS "skill_progression_delete_policy" ON skill_progression;

-- Create permissive policies for the fixed user ID

-- Allow SELECT for fixed user
CREATE POLICY "skill_progression_select_policy" ON skill_progression
  FOR SELECT
  USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

-- Allow INSERT for fixed user  
CREATE POLICY "skill_progression_insert_policy" ON skill_progression
  FOR INSERT
  WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

-- Allow UPDATE for fixed user
CREATE POLICY "skill_progression_update_policy" ON skill_progression
  FOR UPDATE
  USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b')
  WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

-- Allow DELETE for fixed user
CREATE POLICY "skill_progression_delete_policy" ON skill_progression
  FOR DELETE
  USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

-- Ensure RLS is enabled
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY; 