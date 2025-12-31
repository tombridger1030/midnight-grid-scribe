-- Comprehensive Achievement System Migration
-- Migration: 020_comprehensive_achievements.sql
-- Purpose: Add comprehensive achievement definitions (65+ achievements) with all categories
-- Includes quest master, stat specialist, rank progression, streak champion, critical expert, and system mastery achievements

BEGIN;

-- Insert comprehensive achievement definitions
-- This migration populates the achievements table with all predefined achievements
-- Each achievement includes full metadata, rewards, and unlock conditions

-- ========================================
-- QUEST MASTER ACHIEVEMENTS (15 total)
-- ========================================

INSERT INTO achievements (
  achievement_key, title, description, icon_url, rarity, rr_reward, stat_rewards, is_hidden, display_order
) VALUES
-- First achievements
('first_quest', 'First Steps', 'Complete your first training quest', '🚶', 'common', 10, '{"constitution": 5}', false, 1),
('first_level_up', 'Growing Stronger', 'Level up any stat for the first time', '⬆️', 'common', 15, '{"all_stats": 3}', false, 2),

-- Quest progression achievements
('quest_enthusiast', 'Quest Enthusiast', 'Complete 10 training quests', '📋', 'common', 25, '{"agility": 10, "constitution": 5}', false, 10),
('quest_master', 'Quest Master', 'Complete 50 training quests', '🏆', 'rare', 100, '{"all_stats": 20}', false, 11),
('quest_legend', 'Quest Legend', 'Complete 200 training quests', '👑', 'epic', 500, '{"all_stats": 50}', false, 12),
('quest_demon', 'Quest Demon', 'Complete 1,000 training quests', '👹', 'legendary', 2000, '{"all_stats": 200}', false, 13),

-- Perfect completion achievements
('perfect_week', 'Perfect Week', 'Complete all daily quests for an entire week', '🗓️', 'rare', 75, '{"wisdom": 25, "constitution": 15}', false, 14),
('perfect_month', 'Perfect Month', 'Complete all daily quests for an entire month', '📅', 'epic', 300, '{"all_stats": 40}', false, 15),

-- Streak achievements
('quest_streak_7', 'Week Warrior', 'Maintain a 7-day quest completion streak', '🔥', 'rare', 50, '{"constitution": 20, "wisdom": 10}', false, 16),
('quest_streak_30', 'Month Warrior', 'Maintain a 30-day quest completion streak', '🔥', 'epic', 200, '{"constitution": 50, "wisdom": 25}', false, 17),
('quest_streak_100', 'Century Warrior', 'Maintain a 100-day quest completion streak', '🔥', 'legendary', 750, '{"all_stats": 100}', false, 18),

-- Quest type specialists
('daily_master', 'Daily Master', 'Complete 100 daily quests', '☀️', 'epic', 400, '{"agility": 60, "intelligence": 30}', false, 19),
('weekly_champion', 'Weekly Champion', 'Complete 50 weekly quests', '🏅', 'epic', 350, '{"wisdom": 50, "intelligence": 35}', false, 20),
('breakthrough_hunter', 'Breakthrough Hunter', 'Complete 25 breakthrough quests', '⚡', 'rare', 150, '{"all_stats": 25}', false, 21),
('quest_variety', 'Quest Variety', 'Complete at least 5 of each quest type', '🌈', 'rare', 120, '{"all_stats": 15}', false, 22),

-- Hidden quest achievements
('speed_quester', 'Speed Quester', 'Complete a quest within 1 hour of it being assigned', '⚡', 'rare', 80, '{"agility": 40}', true, 23),

-- ========================================
-- STAT SPECIALIST ACHIEVEMENTS (15 total)
-- ========================================

-- Strength progression
('strength_apprentice', 'Strength Apprentice', 'Reach level 5 in Strength', '💪', 'common', 30, '{"strength": 15}', false, 30),
('strength_master', 'Strength Master', 'Reach level 10 in Strength', '🏋️', 'rare', 100, '{"strength": 50}', false, 31),
('strength_legend', 'Strength Legend', 'Reach level 25 in Strength', '🦾', 'epic', 300, '{"strength": 150}', false, 32),

