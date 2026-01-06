-- Daily Weight Tracking Migration
-- Creates daily_weight table for tracking weight in lbs

-- ============================================
-- 1. DAILY WEIGHT TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_lbs DECIMAL(5,2) NOT NULL, -- Weight in pounds with 2 decimal precision
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_weight ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "daily_weight_select" ON daily_weight FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "daily_weight_insert" ON daily_weight FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "daily_weight_update" ON daily_weight FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "daily_weight_delete" ON daily_weight FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_daily_weight_user ON daily_weight (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_weight_user_date ON daily_weight (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_weight_date ON daily_weight (date);

-- ============================================
-- 2. UPDATED_AT TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trg_daily_weight_updated_at ON daily_weight;
CREATE TRIGGER trg_daily_weight_updated_at
  BEFORE UPDATE ON daily_weight
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 3. HELPER FUNCTION: Get Weekly Weight Stats
-- ============================================
CREATE OR REPLACE FUNCTION get_weekly_weight(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  start_weight DECIMAL,
  end_weight DECIMAL,
  weight_change DECIMAL,
  avg_weight DECIMAL,
  min_weight DECIMAL,
  max_weight DECIMAL,
  days_tracked BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ordered_weights AS (
    SELECT
      date,
      weight_lbs
    FROM daily_weight
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
    ORDER BY date ASC
  ),
  weight_stats AS (
    SELECT
      (SELECT weight_lbs FROM ordered_weights LIMIT 1) as first_weight,
      (SELECT weight_lbs FROM ordered_weights ORDER BY date DESC LIMIT 1) as last_weight,
      AVG(weight_lbs) as avg_w,
      MIN(weight_lbs) as min_w,
      MAX(weight_lbs) as max_w,
      COUNT(*) as count
    FROM ordered_weights
  )
  SELECT
    ws.first_weight as start_weight,
    ws.last_weight as end_weight,
    ws.last_weight - ws.first_weight as weight_change,
    ROUND(ws.avg_w, 2) as avg_weight,
    ws.min_w as min_weight,
    ws.max_w as max_weight,
    ws.count as days_tracked
  FROM weight_stats ws;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Done!
-- ============================================
