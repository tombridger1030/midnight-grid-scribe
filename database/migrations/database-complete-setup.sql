-- Complete Multi-User Database Setup for Noctisium
-- Run this in your Supabase SQL Editor
-- This creates ALL missing tables needed for the application

-- 1. Create basic user tables (from database-final-setup.sql)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
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

CREATE TABLE IF NOT EXISTS user_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  kpi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target DECIMAL NOT NULL,
  min_target DECIMAL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5FE3B3',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kpi_id)
);

CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- 2. Create weekly KPI tables (missing from original setup)
CREATE TABLE IF NOT EXISTS weekly_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_key TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);

CREATE TABLE IF NOT EXISTS weekly_kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_key TEXT NOT NULL,
  date DATE NOT NULL,
  kpi_id TEXT NOT NULL,
  value DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_key, date, kpi_id)
);

-- 3. Create skill progression table with proper multi-user support
CREATE TABLE IF NOT EXISTS skill_progression (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_kpis_user_id ON user_kpis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_kpis_user_id ON weekly_kpis(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_kpis_week_key ON weekly_kpis(week_key);
CREATE INDEX IF NOT EXISTS idx_weekly_kpi_entries_user_id ON weekly_kpi_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_kpi_entries_week_key ON weekly_kpi_entries(week_key);
CREATE INDEX IF NOT EXISTS idx_skill_progression_user_id ON skill_progression(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_progression_updated_at ON skill_progression(updated_at);

-- 5. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create updated_at triggers for all tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_user_kpis_updated_at ON user_kpis;
DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;
DROP TRIGGER IF EXISTS update_weekly_kpis_updated_at ON weekly_kpis;
DROP TRIGGER IF EXISTS update_weekly_kpi_entries_updated_at ON weekly_kpi_entries;
DROP TRIGGER IF EXISTS skill_progression_updated_at_trigger ON skill_progression;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_kpis_updated_at
    BEFORE UPDATE ON user_kpis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configs_updated_at
    BEFORE UPDATE ON user_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_kpis_updated_at
    BEFORE UPDATE ON weekly_kpis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_kpi_entries_updated_at
    BEFORE UPDATE ON weekly_kpi_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER skill_progression_updated_at_trigger
    BEFORE UPDATE ON skill_progression
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Grant permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_kpis TO authenticated;
GRANT ALL ON user_configs TO authenticated;
GRANT ALL ON weekly_kpis TO authenticated;
GRANT ALL ON weekly_kpi_entries TO authenticated;
GRANT ALL ON skill_progression TO authenticated;

-- 8. Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

-- 9. Drop any existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can manage own configs" ON user_configs;
DROP POLICY IF EXISTS "Users can manage own weekly KPIs" ON weekly_kpis;
DROP POLICY IF EXISTS "Users can manage own weekly KPI entries" ON weekly_kpi_entries;
DROP POLICY IF EXISTS "Users can view their own skill progression" ON skill_progression;
DROP POLICY IF EXISTS "Users can insert their own skill progression" ON skill_progression;
DROP POLICY IF EXISTS "Users can update their own skill progression" ON skill_progression;
DROP POLICY IF EXISTS "Users can delete their own skill progression" ON skill_progression;

-- 10. Create RLS policies using auth.uid()
-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User KPIs policies
CREATE POLICY "Users can manage own KPIs" ON user_kpis FOR ALL USING (auth.uid() = user_id);

-- User configs policies
CREATE POLICY "Users can manage own configs" ON user_configs FOR ALL USING (auth.uid() = user_id);

-- Weekly KPIs policies
CREATE POLICY "Users can manage own weekly KPIs" ON weekly_kpis FOR ALL USING (auth.uid() = user_id);

-- Weekly KPI entries policies
CREATE POLICY "Users can manage own weekly KPI entries" ON weekly_kpi_entries FOR ALL USING (auth.uid() = user_id);

-- Skill progression policies
CREATE POLICY "Users can view their own skill progression" ON skill_progression FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own skill progression" ON skill_progression FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own skill progression" ON skill_progression FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own skill progression" ON skill_progression FOR DELETE USING (user_id = auth.uid());

-- 11. Create function to create default KPIs
CREATE OR REPLACE FUNCTION create_default_user_kpis(target_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_kpis (user_id, kpi_id, name, target, min_target, unit, category, color, sort_order)
  VALUES
    (target_user_id, 'strengthSessions', 'Strength Sessions', 3, 2, 'sessions', 'fitness', '#FF073A', 1),
    (target_user_id, 'bjjSessions', 'BJJ Sessions', 3, NULL, 'sessions', 'fitness', '#53B4FF', 2),
    (target_user_id, 'deepWorkHours', 'Deep Work Hours', 100, 80, 'hours', 'discipline', '#5FE3B3', 3),
    (target_user_id, 'recoverySessions', 'Recovery Sessions', 2, NULL, 'sessions', 'fitness', '#FFD700', 4)
  ON CONFLICT (user_id, kpi_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 12. Test that all tables are working
SELECT 'Complete multi-user database setup finished!' as status,
       (SELECT COUNT(*) FROM user_profiles) as user_profiles_count,
       (SELECT COUNT(*) FROM user_kpis) as user_kpis_count,
       (SELECT COUNT(*) FROM weekly_kpis) as weekly_kpis_count,
       (SELECT COUNT(*) FROM skill_progression) as skill_progression_count;