-- Intelligence progression
('intelligence_apprentice', 'Intelligence Apprentice', 'Reach level 5 in Intelligence', '🧠', 'common', 30, '{"intelligence": 15}', false, 33),
('intelligence_master', 'Intelligence Master', 'Reach level 10 in Intelligence', '🎓', 'rare', 100, '{"intelligence": 50}', false, 34),
('intelligence_legend', 'Intelligence Legend', 'Reach level 25 in Intelligence', '🔬', 'epic', 300, '{"intelligence": 150}', false, 35),

-- Wisdom progression
('wisdom_apprentice', 'Wisdom Apprentice', 'Reach level 5 in Wisdom', '📚', 'common', 30, '{"wisdom": 15}', false, 36),
('wisdom_master', 'Wisdom Master', 'Reach level 10 in Wisdom', '🦉', 'rare', 100, '{"wisdom": 50}', false, 37),
('wisdom_legend', 'Wisdom Legend', 'Reach level 25 in Wisdom', '🧘', 'epic', 300, '{"wisdom": 150}', false, 38),

-- Constitution progression
('constitution_apprentice', 'Constitution Apprentice', 'Reach level 5 in Constitution', '🛡️', 'common', 30, '{"constitution": 15}', false, 39),
('constitution_master', 'Constitution Master', 'Reach level 10 in Constitution', '⚡', 'rare', 100, '{"constitution": 50}', false, 40),
('constitution_legend', 'Constitution Legend', 'Reach level 25 in Constitution', '🏰', 'epic', 300, '{"constitution": 150}', false, 41),

-- Agility progression
('agility_apprentice', 'Agility Apprentice', 'Reach level 5 in Agility', '🏃', 'common', 30, '{"agility": 15}', false, 42),
('agility_master', 'Agility Master', 'Reach level 10 in Agility', '🤸', 'rare', 100, '{"agility": 50}', false, 43),
('agility_legend', 'Agility Legend', 'Reach level 25 in Agility', '🦘', 'epic', 300, '{"agility": 150}', false, 44),

-- ========================================
-- BALANCED BUILD ACHIEVEMENTS (5 total)
-- ========================================

('balanced_build', 'Balanced Build', 'Reach level 10 in all stats', '⚖️', 'epic', 500, '{"all_stats": 60}', false, 45),
('true_master', 'True Master', 'Reach level 15 in all stats', '🌟', 'legendary', 1000, '{"all_stats": 100}', false, 46),
('stat_specialist', 'Stat Specialist', 'Reach level 20 in any single stat', '🎯', 'epic', 400, '{"all_stats": 40}', false, 47),
('total_power', 'Total Power', 'Accumulate 10,000 total stat XP across all stats', '💎', 'epic', 600, '{"all_stats": 70}', false, 48),
('stat_diversity', 'Stat Diversity', 'Earn at least 1,000 XP in each stat category', '🌈', 'rare', 200, '{"all_stats": 25}', false, 49),

-- ========================================
-- RANK PROGRESSION ACHIEVEMENTS (8 total)
-- ========================================

('bronze_to_gold', 'Gold Ascendant', 'Reach Gold rank', '🥇', 'rare', 150, '{"all_stats": 30}', false, 50),
('gold_to_platinum', 'Platinum Elite', 'Reach Platinum rank', '💎', 'epic', 300, '{"all_stats": 60}', false, 51),
('platinum_to_diamond', 'Diamond Master', 'Reach Diamond rank', '💎', 'epic', 500, '{"all_stats": 100}', false, 52),
('diamond_to_grandmaster', 'Grandmaster Legend', 'Reach Grandmaster rank', '👑', 'legendary', 1000, '{"all_stats": 200}', false, 53),
('rank_retention', 'Rank Retention', 'Maintain Diamond rank for 3 consecutive assessments', '🛡️', 'epic', 400, '{"wisdom": 80, "constitution": 60}', false, 54),
('rr_collector', 'RR Collector', 'Accumulate 1,000 RR points', '💰', 'rare', 200, '{"all_stats": 30}', false, 55),
('rr_magnate', 'RR Magnate', 'Accumulate 5,000 RR points', '💵', 'epic', 750, '{"all_stats": 80}', false, 56),

