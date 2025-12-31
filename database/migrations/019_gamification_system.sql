-- Solo Leveling Gamification System Migration
-- Migration: 019_gamification_system.sql
-- Purpose: Add RPG-style character progression, quest system, and achievements to Noctisium
-- Compatible with existing database structure and maintains backward compatibility

-- Begin transaction for safety
BEGIN;

-- 1. Create new gamification tables

-- Character stats for RPG-style progression
CREATE TABLE IF NOT EXISTS character_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_name VARCHAR(50) NOT NULL CHECK (stat_name IN ('strength', 'intelligence', 'wisdom', 'constitution', 'agility')),
  current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
  current_xp INTEGER DEFAULT 0 CHECK (current_xp >= 0),
  xp_to_next_level INTEGER DEFAULT 100 CHECK (xp_to_next_level > 0),
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  stat_color VARCHAR(7) DEFAULT '#5FE3B3',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stat_name)
);

-- Training quests system (replaces KPI tracking interface)
CREATE TABLE IF NOT EXISTS training_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_type VARCHAR(50) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'breakthrough', 'achievement')),
  kpi_mapping VARCHAR(50), -- links to original KPI system
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  current_value INTEGER DEFAULT 0 CHECK (current_value >= 0),
  rr_reward INTEGER NOT NULL CHECK (rr_reward >= 0),
  stat_xp_reward JSONB DEFAULT '{}'::jsonb, -- {"strength": 10, "intelligence": 5}
  is_completed BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Achievements and milestones
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  rr_reward INTEGER DEFAULT 0 CHECK (rr_reward >= 0),
  stat_rewards JSONB DEFAULT '{}'::jsonb,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_hidden BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0)
);

-- Character progression events (for animations/notifications)
CREATE TABLE IF NOT EXISTS progression_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('level_up', 'rank_up', 'achievement_unlock', 'breakthrough', 'critical_hit')),
  event_data JSONB DEFAULT '{}'::jsonb,
  is_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quest completion history
CREATE TABLE IF NOT EXISTS quest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES training_quests(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_bonus INTEGER DEFAULT 0 CHECK (completion_bonus >= 0), -- for critical hits
  streak_multiplier INTEGER DEFAULT 1 CHECK (streak_multiplier >= 1)
);

-- Character appearance customization
CREATE TABLE IF NOT EXISTS character_appearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_rank VARCHAR(20) NOT NULL DEFAULT 'novice',
  aura_intensity INTEGER DEFAULT 0 CHECK (aura_intensity >= 0 AND aura_intensity <= 100),
  selected_theme VARCHAR(50) DEFAULT 'default',
  unlocked_themes JSONB DEFAULT '["default"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Add gamification fields to existing tables

-- Check if user_ranks table exists, create if it doesn't (for backward compatibility)
CREATE TABLE IF NOT EXISTS user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_rank VARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (current_rank IN ('bronze', 'gold', 'platinum', 'diamond', 'grandmaster')),
  rr_points INTEGER DEFAULT 100 CHECK (rr_points >= 0),
  total_weeks INTEGER DEFAULT 0 CHECK (total_weeks >= 0),
  weeks_completed INTEGER DEFAULT 0 CHECK (weeks_completed >= 0),
  last_assessment TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add gamification columns to user_ranks if they don't exist
DO $$
BEGIN
  -- Add character_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ranks' AND column_name = 'character_level'
  ) THEN
    ALTER TABLE user_ranks ADD COLUMN character_level INTEGER DEFAULT 1 CHECK (character_level >= 1);
  END IF;

  -- Add total_stat_xp if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ranks' AND column_name = 'total_stat_xp'
  ) THEN
    ALTER TABLE user_ranks ADD COLUMN total_stat_xp INTEGER DEFAULT 0 CHECK (total_stat_xp >= 0);
  END IF;

  -- Add current_streak_days if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ranks' AND column_name = 'current_streak_days'
  ) THEN
    ALTER TABLE user_ranks ADD COLUMN current_streak_days INTEGER DEFAULT 0 CHECK (current_streak_days >= 0);
  END IF;

  -- Add longest_streak_days if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ranks' AND column_name = 'longest_streak_days'
  ) THEN
    ALTER TABLE user_ranks ADD COLUMN longest_streak_days INTEGER DEFAULT 0 CHECK (longest_streak_days >= 0);
  END IF;

  -- Add critical_hit_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ranks' AND column_name = 'critical_hit_count'
  ) THEN
    ALTER TABLE user_ranks ADD COLUMN critical_hit_count INTEGER DEFAULT 0 CHECK (critical_hit_count >= 0);
  END IF;
END $$;

