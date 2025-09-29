-- Noctisium Multi-User Database Schema Migration
-- Run this in your Supabase SQL Editor

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

-- 1a. Ensure username column exists on pre-existing tables
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

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

-- 4. Create user goals table (replacing the localStorage goals)
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

-- 5. Add user_id to existing tables (if they exist)
-- Weekly KPIs
ALTER TABLE IF EXISTS weekly_kpis ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Metrics
ALTER TABLE IF EXISTS metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Noctisium events
ALTER TABLE IF EXISTS noctisium_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ships
ALTER TABLE IF EXISTS ships ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Content data
ALTER TABLE IF EXISTS content_data ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Skill progression
ALTER TABLE IF EXISTS skill_progression ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kpis_user_id ON user_kpis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- 7. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for updated_at (idempotent)
-- Drop existing triggers if they already exist to avoid duplicate errors
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;
DROP TRIGGER IF EXISTS update_user_kpis_updated_at ON user_kpis;
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_configs_updated_at BEFORE UPDATE ON user_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_kpis_updated_at BEFORE UPDATE ON user_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User configs policies
CREATE POLICY "Users can manage own configs" ON user_configs FOR ALL USING (auth.uid() = user_id);

-- User KPIs policies
CREATE POLICY "Users can manage own KPIs" ON user_kpis FOR ALL USING (auth.uid() = user_id);

-- User goals policies
CREATE POLICY "Users can manage own goals" ON user_goals FOR ALL USING (auth.uid() = user_id);

-- 11. Insert default KPIs for existing/new users (function)
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

-- 12. Create trigger to auto-create profile and default KPIs for new users
CREATE OR REPLACE FUNCTION create_user_profile_and_defaults()
RETURNS trigger AS $$
BEGIN
  -- Create user profile with default username
  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default KPIs
  PERFORM create_default_user_kpis(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile_and_defaults();

-- 13. Migration utility: Create a default user and migrate existing data
-- (Run this manually if you have existing data)
/*
-- Create a default user account for existing data
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  'default-user-uuid-here', -- You'll need to generate a UUID
  'admin@noctisium.local',
  '$2a$10$dummy.hash.for.migration.user.account.here',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"noctisium","display_name":"Noctisium Admin"}'
)
ON CONFLICT (id) DO NOTHING;
*/

-- 14. Create admin functions for user management
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  users_with_kpis BIGINT,
  users_with_goals BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM user_profiles),
    (SELECT COUNT(*) FROM user_profiles WHERE updated_at > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(DISTINCT user_id) FROM user_kpis WHERE is_active = true),
    (SELECT COUNT(DISTINCT user_id) FROM user_goals WHERE is_active = true);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_configs TO authenticated;
GRANT ALL ON user_kpis TO authenticated;
GRANT ALL ON user_goals TO authenticated;

-- Done!
-- Next steps:
-- 1. Run this migration in Supabase
-- 2. Update your app to use the new authentication system
-- 3. Test user registration and login flows