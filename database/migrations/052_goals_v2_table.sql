-- Migration: Create goals_v2 table for simplified roadmap system
-- This replaces the complex goals system with a simpler cascade model:
-- Yearly Goal → Auto Monthly Target (yearly/12) → Weekly KPI tracking

-- Drop old goals_v2 table if exists (clean slate)
DROP TABLE IF EXISTS goals_v2 CASCADE;

-- Create new simplified goals table
CREATE TABLE goals_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  yearly_target NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('kpi', 'content', 'manual')),
  connected_kpis TEXT[] DEFAULT '{}',
  manual_monthly JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_goals_v2_user ON goals_v2(user_id);
CREATE INDEX idx_goals_v2_source ON goals_v2(source);

-- Enable RLS
ALTER TABLE goals_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "goals_v2_select_policy" ON goals_v2;
DROP POLICY IF EXISTS "goals_v2_insert_policy" ON goals_v2;
DROP POLICY IF EXISTS "goals_v2_update_policy" ON goals_v2;
DROP POLICY IF EXISTS "goals_v2_delete_policy" ON goals_v2;

-- Create RLS policies
CREATE POLICY "goals_v2_select_policy" ON goals_v2 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_v2_insert_policy" ON goals_v2 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_v2_update_policy" ON goals_v2 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "goals_v2_delete_policy" ON goals_v2 
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON goals_v2 TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_goals_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goals_v2_updated_at_trigger ON goals_v2;
CREATE TRIGGER goals_v2_updated_at_trigger
  BEFORE UPDATE ON goals_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_v2_updated_at();

-- Log completion
DO $$ 
BEGIN 
  RAISE NOTICE 'goals_v2 table created successfully';
END $$;