-- Add quest mapping columns to user_kpis if they don't exist
DO $$
BEGIN
  -- Add quest_mapping if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_kpis' AND column_name = 'quest_mapping'
  ) THEN
    ALTER TABLE user_kpis ADD COLUMN quest_mapping VARCHAR(50);
  END IF;

  -- Add stat_mapping if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_kpis' AND column_name = 'stat_mapping'
  ) THEN
    ALTER TABLE user_kpis ADD COLUMN stat_mapping VARCHAR(50) CHECK (stat_mapping IN ('strength', 'intelligence', 'wisdom', 'constitution', 'agility'));
  END IF;

  -- Add is_quest_active if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_kpis' AND column_name = 'is_quest_active'
  ) THEN
    ALTER TABLE user_kpis ADD COLUMN is_quest_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 3. Enable Row Level Security (RLS) for new tables
ALTER TABLE character_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_appearance ENABLE ROW LEVEL SECURITY;

-- Enable RLS for user_ranks if it was just created
ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for new tables

-- Character stats policies
CREATE POLICY "Users can view own character stats" ON character_stats
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own character stats" ON character_stats
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own character stats" ON character_stats
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own character stats" ON character_stats
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Training quests policies
CREATE POLICY "Users can view own training quests" ON training_quests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own training quests" ON training_quests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own training quests" ON training_quests
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own training quests" ON training_quests
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own achievements" ON achievements
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own achievements" ON achievements
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Progression events policies
CREATE POLICY "Users can view own progression events" ON progression_events
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own progression events" ON progression_events
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own progression events" ON progression_events
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Quest history policies
CREATE POLICY "Users can view own quest history" ON quest_history
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own quest history" ON quest_history
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Character appearance policies
CREATE POLICY "Users can view own character appearance" ON character_appearance
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own character appearance" ON character_appearance
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own character appearance" ON character_appearance
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- User ranks policies
CREATE POLICY "Users can view own user rank" ON user_ranks
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own user rank" ON user_ranks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own user rank" ON user_ranks
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_character_stats_user_id ON character_stats (user_id);
CREATE INDEX IF NOT EXISTS idx_character_stats_user_stat ON character_stats (user_id, stat_name);

