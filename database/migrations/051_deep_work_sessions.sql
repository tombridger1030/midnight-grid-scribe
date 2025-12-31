-- Migration: Deep Work Sessions Table
-- Purpose: Store deep work sessions in Supabase for cross-device sync
-- Created: 2024

-- Deep work sessions table
CREATE TABLE IF NOT EXISTS deep_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- Calculated when session ends
  is_active BOOLEAN DEFAULT TRUE,
  auto_stopped BOOLEAN DEFAULT FALSE, -- True if stopped by 4-hour limit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups by user and date
CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_user_date 
ON deep_work_sessions(user_id, start_time DESC);

-- Index for finding active sessions
CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_active 
ON deep_work_sessions(user_id, is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE deep_work_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/manage their own sessions
CREATE POLICY "Users can view own sessions" ON deep_work_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON deep_work_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON deep_work_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON deep_work_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deep_work_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_deep_work_sessions_updated_at ON deep_work_sessions;
CREATE TRIGGER trigger_deep_work_sessions_updated_at
  BEFORE UPDATE ON deep_work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_deep_work_sessions_updated_at();

-- Function to calculate duration when session ends
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
    NEW.is_active = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate duration
DROP TRIGGER IF EXISTS trigger_calculate_session_duration ON deep_work_sessions;
CREATE TRIGGER trigger_calculate_session_duration
  BEFORE UPDATE ON deep_work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();
