-- Weekly KPIs Revamp Migration
-- Creates training_types, training_sessions, books, book_progress tables
-- Adds new columns to user_kpis
-- Drops unused weekly_kpi_targets table

-- ============================================
-- 1. Training Types (user-defined categories)
-- ============================================
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

-- RLS for training_types
ALTER TABLE training_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own training types" ON training_types 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own training types" ON training_types 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own training types" ON training_types 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own training types" ON training_types 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_types_user ON training_types (user_id);
CREATE INDEX IF NOT EXISTS idx_training_types_user_active ON training_types (user_id, is_active);

-- ============================================
-- 2. Training Sessions (individual entries)
-- ============================================
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_type_id UUID NOT NULL REFERENCES training_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for training_sessions
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own training sessions" ON training_sessions 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own training sessions" ON training_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own training sessions" ON training_sessions 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own training sessions" ON training_sessions 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_date ON training_sessions (user_id, date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions (date);

-- ============================================
-- 3. Books (reading list)
-- ============================================
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  book_type TEXT NOT NULL CHECK (book_type IN ('physical', 'ebook', 'audiobook')),
  total_pages INT, -- NULL for audiobooks
  current_page INT DEFAULT 0,
  percent_complete DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'reading' CHECK (status IN ('reading', 'completed', 'abandoned', 'paused')),
  started_at DATE DEFAULT CURRENT_DATE,
  completed_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for books
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own books" ON books 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own books" ON books 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own books" ON books 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own books" ON books 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_user ON books (user_id);
CREATE INDEX IF NOT EXISTS idx_books_user_status ON books (user_id, status);

-- ============================================
-- 4. Book Progress (daily reading log)
-- ============================================
CREATE TABLE IF NOT EXISTS book_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pages_read INT DEFAULT 0, -- Pages read that day (for physical/ebook)
  percent_delta DECIMAL DEFAULT 0, -- Percent progress that day (for audiobook)
  page_at INT, -- Page number after this session
  percent_at DECIMAL, -- Percent after this session
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, date)
);

-- RLS for book_progress
ALTER TABLE book_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own book progress" ON book_progress 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own book progress" ON book_progress 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own book progress" ON book_progress 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own book progress" ON book_progress 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_book_progress_user ON book_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_book_progress_book ON book_progress (book_id);
CREATE INDEX IF NOT EXISTS idx_book_progress_date ON book_progress (date);
CREATE INDEX IF NOT EXISTS idx_book_progress_user_date ON book_progress (user_id, date);

-- ============================================
-- 5. Add columns to user_kpis
-- ============================================
ALTER TABLE user_kpis 
ADD COLUMN IF NOT EXISTS auto_sync_source TEXT 
CHECK (auto_sync_source IN ('github_prs', 'deep_work_timer', 'youtube', 'instagram', 'twitter'));

ALTER TABLE user_kpis
ADD COLUMN IF NOT EXISTS kpi_type TEXT DEFAULT 'counter'
CHECK (kpi_type IN ('counter', 'hours', 'percentage', 'training', 'reading'));

-- ============================================
-- 6. Drop unused weekly_kpi_targets table
-- ============================================
DROP TABLE IF EXISTS weekly_kpi_targets;

-- ============================================
-- 7. Updated_at trigger for new tables
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_training_types_updated_at ON training_types;
CREATE TRIGGER trg_training_types_updated_at
  BEFORE UPDATE ON training_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 8. Function to initialize default training types for a user
-- ============================================
CREATE OR REPLACE FUNCTION initialize_default_training_types(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO training_types (user_id, name, color, icon, counts_toward_target, sort_order)
  VALUES 
    (p_user_id, 'Strength', '#FF073A', '💪', TRUE, 1),
    (p_user_id, 'BJJ', '#3B82F6', '🥋', TRUE, 2),
    (p_user_id, 'Cardio', '#F97316', '🏃', TRUE, 3),
    (p_user_id, 'Recovery', '#10B981', '🧘', FALSE, 4),
    (p_user_id, 'Yoga', '#8B5CF6', '🧘‍♀️', TRUE, 5)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Initialize training types for existing users
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM user_kpis WHERE user_id IS NOT NULL
  LOOP
    PERFORM initialize_default_training_types(r.user_id);
  END LOOP;
END $$;
