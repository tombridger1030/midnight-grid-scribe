-- Noctisium Multi-User Database Schema Migration (Safe Version)
-- Run this in your Supabase SQL Editor if the previous migration failed

-- First, let's create tables without triggers to avoid issues

-- 1. Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2. Create user configurations table
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- 3. Create custom KPIs table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kpi_id)
);

-- 4. Create user goals table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  yearly_target DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  is_numeric BOOLEAN DEFAULT true,
  monthly_values JSONB DEFAULT '{}'::jsonb,
  monthly_targets JSONB DEFAULT '{}'::jsonb,
  current_total DECIMAL DEFAULT 0,
  progress_pct DECIMAL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kpis_user_id ON user_kpis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- 6. Enable Row Level Security (RLS) - but make policies permissive for now
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- 7. Create simple RLS policies (more permissive to avoid auth issues)
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own configs" ON user_configs;
DROP POLICY IF EXISTS "Users can manage own KPIs" ON user_kpis;
DROP POLICY IF EXISTS "Users can manage own goals" ON user_goals;

-- Create new policies
CREATE POLICY "Users can manage own profile" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own configs" ON user_configs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own KPIs" ON user_kpis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON user_goals FOR ALL USING (auth.uid() = user_id);

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_configs TO authenticated;
GRANT ALL ON user_kpis TO authenticated;
GRANT ALL ON user_goals TO authenticated;

-- 9. Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at (drop first to avoid errors)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;
DROP TRIGGER IF EXISTS update_user_kpis_updated_at ON user_kpis;
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_configs_updated_at BEFORE UPDATE ON user_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_kpis_updated_at BEFORE UPDATE ON user_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. DO NOT create the auto-profile creation trigger yet - let's test without it first
-- We'll handle profile creation manually in the app for now

-- Test the setup
SELECT 'Database tables created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'user_%';