-- Hidden rank achievements
('rank_comeback', 'Comeback King', 'Drop a rank then regain it within the next assessment', '🔄', 'rare', 180, '{"wisdom": 40, "agility": 30}', true, 57),

-- ========================================
-- STREAK CHAMPION ACHIEVEMENTS (6 total)
-- ========================================

('streak_beginner', 'Streak Beginner', 'Maintain a 3-day activity streak', '🔥', 'common', 25, '{"constitution": 10, "agility": 5}', false, 60),
('streak_regular', 'Streak Regular', 'Maintain a 14-day activity streak', '🔥', 'rare', 80, '{"constitution": 25, "wisdom": 15}', false, 61),
('streak_veteran', 'Streak Veteran', 'Maintain a 30-day activity streak', '🔥', 'epic', 200, '{"all_stats": 35}', false, 62),
('streak_legend', 'Streak Legend', 'Maintain a 90-day activity streak', '🔥', 'legendary', 800, '{"all_stats": 120}', false, 63),
('consistency_master', 'Consistency Master', 'Complete at least one quest every day for 60 days', '📆', 'epic', 350, '{"wisdom": 70, "constitution": 50}', false, 64),
('perfectionist_streak', 'Perfectionist Streak', 'Complete all daily quests with 100% accuracy for 14 days straight', '✨', 'legendary', 600, '{"all_stats": 100}', true, 65),

-- ========================================
-- CRITICAL EXPERT ACHIEVEMENTS (4 total)
-- ========================================

('first_critical', 'First Critical Hit', 'Score your first critical hit on a quest', '⚡', 'rare', 50, '{"agility": 20, "intelligence": 15}', true, 70),
('critical_streak', 'Critical Streak', 'Score critical hits on 3 consecutive quests', '⚡', 'epic', 250, '{"all_stats": 40}', true, 71),
('critical_master', 'Critical Master', 'Score 10 critical hits total', '⚡', 'epic', 300, '{"agility": 60, "intelligence": 40}', false, 72),
('perfect_execution', 'Perfect Execution', 'Complete a quest with a 5x critical hit bonus', '🌟', 'legendary', 500, '{"all_stats": 80}', true, 73),

-- ========================================
-- SYSTEM MASTERY ACHIEVEMENTS (8 total)
-- ========================================

('system_explorer', 'System Explorer', 'Visit every section of the application at least once', '🗺️', 'rare', 100, '{"intelligence": 30, "wisdom": 20}', true, 80),
('character_customizer', 'Character Customizer', 'Change your character appearance or theme 5 times', '🎨', 'common', 40, '{"all_stats": 10}', false, 81),
('data_master', 'Data Master', 'Import or export data 10 times', '📊', 'common', 60, '{"intelligence": 25, "wisdom": 15}', false, 82),
('kpi_enthusiast', 'KPI Enthusiast', 'Create and track 20 different KPIs', '📈', 'rare', 120, '{"intelligence": 40, "wisdom": 25}', false, 83),
('deep_work_timer', 'Deep Work Expert', 'Accumulate 100 hours of deep work focus time', '⏰', 'epic', 280, '{"wisdom": 60, "intelligence": 40}', false, 84),
('content_creator', 'Content Creator', 'Track content metrics for 50 different pieces of content', '✍️', 'rare', 150, '{"intelligence": 45, "wisdom": 30}', false, 85),
('financial_tracker', 'Financial Tracker', 'Maintain financial tracking for 6 consecutive months', '💳', 'epic', 320, '{"wisdom": 70, "intelligence": 50}', false, 86),
('system_veteran', 'System Veteran', 'Use the system actively for 365 days', '🏅', 'legendary', 1200, '{"all_stats": 150}', false, 87),

-- ========================================
-- HIDDEN LEGENDARY ACHIEVEMENTS (4 total)
-- ========================================

('secret_achievement_1', 'The Hidden Path', 'Discover a secret feature in the application', '🔮', 'legendary', 400, '{"all_stats": 100}', true, 90),
('speed_demon', 'Speed Demon', 'Complete all daily quests within 2 hours of their assignment', '⚡', 'legendary', 450, '{"agility": 150, "intelligence": 75}', true, 91),
('ultimate_perfection', 'Ultimate Perfectionist', 'Complete 100 quests with 100% accuracy', '✨', 'legendary', 800, '{"all_stats": 200}', true, 92),
('achievement_hunter', 'Achievement Hunter', 'Unlock 75% of all available achievements', '🏆', 'legendary', 1500, '{"all_stats": 300}', false, 93);

