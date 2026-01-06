-- Migration: Activity Categories Redesign
-- Purpose: Remove work/personal constraint and allow user-defined category IDs
-- Created: 2025-01-05

-- Step 1: Remove the check constraint that limits activity_type to 'work' or 'personal'
ALTER TABLE deep_work_sessions
DROP CONSTRAINT IF EXISTS check_activity_type;

-- Step 2: Add a comment to clarify that activity_type now stores category IDs
COMMENT ON COLUMN deep_work_sessions.activity_type IS
'Stores the category_id for user-defined activity categories (work, personal, or custom)';

-- Step 3: Create a better index for category-based queries
DROP INDEX IF EXISTS idx_deep_work_sessions_user_date_activity;
CREATE INDEX idx_deep_work_sessions_category
ON deep_work_sessions(user_id, activity_type, start_time DESC);

-- Step 4: Initialize default categories for existing users
-- This function creates default "work" and "personal" categories in user_configs
CREATE OR REPLACE FUNCTION initialize_default_categories_for_user(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  default_categories JSONB;
BEGIN
  default_categories := '{
    "categories": [
      {
        "id": "cat_work",
        "name": "Work",
        "color": "#5FE3B3",
        "icon": "briefcase",
        "sort_order": 1,
        "is_default": true
      },
      {
        "id": "cat_personal",
        "name": "Personal",
        "color": "#A855F7",
        "icon": "heart",
        "sort_order": 2,
        "is_default": true
      }
    ],
    "default_category_id": "cat_work"
  }'::jsonb;

  INSERT INTO user_configs (user_id, config_key, config_value)
  VALUES (user_uuid, 'activity_categories', default_categories)
  ON CONFLICT (user_id, config_key) DO NOTHING;

  RETURN default_categories;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Migrate existing sessions to use category IDs
-- This updates 'work' -> 'cat_work' and 'personal' -> 'cat_personal'
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- First, initialize default categories for all users who have sessions
  FOR user_record IN
    SELECT DISTINCT user_id FROM deep_work_sessions
  LOOP
    PERFORM initialize_default_categories_for_user(user_record.user_id);
  END LOOP;

  -- Now update existing sessions to use category IDs
  UPDATE deep_work_sessions
  SET activity_type = CASE
    WHEN activity_type = 'work' THEN 'cat_work'
    WHEN activity_type = 'personal' THEN 'cat_personal'
    ELSE activity_type
  END
  WHERE activity_type IN ('work', 'personal');
END $$;
