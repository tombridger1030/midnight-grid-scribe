-- Test query to check if content_items have the correct user_id
-- Run this in Supabase SQL Editor

-- 1. Check if content_items table exists and has data
SELECT COUNT(*) as total_content_items
FROM content_items;

-- 2. Check content items for your user
SELECT id, title, platform, user_id, published_at
FROM content_items
WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
ORDER BY published_at DESC
LIMIT 10;

-- 3. Check if there are any content items with NULL or different user_id
SELECT id, title, platform, user_id, published_at
FROM content_items
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
ORDER BY published_at DESC
LIMIT 10;

-- 4. If you need to update all content to your user_id, run this:
-- UPDATE content_items
-- SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
-- WHERE user_id IS NULL;