-- Create achievement category mapping table for better organization
CREATE TABLE IF NOT EXISTS achievement_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(7) DEFAULT '#6B7280',
  border_color VARCHAR(20) DEFAULT 'border-gray-500',
  bg_color VARCHAR(20) DEFAULT 'bg-gray-500/10',
  display_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert achievement categories
INSERT INTO achievement_categories (category_key, name, description, icon, color, border_color, bg_color, display_order, is_hidden) VALUES
('quest_master', 'Quest Master', 'Achievements related to completing quests and maintaining streaks', '📋', '#10B981', 'border-emerald-500', 'bg-emerald-500/10', 1, false),
('stat_specialist', 'Stat Specialist', 'Achievements for leveling up individual stats and building character power', '💪', '#F59E0B', 'border-amber-500', 'bg-amber-500/10', 2, false),
('balanced_build', 'Balanced Build', 'Achievements for developing well-rounded character builds', '⚖️', '#8B5CF6', 'border-violet-500', 'bg-violet-500/10', 3, false),
('rank_progression', 'Rank Progression', 'Achievements for climbing the ranks and demonstrating consistent performance', '🏆', '#3B82F6', 'border-blue-500', 'bg-blue-500/10', 4, false),
('streak_champion', 'Streak Champion', 'Achievements for maintaining consistent daily activity and streaks', '🔥', '#EF4444', 'border-red-500', 'bg-red-500/10', 5, false),
('critical_expert', 'Critical Expert', 'Achievements for scoring critical hits and exceptional performance', '⚡', '#EC4899', 'border-pink-500', 'bg-pink-500/10', 6, false),
('system_mastery', 'System Mastery', 'Achievements for exploring and mastering all features of the system', '🎯', '#14B8A6', 'border-teal-500', 'bg-teal-500/10', 7, false),
('hidden_legendary', 'Hidden Legendary', 'Secret achievements that only reveal themselves under special conditions', '🌟', '#F97316', 'border-orange-500', 'bg-orange-500/10', 8, true);

-- Create achievement progress tracking table for multi-step achievements
CREATE TABLE IF NOT EXISTS achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(100) NOT NULL,
  current_progress INTEGER DEFAULT 0,
  max_progress INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT FALSE,
  next_milestone INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(achievement_key);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_display_order ON achievements(display_order);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_achievement ON achievement_progress(achievement_key);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_completed ON achievement_progress(is_completed);

-- Enable RLS for new tables
ALTER TABLE achievement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view achievement categories" ON achievement_categories
  FOR SELECT USING (true);

CREATE POLICY "Users can view own achievement progress" ON achievement_progress
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own achievement progress" ON achievement_progress
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own achievement progress" ON achievement_progress
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Grant permissions
GRANT ALL ON achievement_categories TO authenticated;
GRANT ALL ON achievement_progress TO authenticated;

-- Create view for achievement statistics
CREATE OR REPLACE VIEW achievement_statistics AS
SELECT
  a.rarity,
  COUNT(*) as total_achievements,
  SUM(CASE WHEN ua.user_id IS NOT NULL THEN 1 ELSE 0 END) as unlocked_count,
  SUM(CASE WHEN ua.user_id IS NOT NULL THEN a.rr_reward ELSE 0 END) as total_rr_available,
  SUM(a.rr_reward) as total_rr_potential
FROM achievements a
LEFT JOIN user_achievements ua ON a.achievement_key = ua.achievement_key
GROUP BY a.rarity;

-- Create function to calculate achievement progress
CREATE OR REPLACE FUNCTION calculate_achievement_progress(
  p_user_id UUID,
  p_achievement_key VARCHAR(100)
) RETURNS INTEGER AS $$
DECLARE
  v_progress INTEGER := 0;
  v_max_progress INTEGER := 1;
