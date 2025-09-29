-- Final Database Setup - Create working tables now that auth is fixed
-- Run this in Supabase SQL Editor

-- Create the basic tables we need (without problematic triggers)
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

-- Create user_kpis table
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

-- Create user_configs table
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_kpis TO authenticated;
GRANT ALL ON user_configs TO authenticated;

-- Create a simple function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_user_kpis_updated_at ON user_kpis;
DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_kpis_updated_at
    BEFORE UPDATE ON user_kpis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configs_updated_at
    BEFORE UPDATE ON user_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Database tables created successfully! Signup process should now work smoothly.' as status;