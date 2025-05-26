-- Corrected schema with UPDATE-only triggers
-- Goals table for monthly tracking
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL, -- unique goal identifier (e.g., 'echo-revenue')
  name TEXT NOT NULL,
  yearly_target NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('professional', 'fitness', 'financial', 'personal')),
  is_numeric BOOLEAN NOT NULL DEFAULT true,
  monthly JSONB DEFAULT '{}'::jsonb, -- e.g., {"Apr": 2024, "May": 120}
  monthly_targets JSONB DEFAULT '{}'::jsonb, -- e.g., {"Jun": {"target": 160000, "description": "CAD 160 000"}}
  current_total NUMERIC NOT NULL DEFAULT 0,
  progress_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- Financial metrics table for financial snapshot
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mrr NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Metrics table for daily tracking data
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- All metric values for the day
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Sprints table for sprint tracking
CREATE TABLE IF NOT EXISTS sprints (
  sprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  start_date TEXT NOT NULL, -- YYYY-MM-DD format
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roadmaps table for roadmap data
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  roadmap_id TEXT NOT NULL, -- e.g., 'echo', 'noctisium'
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id)
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate derived values when monthly data changes
CREATE OR REPLACE FUNCTION recalculate_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate for numeric goals
  IF NEW.is_numeric THEN
    -- Calculate current_total from monthly values
    -- The monthly JSONB structure is {"Jan": 100, "Feb": 200, ...}
    SELECT COALESCE(SUM(value::numeric), 0)
    INTO NEW.current_total
    FROM jsonb_each_text(NEW.monthly) AS month_data(month, value)
    WHERE value ~ '^[0-9]+(\.[0-9]+)?$';
    
    -- Calculate progress_pct
    IF NEW.yearly_target > 0 THEN
      NEW.progress_pct = LEAST(1.0, NEW.current_total / NEW.yearly_target);
    ELSE
      NEW.progress_pct = 0;
    END IF;
  ELSE
    NEW.current_total = 0;
    NEW.progress_pct = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at (ONLY on UPDATE, not INSERT)
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_metrics_updated_at ON financial_metrics;  
CREATE TRIGGER update_financial_metrics_updated_at
  BEFORE UPDATE ON financial_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics;
CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;
CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roadmaps_updated_at ON roadmaps;
CREATE TRIGGER update_roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for goal progress recalculation (ONLY on UPDATE, not INSERT)
DROP TRIGGER IF EXISTS recalculate_goal_progress_trigger ON goals;
CREATE TRIGGER recalculate_goal_progress_trigger
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_goal_progress(); 