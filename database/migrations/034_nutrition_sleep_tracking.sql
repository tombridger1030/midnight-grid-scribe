-- Nutrition & Sleep Daily Tracking Migration
-- Creates daily_nutrition and daily_sleep tables
-- Also re-creates missing tables from 033 if they don't exist

-- ============================================
-- 1. RECREATE MISSING TABLES FROM 033
-- (idempotent - won't fail if already exist)
-- ============================================

-- Training Types
CREATE TABLE IF NOT EXISTS training_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#FF073A',
  icon TEXT DEFAULT '💪',
  counts_toward_target BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE training_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "training_types_select" ON training_types FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "training_types_insert" ON training_types FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "training_types_update" ON training_types FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "training_types_delete" ON training_types FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_training_types_user ON training_types (user_id);

-- Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_type_id UUID NOT NULL REFERENCES training_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "training_sessions_select" ON training_sessions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "training_sessions_insert" ON training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "training_sessions_update" ON training_sessions FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "training_sessions_delete" ON training_sessions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_date ON training_sessions (user_id, date);

-- Books
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  book_type TEXT NOT NULL CHECK (book_type IN ('physical', 'ebook', 'audiobook')),
  total_pages INT,
  current_page INT DEFAULT 0,
  percent_complete DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'reading' CHECK (status IN ('reading', 'completed', 'abandoned', 'paused')),
  started_at DATE DEFAULT CURRENT_DATE,
  completed_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "books_select" ON books FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "books_insert" ON books FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "books_update" ON books FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "books_delete" ON books FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_books_user ON books (user_id);
CREATE INDEX IF NOT EXISTS idx_books_user_status ON books (user_id, status);

-- Book Progress
CREATE TABLE IF NOT EXISTS book_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pages_read INT DEFAULT 0,
  percent_delta DECIMAL DEFAULT 0,
  page_at INT,
  percent_at DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, date)
);

ALTER TABLE book_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "book_progress_select" ON book_progress FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "book_progress_insert" ON book_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "book_progress_update" ON book_progress FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "book_progress_delete" ON book_progress FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_book_progress_user ON book_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_book_progress_user_date ON book_progress (user_id, date);

-- ============================================
-- 2. DAILY NUTRITION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS daily_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Breakfast
  breakfast_calories INT DEFAULT 0,
  breakfast_protein INT DEFAULT 0,
  -- Lunch
  lunch_calories INT DEFAULT 0,
  lunch_protein INT DEFAULT 0,
  -- Dinner
  dinner_calories INT DEFAULT 0,
  dinner_protein INT DEFAULT 0,
  -- Snacks
  snacks_calories INT DEFAULT 0,
  snacks_protein INT DEFAULT 0,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_nutrition ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "daily_nutrition_select" ON daily_nutrition FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "daily_nutrition_insert" ON daily_nutrition FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "daily_nutrition_update" ON daily_nutrition FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "daily_nutrition_delete" ON daily_nutrition FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user ON daily_nutrition (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_date ON daily_nutrition (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_date ON daily_nutrition (date);

-- ============================================
-- 3. DAILY SLEEP TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS daily_sleep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_time TIME, -- Bedtime (e.g., 22:30)
  wake_time TIME,  -- Wake time (e.g., 06:30)
  hours DECIMAL(4,2), -- Total sleep hours
  quality INT CHECK (quality >= 1 AND quality <= 5), -- Optional 1-5 rating
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_sleep ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "daily_sleep_select" ON daily_sleep FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "daily_sleep_insert" ON daily_sleep FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "daily_sleep_update" ON daily_sleep FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "daily_sleep_delete" ON daily_sleep FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_daily_sleep_user ON daily_sleep (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_sleep_user_date ON daily_sleep (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_sleep_date ON daily_sleep (date);

-- ============================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_nutrition_updated_at ON daily_nutrition;
CREATE TRIGGER trg_daily_nutrition_updated_at
  BEFORE UPDATE ON daily_nutrition
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_sleep_updated_at ON daily_sleep;
CREATE TRIGGER trg_daily_sleep_updated_at
  BEFORE UPDATE ON daily_sleep
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_training_types_updated_at ON training_types;
CREATE TRIGGER trg_training_types_updated_at
  BEFORE UPDATE ON training_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 5. ADD KPI_TYPE COLUMNS IF MISSING
-- ============================================
DO $$ BEGIN
  ALTER TABLE user_kpis ADD COLUMN IF NOT EXISTS auto_sync_source TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE user_kpis ADD COLUMN IF NOT EXISTS kpi_type TEXT DEFAULT 'counter';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Get weekly nutrition totals
CREATE OR REPLACE FUNCTION get_weekly_nutrition(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_calories BIGINT,
  total_protein BIGINT,
  avg_daily_calories NUMERIC,
  avg_daily_protein NUMERIC,
  days_tracked BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(breakfast_calories + lunch_calories + dinner_calories + snacks_calories) as total_calories,
    SUM(breakfast_protein + lunch_protein + dinner_protein + snacks_protein) as total_protein,
    ROUND(AVG(breakfast_calories + lunch_calories + dinner_calories + snacks_calories), 0) as avg_daily_calories,
    ROUND(AVG(breakfast_protein + lunch_protein + dinner_protein + snacks_protein), 0) as avg_daily_protein,
    COUNT(*) as days_tracked
  FROM daily_nutrition
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get weekly sleep stats
CREATE OR REPLACE FUNCTION get_weekly_sleep(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_hours NUMERIC,
  avg_hours NUMERIC,
  days_tracked BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(hours) as total_hours,
    ROUND(AVG(hours), 2) as avg_hours,
    COUNT(*) as days_tracked
  FROM daily_sleep
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Done!
-- ============================================
