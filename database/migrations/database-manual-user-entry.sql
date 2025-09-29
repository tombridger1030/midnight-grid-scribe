-- Manual entry to connect tombridger1030@gmail.com with existing data
-- Run this in your Supabase SQL Editor

-- 1. Create user profile for tombridger (if not exists)
INSERT INTO user_profiles (id, username, display_name, user_preferences, created_at, updated_at)
VALUES (
  '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b',
  'tombridger',
  'Tom Bridger',
  '{
    "show_content_tab": true,
    "enabled_modules": ["dashboard", "kpis", "visualizer", "roadmap", "cash", "content"],
    "default_view": "dashboard",
    "theme_settings": {
      "terminal_style": "cyberpunk",
      "animation_enabled": true,
      "sound_enabled": false
    }
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- 2. Create default KPIs for tombridger (if not exists)
INSERT INTO user_kpis (user_id, kpi_id, name, target, min_target, unit, category, color, sort_order, is_active)
VALUES
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'strengthSessions', 'Strength Sessions', 3, 2, 'sessions', 'fitness', '#FF073A', 1, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'bjjSessions', 'BJJ Sessions', 3, NULL, 'sessions', 'fitness', '#53B4FF', 2, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'deepWorkHours', 'Deep Work Hours', 100, 80, 'hours', 'discipline', '#5FE3B3', 3, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'recoverySessions', 'Recovery Sessions', 2, NULL, 'sessions', 'fitness', '#FFD700', 4, true)
ON CONFLICT (user_id, kpi_id) DO NOTHING;

-- 3. Update any existing data tables to connect with your user_id
-- (Only run the ones where you have existing data)

-- Update weekly_kpis table if it exists and has data
UPDATE weekly_kpis
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Update weekly_kpi_entries table if it exists and has data
UPDATE weekly_kpi_entries
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Update skill_progression table if it exists and has data
UPDATE skill_progression
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Update metrics table if it exists and has data
UPDATE metrics
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Update content_data table if it exists and has data
UPDATE content_data
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Update ships table if it exists and has data
UPDATE ships
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Update noctisium_events table if it exists and has data
UPDATE noctisium_events
SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
WHERE user_id IS NULL OR user_id != '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- 4. Verification queries - run these to check everything worked
SELECT 'User Profile Created' as status, id, username, display_name
FROM user_profiles
WHERE id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

SELECT 'Default KPIs Created' as status, COUNT(*) as kpi_count
FROM user_kpis
WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Show data migration results (will show 0 if tables don't exist, which is fine)
SELECT 'Data Migration Results' as status,
  (SELECT COUNT(*) FROM weekly_kpis WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b') as weekly_kpis_count,
  (SELECT COUNT(*) FROM skill_progression WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b') as skills_count;