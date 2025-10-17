-- Fix RLS policies for content_items table
-- This ensures users can properly save content without RLS violations

-- Enable RLS on content_items if not already enabled
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own content items" ON content_items;
DROP POLICY IF EXISTS "Users can update own content items" ON content_items;
DROP POLICY IF EXISTS "Users can insert own content items" ON content_items;
DROP POLICY IF EXISTS "Users can delete own content items" ON content_items;

-- Create RLS policies for content_items (using TEXT user_id)
-- The application uses auth.uid()::text for user_id values
CREATE POLICY "Users can view own content items" ON content_items 
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own content items" ON content_items 
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own content items" ON content_items 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own content items" ON content_items 
  FOR DELETE USING (auth.uid()::text = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON content_items TO authenticated;

-- Verify current user access
SELECT 'Content Items RLS policies updated successfully!' as status;

-- Show current user info for debugging
SELECT 
  'Current user: ' || COALESCE(auth.uid()::text, 'NO USER') as user_info;