BEGIN
  -- Calculate progress based on achievement type
  CASE p_achievement_key
    -- Quest completion achievements
    WHEN 'first_quest' THEN
      SELECT COUNT(*) INTO v_progress FROM quest_history qh
      JOIN training_quests tq ON qh.quest_id = tq.id
      WHERE tq.user_id = p_user_id;
      v_max_progress := 1;

    WHEN 'quest_enthusiast' THEN
      SELECT COUNT(*) INTO v_progress FROM quest_history qh
      JOIN training_quests tq ON qh.quest_id = tq.id
      WHERE tq.user_id = p_user_id;
      v_max_progress := 10;

    WHEN 'quest_master' THEN
      SELECT COUNT(*) INTO v_progress FROM quest_history qh
      JOIN training_quests tq ON qh.quest_id = tq.id
      WHERE tq.user_id = p_user_id;
      v_max_progress := 50;

    -- Stat level achievements
    WHEN 'strength_apprentice', 'strength_master', 'strength_legend',
         'intelligence_apprentice', 'intelligence_master', 'intelligence_legend',
         'wisdom_apprentice', 'wisdom_master', 'wisdom_legend',
         'constitution_apprentice', 'constitution_master', 'constitution_legend',
         'agility_apprentice', 'agility_master', 'agility_legend' THEN
      SELECT current_level INTO v_progress FROM character_stats
      WHERE user_id = p_user_id AND stat_name = SUBSTRING(p_achievement_key FROM 1 FOR POSITION('_' IN p_achievement_key) - 1);

      IF p_achievement_key LIKE '%apprentice' THEN v_max_progress := 5;
      ELSIF p_achievement_key LIKE '%master' THEN v_max_progress := 10;
      ELSIF p_achievement_key LIKE '%legend' THEN v_max_progress := 25;
      END IF;

    -- RR accumulation achievements
    WHEN 'rr_collector' THEN
      SELECT rr_points INTO v_progress FROM user_ranks WHERE user_id = p_user_id;
      v_max_progress := 1000;

    WHEN 'rr_magnate' THEN
      SELECT rr_points INTO v_progress FROM user_ranks WHERE user_id = p_user_id;
      v_max_progress := 5000;

    -- Default case
    ELSE
      v_progress := 0;
      v_max_progress := 1;
  END CASE;

  -- Update progress tracking
  INSERT INTO achievement_progress (user_id, achievement_key, current_progress, max_progress, is_completed)
  VALUES (p_user_id, p_achievement_key, v_progress, v_max_progress, v_progress >= v_max_progress)
  ON CONFLICT (user_id, achievement_key)
  DO UPDATE SET
    current_progress = v_progress,
    max_progress = v_max_progress,
    is_completed = v_progress >= v_max_progress,
    last_updated = NOW();

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Create function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID) RETURNS TABLE(achievement_key VARCHAR(100), title VARCHAR(255)) AS $$
DECLARE
  achievement_record RECORD;
BEGIN
  -- Check each achievement for unlock conditions
  FOR achievement_record IN
    SELECT achievement_key, title FROM achievements a
    WHERE achievement_key NOT IN (
      SELECT achievement_key FROM user_achievements WHERE user_id = p_user_id
    )
  LOOP
    -- Calculate progress and check if achievement should be unlocked
    PERFORM calculate_achievement_progress(p_user_id, achievement_record.achievement_key);

    -- Check if progress meets requirements
    IF EXISTS (
      SELECT 1 FROM achievement_progress
      WHERE user_id = p_user_id
        AND achievement_key = achievement_record.achievement_key
        AND is_completed = true
    ) THEN
      -- Unlock the achievement
      INSERT INTO user_achievements (user_id, achievement_key, unlocked_at)
      VALUES (p_user_id, achievement_record.achievement_key, NOW())
      ON CONFLICT DO NOTHING;

      -- Return the unlocked achievement
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verification queries (uncomment for testing)
-- SELECT 'Achievement migration completed successfully!' as status;
-- SELECT COUNT(*) as total_achievements FROM achievements;
-- SELECT COUNT(*) as total_categories FROM achievement_categories;
-- SELECT rarity, COUNT(*) as achievements_by_rarity FROM achievements GROUP BY rarity;