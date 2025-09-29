-- SAFE migration script - handles existing data without conflicts
-- Run this in your Supabase SQL Editor

-- 1. Create user profile for tombridger (safe upsert)
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

-- 2. Create default KPIs (safe - won't create duplicates)
INSERT INTO user_kpis (user_id, kpi_id, name, target, min_target, unit, category, color, sort_order, is_active)
VALUES
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'strengthSessions', 'Strength Sessions', 3, 2, 'sessions', 'fitness', '#FF073A', 1, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'bjjSessions', 'BJJ Sessions', 3, NULL, 'sessions', 'fitness', '#53B4FF', 2, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'deepWorkHours', 'Deep Work Hours', 100, 80, 'hours', 'discipline', '#5FE3B3', 3, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b', 'recoverySessions', 'Recovery Sessions', 2, NULL, 'sessions', 'fitness', '#FFD700', 4, true)
ON CONFLICT (user_id, kpi_id) DO NOTHING;

-- 3. SAFE data migration - only update records that don't belong to you yet
-- This will ONLY update records where user_id is NULL or different

-- Check what data exists first
SELECT 'BEFORE MIGRATION - Data Overview' as status;

-- Show current data distribution
SELECT 'weekly_kpis' as table_name,
       COALESCE(user_id::text, 'NULL') as user_id,
       COUNT(*) as record_count
FROM weekly_kpis
GROUP BY user_id
UNION ALL
SELECT 'skill_progression' as table_name,
       COALESCE(user_id::text, 'NULL') as user_id,
       COUNT(*) as record_count
FROM skill_progression
GROUP BY user_id;

-- Safe migration - only update orphaned records (where user_id is NULL)
DO $$
DECLARE
    updated_weekly_kpis INTEGER := 0;
    updated_weekly_entries INTEGER := 0;
    updated_skills INTEGER := 0;
    updated_metrics INTEGER := 0;
    updated_content INTEGER := 0;
    updated_ships INTEGER := 0;
    updated_events INTEGER := 0;
BEGIN
    -- Update weekly_kpis (only NULL user_ids)
    UPDATE weekly_kpis
    SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
    WHERE user_id IS NULL;
    GET DIAGNOSTICS updated_weekly_kpis = ROW_COUNT;

    -- Update weekly_kpi_entries (only NULL user_ids)
    UPDATE weekly_kpi_entries
    SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
    WHERE user_id IS NULL;
    GET DIAGNOSTICS updated_weekly_entries = ROW_COUNT;

    -- Update skill_progression (only NULL user_ids)
    UPDATE skill_progression
    SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
    WHERE user_id IS NULL;
    GET DIAGNOSTICS updated_skills = ROW_COUNT;

    -- Update metrics (only NULL user_ids, table may not exist)
    BEGIN
        UPDATE metrics
        SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
        WHERE user_id IS NULL;
        GET DIAGNOSTICS updated_metrics = ROW_COUNT;
    EXCEPTION
        WHEN undefined_table THEN
            updated_metrics := 0;
    END;

    -- Update content_data (only NULL user_ids, table may not exist)
    BEGIN
        UPDATE content_data
        SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
        WHERE user_id IS NULL;
        GET DIAGNOSTICS updated_content = ROW_COUNT;
    EXCEPTION
        WHEN undefined_table THEN
            updated_content := 0;
    END;

    -- Update ships (only NULL user_ids, table may not exist)
    BEGIN
        UPDATE ships
        SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
        WHERE user_id IS NULL;
        GET DIAGNOSTICS updated_ships = ROW_COUNT;
    EXCEPTION
        WHEN undefined_table THEN
            updated_ships := 0;
    END;

    -- Update noctisium_events (only NULL user_ids, table may not exist)
    BEGIN
        UPDATE noctisium_events
        SET user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
        WHERE user_id IS NULL;
        GET DIAGNOSTICS updated_events = ROW_COUNT;
    EXCEPTION
        WHEN undefined_table THEN
            updated_events := 0;
    END;

    -- Report results
    RAISE NOTICE 'MIGRATION COMPLETE:';
    RAISE NOTICE 'Updated weekly_kpis: %', updated_weekly_kpis;
    RAISE NOTICE 'Updated weekly_kpi_entries: %', updated_weekly_entries;
    RAISE NOTICE 'Updated skill_progression: %', updated_skills;
    RAISE NOTICE 'Updated metrics: %', updated_metrics;
    RAISE NOTICE 'Updated content_data: %', updated_content;
    RAISE NOTICE 'Updated ships: %', updated_ships;
    RAISE NOTICE 'Updated noctisium_events: %', updated_events;
END $$;

-- 4. Final verification - show your data
SELECT 'FINAL VERIFICATION - Your Data' as status;

SELECT 'User Profile' as item, username, display_name
FROM user_profiles
WHERE id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

SELECT 'Your KPIs' as item, COUNT(*) as kpi_count
FROM user_kpis
WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';

-- Show final data ownership
SELECT 'AFTER MIGRATION - Your Data Count' as status;

SELECT 'weekly_kpis' as table_name, COUNT(*) as your_records
FROM weekly_kpis
WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'
UNION ALL
SELECT 'skill_progression' as table_name, COUNT(*) as your_records
FROM skill_progression
WHERE user_id = '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b';