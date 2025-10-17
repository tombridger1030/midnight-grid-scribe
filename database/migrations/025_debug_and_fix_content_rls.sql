-- Debug and fix content_items RLS issues
-- This migration helps debug the RLS problem and ensures proper policies

-- First, let's check what's in the database
SELECT 'Current content_items table structure:' as debug_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_items' 
ORDER BY ordinal_position;

-- Check if the table has RLS enabled
SELECT 'RLS status for content_items:' as debug_step;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'content_items';

-- Show current policies
SELECT 'Current policies on content_items:' as debug_step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'content_items';

-- Show current user info
SELECT 'Current user context:' as debug_step;
SELECT 
  COALESCE(auth.uid()::text, 'NO_USER') as auth_uid_text,
  COALESCE(auth.uid(), 'NO_USER'::uuid) as auth_uid_uuid,
  current_user as database_user,
  session_user as session_user;

-- Disable RLS temporarily for debugging (BE CAREFUL!)
-- ALTER TABLE content_items DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own content items" ON content_items;
DROP POLICY IF EXISTS "Users can update own content items" ON content_items;  
DROP POLICY IF EXISTS "Users can insert own content items" ON content_items;
DROP POLICY IF EXISTS "Users can delete own content items" ON content_items;
DROP POLICY IF EXISTS "content_items_select_policy" ON content_items;
DROP POLICY IF EXISTS "content_items_insert_policy" ON content_items;
DROP POLICY IF EXISTS "content_items_update_policy" ON content_items;
DROP POLICY IF EXISTS "content_items_delete_policy" ON content_items;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies with multiple formats to be safe
-- Policy 1: Using auth.uid()::text = user_id (for TEXT user_id)
CREATE POLICY "content_items_select_policy" ON content_items 
  FOR SELECT USING (
    auth.uid()::text = user_id OR 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "content_items_insert_policy" ON content_items 
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "content_items_update_policy" ON content_items 
  FOR UPDATE USING (
    auth.uid()::text = user_id OR 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "content_items_delete_policy" ON content_items 
  FOR DELETE USING (
    auth.uid()::text = user_id OR 
    auth.uid()::text = user_id::text
  );

-- Grant all permissions to authenticated users
GRANT ALL ON content_items TO authenticated;
GRANT ALL ON content_items TO anon;

-- Test query to see what would match
SELECT 'Test query - this should show content for current user:' as debug_step;
SELECT id, user_id, title, platform, created_at
FROM content_items 
WHERE auth.uid()::text = user_id OR auth.uid()::text = user_id::text
LIMIT 5;

SELECT 'Content items RLS policies recreated with debugging!' as status;


