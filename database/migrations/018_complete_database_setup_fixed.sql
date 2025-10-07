-- Complete Database Setup for Noctisium with Admin Support (FIXED VERSION)
-- Run this in your Supabase SQL Editor
-- This creates ALL tables needed for the application including admin functionality

-- Drop and recreate tables if needed (comment out if you have data you want to keep)
-- DROP TABLE IF EXISTS user_configs CASCADE;
-- DROP TABLE IF EXISTS user_kpis CASCADE; 
-- DROP TABLE IF EXISTS user_profiles CASCADE;
-- DROP TABLE IF EXISTS weekly_kpis CASCADE;
-- DROP TABLE IF EXISTS weekly_kpi_entries CASCADE;

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

-- 2. Create user configurations table (needed for GitHub settings, etc.)
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

-- 6. Create content tables
CREATE TABLE IF NOT EXISTS content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key, platform, metric_type)
);

-- 7. Create platform specific metrics table
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL DEFAULT 0,
  week_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create financial metrics table
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mrr DECIMAL DEFAULT 0,
  net_worth DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- 10. Drop existing policies first (in case of conflicts)
DROP POLICY IF EXISTS "Users can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own configs" ON user_configs;
DROP POLICY IF EXISTS "Users can update own configs" ON user_configs;
DROP POLICY IF EXISTS "Users can insert own configs" ON user_configs;
DROP POLICY IF EXISTS "Users can delete own configs" ON user_configs;
DROP POLICY IF EXISTS "Users can view own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can update own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can insert own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can delete own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can view own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can update own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can insert own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can delete own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can view own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can update own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can insert own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can delete own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can view own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can update own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can insert own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can delete own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can view own platform metrics" ON platform_metrics;
DROP POLICY IF EXISTS "Users can update own platform metrics" ON platform_metrics;
DROP POLICY IF EXISTS "Users can insert own platform metrics" ON platform_metrics;
DROP POLICY IF EXISTS "Users can delete own platform metrics" ON platform_metrics;
DROP POLICY IF EXISTS "Users can view own financial metrics" ON financial_metrics;
DROP POLICY IF EXISTS "Users can update own financial metrics" ON financial_metrics;
DROP POLICY IF EXISTS "Users can insert own financial metrics" ON financial_metrics;
DROP POLICY IF EXISTS "Users can delete own financial metrics" ON financial_metrics;

-- 11. Create RLS policies with proper UUID casting
-- User profiles: users can read all profiles, but only update their own (unless admin)
CREATE POLICY "Users can view all user profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- User configs: users can only access their own configs
CREATE POLICY "Users can view own configs" ON user_configs FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own configs" ON user_configs FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own configs" ON user_configs FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own configs" ON user_configs FOR DELETE USING (auth.uid()::text = user_id::text);

-- Similar policies for other user-specific tables with UUID casting
CREATE POLICY "Users can view own KPIs" ON user_kpis FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own KPIs" ON user_kpis FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own KPIs" ON user_kpis FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own KPIs" ON user_kpis FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own weekly KPIs" ON weekly_kpis FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own weekly KPIs" ON weekly_kpis FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own weekly KPIs" ON weekly_kpis FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own weekly KPIs" ON weekly_kpis FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own weekly KPI entries" ON weekly_kpi_entries FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own weekly KPI entries" ON weekly_kpi_entries FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own weekly KPI entries" ON weekly_kpi_entries FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own weekly KPI entries" ON weekly_kpi_entries FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own content metrics" ON content_metrics FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own content metrics" ON content_metrics FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own content metrics" ON content_metrics FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own content metrics" ON content_metrics FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own platform metrics" ON platform_metrics FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own platform metrics" ON platform_metrics FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own platform metrics" ON platform_metrics FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own platform metrics" ON platform_metrics FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own financial metrics" ON financial_metrics FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own financial metrics" ON financial_metrics FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own financial metrics" ON financial_metrics FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own financial metrics" ON financial_metrics FOR DELETE USING (auth.uid()::text = user_id::text);

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles (username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles (is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_key ON user_configs (user_id, config_key);
CREATE INDEX IF NOT EXISTS idx_user_kpis_user_id ON user_kpis (user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_kpis_user_week ON weekly_kpis (user_id, week_key);
CREATE INDEX IF NOT EXISTS idx_weekly_kpi_entries_user_week ON weekly_kpi_entries (user_id, week_key);

-- 13. Grant permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_configs TO authenticated;
GRANT ALL ON user_kpis TO authenticated;
GRANT ALL ON weekly_kpis TO authenticated;
GRANT ALL ON weekly_kpi_entries TO authenticated;
GRANT ALL ON content_metrics TO authenticated;
GRANT ALL ON platform_metrics TO authenticated;
GRANT ALL ON financial_metrics TO authenticated;

-- 14. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 15. Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;
CREATE TRIGGER update_user_configs_updated_at
    BEFORE UPDATE ON user_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_kpis_updated_at ON user_kpis;
CREATE TRIGGER update_user_kpis_updated_at
    BEFORE UPDATE ON user_kpis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Database setup completed successfully! You can now use the application.' as status;
