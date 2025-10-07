-- Simple Database Setup to Fix 406 Errors
-- Run this in your Supabase SQL Editor
-- This creates the essential tables without complex RLS policies

-- 1. Create user profiles table with admin support
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  user_preferences JSONB DEFAULT '{
    "show_content_tab": true,
    "enabled_modules": ["dashboard", "kpis", "visualizer", "roadmap", "cash", "content"],
    "default_view": "dashboard",
    "theme_settings": {
      "terminal_style": "cyberpunk",
      "animation_enabled": true,
      "sound_enabled": false
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user configurations table (this fixes your 406 error)
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- 3. Create user KPIs table
CREATE TABLE IF NOT EXISTS user_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kpi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target DECIMAL NOT NULL,
  min_target DECIMAL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5FE3B3',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_average BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kpi_id)
);

-- 4. Create weekly KPIs table
CREATE TABLE IF NOT EXISTS weekly_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);

-- 5. Create weekly KPI entries table
CREATE TABLE IF NOT EXISTS weekly_kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  kpi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  current_value DECIMAL DEFAULT 0,
  target_value DECIMAL NOT NULL,
  min_target_value DECIMAL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5FE3B3',
  is_completed BOOLEAN DEFAULT false,
  completion_rate DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key, kpi_id)
);

-- 6. Create financial metrics table
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mrr DECIMAL DEFAULT 0,
  net_worth DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 7. Grant basic permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_configs TO authenticated;
GRANT ALL ON user_kpis TO authenticated;
GRANT ALL ON weekly_kpis TO authenticated;
GRANT ALL ON weekly_kpi_entries TO authenticated;
GRANT ALL ON financial_metrics TO authenticated;

-- 8. Create your admin profile (with proper UUID casting)
INSERT INTO user_profiles (id, username, display_name, is_admin, user_preferences, created_at, updated_at)
VALUES (
  '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid,
  'tombridger',
  'Tom Bridger',
  TRUE,
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
  is_admin = EXCLUDED.is_admin,
  updated_at = NOW();

-- 9. Create default KPIs for your account (with proper UUID casting)
INSERT INTO user_kpis (user_id, kpi_id, name, target, min_target, unit, category, color, sort_order, is_active)
VALUES
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid, 'strengthSessions', 'Strength Sessions', 3, 2, 'sessions', 'fitness', '#FF073A', 1, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid, 'bjjSessions', 'BJJ Sessions', 3, NULL, 'sessions', 'fitness', '#53B4FF', 2, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid, 'deepWorkHours', 'Deep Work Hours', 100, 80, 'hours', 'discipline', '#5FE3B3', 3, true),
  ('0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b'::uuid, 'recoverySessions', 'Recovery Sessions', 2, NULL, 'sessions', 'fitness', '#FFD700', 4, true)
ON CONFLICT (user_id, kpi_id) DO NOTHING;

-- 10. Create basic indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles (username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles (is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_key ON user_configs (user_id, config_key);
CREATE INDEX IF NOT EXISTS idx_user_kpis_user_id ON user_kpis (user_id);

SELECT 'Simple database setup completed! The 406 error should now be fixed.' as status;
