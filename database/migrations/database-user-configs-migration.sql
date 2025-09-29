-- User configs table migration
-- This table is needed for the userStorage.setUserConfig/getUserConfig methods
-- Run this in your Supabase SQL Editor

-- Create user_configs table for storing user preferences and other config data
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- Note: RLS (Row Level Security) can be added later if needed
-- For now, keeping it simple to match existing schema pattern

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;
CREATE TRIGGER update_user_configs_updated_at
    BEFORE UPDATE ON user_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: Permissions will be handled by Supabase's default settings
