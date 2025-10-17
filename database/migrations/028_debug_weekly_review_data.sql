-- Debug weekly review data to understand why metrics show zeros
-- This helps identify if content exists and if metrics are properly attached

-- Show current user
SELECT 'Current user context:' as debug_step;
SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN 'NO_USER'
    ELSE auth.uid()::text 
  END as current_user_id;

-- Check if content_items exist
SELECT 'Content items in database:' as debug_step;
SELECT 
  COUNT(*) as total_content_items,
  MIN(published_at) as earliest_date,
  MAX(published_at) as latest_date,
  COUNT(DISTINCT platform) as platforms_count,
  STRING_AGG(DISTINCT platform, ', ') as platforms
FROM content_items;

-- Show recent content items with their details
SELECT 'Recent content items (last 10):' as debug_step;
SELECT 
  id,
  user_id,
  platform,
  format,
  title,
  published_at,
  created_at
FROM content_items 
ORDER BY published_at DESC, created_at DESC
LIMIT 10;

-- Check if content_metrics exist
SELECT 'Content metrics in database:' as debug_step;
SELECT 
  COUNT(*) as total_metrics,
  COUNT(DISTINCT content_id) as content_items_with_metrics,
  AVG(views) as avg_views,
  AVG(follows) as avg_follows,
  AVG(retention_ratio) as avg_retention
FROM content_metrics;

-- Show recent content with their metrics
SELECT 'Recent content with metrics:' as debug_step;
SELECT 
  ci.id as content_id,
  ci.platform,
  ci.title,
  ci.published_at,
  cm.views,
  cm.follows,
  cm.retention_ratio,
  cm.snapshot_date
FROM content_items ci
LEFT JOIN content_metrics cm ON ci.id = cm.content_id
ORDER BY ci.published_at DESC
LIMIT 10;

-- Check for this week's content (assuming current week)
SELECT 'Content for current week (last 7 days):' as debug_step;
SELECT 
  ci.id,
  ci.platform,
  ci.title,
  ci.published_at,
  cm.views,
  cm.follows,
  cm.retention_ratio
FROM content_items ci
LEFT JOIN content_metrics cm ON ci.id = cm.content_id
WHERE ci.published_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ci.published_at DESC;

-- Show any content without metrics
SELECT 'Content items without metrics:' as debug_step;
SELECT 
  ci.id,
  ci.platform,
  ci.title,
  ci.published_at
FROM content_items ci
LEFT JOIN content_metrics cm ON ci.id = cm.content_id
WHERE cm.content_id IS NULL
ORDER BY ci.published_at DESC;

-- Check table structures
SELECT 'Content items table structure:' as debug_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_items' 
ORDER BY ordinal_position;

SELECT 'Content metrics table structure:' as debug_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_metrics' 
ORDER BY ordinal_position;

SELECT 'Weekly review debugging completed!' as status;


