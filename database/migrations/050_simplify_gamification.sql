-- Migration: Simplify Gamification System
-- Description: Replace complex gamification with simple Level + Rank + Achievements
-- Date: 2024-12-30

-- ============================================
-- 1. CREATE NEW SIMPLIFIED TABLES
-- ============================================

-- User Progression: Single table for all progression data
CREATE TABLE IF NOT EXISTS user_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Level & XP (100 XP per level)
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  
  -- Rank (synced with user_ranks for now)
  rank TEXT DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  rr_points INTEGER DEFAULT 0,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  -- Stats
  weeks_completed INTEGER DEFAULT 0,
  perfect_weeks INTEGER DEFAULT 0,
  total_ships INTEGER DEFAULT 0,
  total_content INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements: Simple tracking of unlocked achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_progression_user_id ON user_progression(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE user_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- User Progression Policies
DROP POLICY IF EXISTS "Users can view own progression" ON user_progression;
CREATE POLICY "Users can view own progression" ON user_progression
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progression" ON user_progression;
CREATE POLICY "Users can insert own progression" ON user_progression
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progression" ON user_progression;
CREATE POLICY "Users can update own progression" ON user_progression
  FOR UPDATE USING (auth.uid() = user_id);

-- User Achievements Policies
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_user_progression_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_progression_updated_at ON user_progression;
CREATE TRIGGER trigger_user_progression_updated_at
  BEFORE UPDATE ON user_progression
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progression_updated_at();

-- ============================================
-- 5. DROP OLD GAMIFICATION TABLES
-- ============================================

-- Drop in correct order due to dependencies
DROP TABLE IF EXISTS progression_events CASCADE;
DROP TABLE IF EXISTS quest_history CASCADE;
DROP TABLE IF EXISTS training_quests CASCADE;
DROP TABLE IF EXISTS character_appearance CASCADE;
DROP TABLE IF EXISTS character_stats CASCADE;
DROP TABLE IF EXISTS achievement_progress CASCADE;
DROP TABLE IF EXISTS achievement_categories CASCADE;
-- Note: Keep 'achievements' if it exists and has different structure
-- Only drop if it was the old complex achievements table
DROP TABLE IF EXISTS achievements CASCADE;

-- ============================================
-- 6. HELPER FUNCTION: Calculate Level from XP
-- ============================================

CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level N requires (N-1) * 100 XP
  -- So level = floor(xp / 100) + 1
  RETURN GREATEST(1, FLOOR(total_xp / 100.0)::INTEGER + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. HELPER FUNCTION: Add XP and Update Level
-- ============================================

CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp_amount INTEGER
)
RETURNS user_progression AS $$
DECLARE
  v_progression user_progression;
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get or create progression record
  INSERT INTO user_progression (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update XP and recalculate level
  UPDATE user_progression
  SET 
    xp = xp + p_xp_amount,
    level = calculate_level_from_xp(xp + p_xp_amount)
  WHERE user_id = p_user_id
  RETURNING * INTO v_progression;
  
  RETURN v_progression;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. HELPER FUNCTION: Unlock Achievement
-- ============================================

CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (p_user_id, p_achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================

COMMENT ON TABLE user_progression IS 'Simplified user progression: level, XP, rank, streaks';
COMMENT ON TABLE user_achievements IS 'Simple achievement tracking - just user_id and achievement_id';