CREATE INDEX IF NOT EXISTS idx_training_quests_user_id ON training_quests (user_id);
CREATE INDEX IF NOT EXISTS idx_training_quests_type ON training_quests (quest_type);
CREATE INDEX IF NOT EXISTS idx_training_quests_completed ON training_quests (is_completed);
CREATE INDEX IF NOT EXISTS idx_training_quests_expires ON training_quests (expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements (achievement_key);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements (rarity);

CREATE INDEX IF NOT EXISTS idx_progression_events_user_id ON progression_events (user_id);
CREATE INDEX IF NOT EXISTS idx_progression_events_viewed ON progression_events (is_viewed);
CREATE INDEX IF NOT EXISTS idx_progression_events_type ON progression_events (event_type);

CREATE INDEX IF NOT EXISTS idx_quest_history_user_id ON quest_history (user_id);
CREATE INDEX IF NOT EXISTS idx_quest_history_quest_id ON quest_history (quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_history_completed ON quest_history (completed_at);

CREATE INDEX IF NOT EXISTS idx_character_appearance_user_id ON character_appearance (user_id);

CREATE INDEX IF NOT EXISTS idx_user_ranks_user_id ON user_ranks (user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranks_rank ON user_ranks (current_rank);
CREATE INDEX IF NOT EXISTS idx_user_ranks_rr ON user_ranks (rr_points);

-- 6. Create utility functions and triggers

-- Function to calculate XP needed for next level (exponential scaling)
CREATE OR REPLACE FUNCTION calculate_xp_for_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- XP formula: 100 * (1.5 ^ (level - 1)), rounded to nearest 50
  RETURN GREATEST(100, ROUND(POWER(1.5, current_level - 1) * 100 / 50) * 50);
END;
$$ LANGUAGE plpgsql;

-- Function to handle stat XP gain and level ups
CREATE OR REPLACE FUNCTION handle_stat_xp_gain()
RETURNS TRIGGER AS $$
DECLARE
  xp_per_level INTEGER;
BEGIN
  -- Calculate XP needed for next level
  xp_per_level := calculate_xp_for_next_level(NEW.current_level);

  -- Handle level up if enough XP gained
  WHILE NEW.current_xp >= xp_per_level LOOP
    NEW.current_xp := NEW.current_xp - xp_per_level;
    NEW.current_level := NEW.current_level + 1;
    NEW.xp_to_next_level := calculate_xp_for_next_level(NEW.current_level);

    -- Create progression event for level up
    INSERT INTO progression_events (user_id, event_type, event_data)
    VALUES (
      NEW.user_id,
      'level_up',
      jsonb_build_object(
        'stat_name', NEW.stat_name,
        'new_level', NEW.current_level,
        'old_level', NEW.current_level - 1,
        'timestamp', NOW()
      )
    );

    -- Update xp_per_level for next iteration
    xp_per_level := NEW.xp_to_next_level;
  END LOOP;

  NEW.xp_to_next_level := xp_per_level;
  NEW.total_xp := NEW.total_xp + (OLD.current_xp - NEW.current_xp);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic level up handling
DROP TRIGGER IF EXISTS handle_stat_xp_trigger ON character_stats;
CREATE TRIGGER handle_stat_xp_trigger
  BEFORE UPDATE ON character_stats
  FOR EACH ROW
  WHEN (NEW.current_xp != OLD.current_xp)
  EXECUTE FUNCTION handle_stat_xp_gain();

-- Function to initialize character stats for new users
CREATE OR REPLACE FUNCTION initialize_character_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default character stats for new user
  INSERT INTO character_stats (user_id, stat_name, current_level, current_xp, xp_to_next_level, total_xp, stat_color)
  VALUES
    (NEW.id, 'strength', 1, 0, calculate_xp_for_next_level(1), 0, '#FF6B6B'),
    (NEW.id, 'intelligence', 1, 0, calculate_xp_for_next_level(1), 0, '#4ECDC4'),
    (NEW.id, 'wisdom', 1, 0, calculate_xp_for_next_level(1), 0, '#45B7D1'),
    (NEW.id, 'constitution', 1, 0, calculate_xp_for_next_level(1), 0, '#96CEB4'),
    (NEW.id, 'agility', 1, 0, calculate_xp_for_next_level(1), 0, '#FFEAA7'),
    (NEW.id, 'all_stats', 1, 0, calculate_xp_for_next_level(1), 0, '#DDA0DD');

  -- Initialize character appearance
  INSERT INTO character_appearance (user_id, current_rank, aura_intensity, selected_theme, unlocked_themes)
  VALUES (NEW.id, 'bronze', 0, 'default', '["default"]'::jsonb);

  -- Initialize user rank if not exists
  INSERT INTO user_ranks (user_id, current_rank, rr_points, total_weeks, weeks_completed, last_assessment)
  VALUES (NEW.id, 'bronze', 100, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize character stats for new users
-- Note: This would need to be attached to auth.users table if possible
-- For now, we'll handle initialization in the application layer

-- 7. Grant permissions to authenticated users
GRANT ALL ON character_stats TO authenticated;
GRANT ALL ON training_quests TO authenticated;
GRANT ALL ON achievements TO authenticated;
GRANT ALL ON progression_events TO authenticated;
GRANT ALL ON quest_history TO authenticated;
GRANT ALL ON character_appearance TO authenticated;
GRANT ALL ON user_ranks TO authenticated;

-- 8. Create helpful views for common queries

-- View for character progression summary
CREATE OR REPLACE VIEW character_progression_summary AS
SELECT
  u.id as user_id,
  u.username,
  ur.current_rank,
  ur.rr_points,
  ur.character_level,
  ur.total_stat_xp,
  ur.current_streak_days,
  ur.longest_streak_days,
  ca.aura_intensity,
  ca.selected_theme,
  COUNT(DISTINCT a.id) as achievement_count,
  COUNT(DISTINCT qh.id) as completed_quests_count
FROM auth.users u
LEFT JOIN user_ranks ur ON u.id = ur.user_id
LEFT JOIN character_appearance ca ON u.id = ca.user_id
LEFT JOIN achievements a ON u.id = a.user_id
LEFT JOIN quest_history qh ON u.id = qh.user_id
GROUP BY u.id, u.username, ur.current_rank, ur.rr_points, ur.character_level,
         ur.total_stat_xp, ur.current_streak_days, ur.longest_streak_days,
         ca.aura_intensity, ca.selected_theme;

-- View for active quests with progress
CREATE OR REPLACE VIEW active_training_quests AS
SELECT
  tq.*,
  CASE
    WHEN tq.target_value > 0 THEN ROUND((tq.current_value::decimal / tq.target_value::decimal) * 100)
    ELSE 0
  END as completion_percentage,
  CASE
    WHEN tq.current_value >= tq.target_value THEN true
    ELSE false
  END as is_ready_to_complete
FROM training_quests tq
WHERE tq.is_completed = false
  AND (tq.expires_at IS NULL OR tq.expires_at > NOW());

-- 9. Insert default achievement definitions
-- This would typically be handled by the application, but we'll add some basics here

-- Note: Default achievements will be created by the application layer
-- as they need to be user-specific

-- Commit the transaction
COMMIT;

-- 10. Verification queries (run these to verify the migration was successful)
-- Uncomment for testing:
-- SELECT 'character_stats table created' as status FROM information_schema.tables WHERE table_name = 'character_stats';
-- SELECT 'training_quests table created' as status FROM information_schema.tables WHERE table_name = 'training_quests';
-- SELECT 'achievements table created' as status FROM information_schema.tables WHERE table_name = 'achievements';
-- SELECT 'progression_events table created' as status FROM information_schema.tables WHERE table_name = 'progression_events';
-- SELECT 'quest_history table created' as status FROM information_schema.tables WHERE table_name = 'quest_history';
-- SELECT 'character_appearance table created' as status FROM information_schema.tables WHERE table_name = 'character_appearance';

-- Success message
SELECT 'Gamification system migration completed successfully!' as status,
       'All tables, indexes, policies, and functions have been created.' as message;