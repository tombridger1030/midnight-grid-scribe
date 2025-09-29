-- NUCLEAR OPTION: Completely clean slate for existing Supabase project
-- This removes EVERYTHING that might be causing auth signup issues
-- Run this in your Supabase SQL Editor

-- 1. Drop all our custom tables completely
DROP TABLE IF EXISTS user_goals CASCADE;
DROP TABLE IF EXISTS user_kpis CASCADE;
DROP TABLE IF EXISTS user_configs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 2. Drop all custom functions that might interfere with auth
DROP FUNCTION IF EXISTS create_user_profile_and_defaults() CASCADE;
DROP FUNCTION IF EXISTS create_default_user_kpis(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. Drop any triggers on auth.users that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Check if there are any other custom triggers or functions
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- 5. List all functions in public schema (should be empty after cleanup)
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';

-- 6. List all triggers (should show none related to our tables)
SELECT
  event_object_table,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public';

-- 7. Now test if basic Supabase auth works without any custom database stuff
-- This should succeed if the project is healthy
SELECT 'Database completely cleaned. Try signup now.' as status;