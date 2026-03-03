-- Skill progression row-based schema.
-- Note: a legacy JSON blob table may already exist in some environments.
-- This migration is intentionally non-destructive and idempotent.

CREATE TABLE IF NOT EXISTS skill_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_level NUMERIC NOT NULL DEFAULT 0,
  target_level NUMERIC NOT NULL DEFAULT 0,
  progress_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_progression_user_id
  ON skill_progression(user_id);

CREATE INDEX IF NOT EXISTS idx_skill_progression_user_skill
  ON skill_progression(user_id, skill_id);

ALTER TABLE skill_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own skill progression" ON skill_progression;
CREATE POLICY "Users can view own skill progression"
  ON skill_progression
  FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own skill progression" ON skill_progression;
CREATE POLICY "Users can insert own skill progression"
  ON skill_progression
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own skill progression" ON skill_progression;
CREATE POLICY "Users can update own skill progression"
  ON skill_progression
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own skill progression" ON skill_progression;
CREATE POLICY "Users can delete own skill progression"
  ON skill_progression
  FOR DELETE
  USING (auth.uid()::text = user_id);

DROP TRIGGER IF EXISTS update_skill_progression_updated_at ON skill_progression;
CREATE TRIGGER update_skill_progression_updated_at
  BEFORE UPDATE ON skill_progression
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
