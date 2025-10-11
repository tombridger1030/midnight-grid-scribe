-- Fix content_metrics RLS issues to match content_items approach
-- This makes content_metrics policies permissive like content_items

-- Show current user context
SELECT 'Current user context for content_metrics:' as debug_step;
SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN 'NO_USER'
    ELSE auth.uid()::text 
  END as auth_uid_text,
  current_user as database_user;

-- Drop ALL existing policies for content_metrics
DROP POLICY IF EXISTS "Users can view own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can update own content metrics" ON content_metrics;  
DROP POLICY IF EXISTS "Users can insert own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can delete own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "content_metrics_select_policy" ON content_metrics;
DROP POLICY IF EXISTS "content_metrics_insert_policy" ON content_metrics;
DROP POLICY IF EXISTS "content_metrics_update_policy" ON content_metrics;
DROP POLICY IF EXISTS "content_metrics_delete_policy" ON content_metrics;

-- Ensure RLS is enabled on content_metrics
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies to match content_items approach
-- These should allow any authenticated user to do anything
CREATE POLICY "content_metrics_select_policy" ON content_metrics 
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "content_metrics_insert_policy" ON content_metrics 
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "content_metrics_update_policy" ON content_metrics 
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "content_metrics_delete_policy" ON content_metrics 
  FOR DELETE USING (
    auth.uid() IS NOT NULL
  );

-- Grant permissions
GRANT ALL ON content_metrics TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Show what we have now
SELECT 'Content metrics RLS policies updated to be permissive!' as status;

-- Show current policies
SELECT 'Current content_metrics policies:' as debug_step;
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'content_metrics';

-- Check table structure to make sure it has the expected columns
SELECT 'Content metrics table structure:' as debug_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_metrics' 
ORDER BY ordinal_position;


