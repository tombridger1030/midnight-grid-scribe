-- Fix UPDATE policy for sprints table
-- Run this in your Supabase SQL Editor

-- First, drop the existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Users can update their own sprints" ON sprints;

-- Create a new UPDATE policy with proper permissions
CREATE POLICY "Users can update their own sprints" ON sprints
FOR UPDATE 
USING (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b')
WITH CHECK (user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b');

-- Also ensure all columns can be updated
-- Check if RLS is enabled
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

-- List all current policies (for verification)
SELECT * FROM pg_policies WHERE tablename = 'sprints'; 