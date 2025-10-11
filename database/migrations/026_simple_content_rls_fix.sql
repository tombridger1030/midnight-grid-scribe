-- Simple fix for content_items RLS issues
-- This removes the complex debugging and focuses on fixing the core issue

-- Show current user context (fixed version)
SELECT 'Current user context:' as debug_step;
SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN 'NO_USER'
    ELSE auth.uid()::text 
  END as auth_uid_text,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL
    ELSE auth.uid()
  END as auth_uid_uuid,
  current_user as database_user;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own content items" ON content_items;
DROP POLICY IF EXISTS "Users can update own content items" ON content_items;  
DROP POLICY IF EXISTS "Users can insert own content items" ON content_items;
DROP POLICY IF EXISTS "Users can delete own content items" ON content_items;
DROP POLICY IF EXISTS "content_items_select_policy" ON content_items;
DROP POLICY IF EXISTS "content_items_insert_policy" ON content_items;
DROP POLICY IF EXISTS "content_items_update_policy" ON content_items;
DROP POLICY IF EXISTS "content_items_delete_policy" ON content_items;

-- Ensure RLS is enabled
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies to start with
-- These should allow any authenticated user to do anything
CREATE POLICY "content_items_select_policy" ON content_items 
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "content_items_insert_policy" ON content_items 
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "content_items_update_policy" ON content_items 
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "content_items_delete_policy" ON content_items 
  FOR DELETE USING (
    auth.uid() IS NOT NULL
  );

-- Grant permissions
GRANT ALL ON content_items TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Show what we have now
SELECT 'Content items RLS policies updated to be permissive!' as status;

-- Show current policies
SELECT 'Current policies:' as debug_step;
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'content_items';


