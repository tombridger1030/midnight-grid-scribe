import { AchievementDefinition, AchievementRewards } from '../achievementSystem';

// Achievement rewards helper function
const createRewards = (rr: number, stats: Record<string, number>, title?: string, badge?: string): AchievementRewards => ({
  rr,
  stats,
  ...(title && { title }),
  ...(badge && { badge })
});

// Comprehensive achievement definitions (50+ achievements across all categories)
export const COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  // ========================================
  // QUEST MASTER ACHIEVEMENTS (15 total)
  // ========================================

  'first_quest': {
    key: 'first_quest',
    title: 'First Steps',
    description: 'Complete your first training quest',
    icon: '🚶',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(10, { constitution: 5 }),
    display_order: 1,
    conditions: [{ type: 'total_quests', target: 1 }]
  },

  'quest_enthusiast': {
    key: 'quest_enthusiast',
    title: 'Quest Enthusiast',
    description: 'Complete 10 training quests',
    icon: '📋',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(25, { agility: 10, constitution: 5 }),
    display_order: 10,
    conditions: [{ type: 'total_quests', target: 10 }]
  },

  'quest_master': {
    key: 'quest_master',
    title: 'Quest Master',
    description: 'Complete 50 training quests',
    icon: '🏆',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(100, { all_stats: 20 }),
    display_order: 11,
    conditions: [{ type: 'total_quests', target: 50 }]
  },

  'quest_legend': {
    key: 'quest_legend',
    title: 'Quest Legend',
    description: 'Complete 200 training quests',
    icon: '👑',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(500, { all_stats: 50 }),
    display_order: 12,
    conditions: [{ type: 'total_quests', target: 200 }]
  },

  'quest_demon': {
    key: 'quest_demon',
    title: 'Quest Demon',
    description: 'Complete 1,000 training quests',
    icon: '👹',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(2000, { all_stats: 200 }, 'Quest Demon'),
    display_order: 13,
    conditions: [{ type: 'total_quests', target: 1000 }]
  },

  'perfect_week': {
    key: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete all daily quests for an entire week',
    icon: '🗓️',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(75, { wisdom: 25, constitution: 15 }),
    display_order: 14,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'perfect_month': {
    key: 'perfect_month',
    title: 'Perfect Month',
    description: 'Complete all daily quests for an entire month',
    icon: '📅',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { all_stats: 40 }),
    display_order: 15,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'quest_streak_7': {
    key: 'quest_streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day quest completion streak',
    icon: '🔥',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(50, { constitution: 20, wisdom: 10 }),
    display_order: 16,
    conditions: [{ type: 'quest_streak', target: 7 }]
  },

  'quest_streak_30': {
    key: 'quest_streak_30',
    title: 'Month Warrior',
    description: 'Maintain a 30-day quest completion streak',
    icon: '🔥',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(200, { constitution: 50, wisdom: 25 }),
    display_order: 17,
    conditions: [{ type: 'quest_streak', target: 30 }]
  },

  'quest_streak_100': {
    key: 'quest_streak_100',
    title: 'Century Warrior',
    description: 'Maintain a 100-day quest completion streak',
    icon: '💯',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(750, { all_stats: 100 }, 'Century Warrior'),
    display_order: 18,
    conditions: [{ type: 'quest_streak', target: 100 }]
  },

  'daily_master': {
    key: 'daily_master',
    title: 'Daily Master',
    description: 'Complete 100 daily quests',
    icon: '☀️',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(400, { agility: 60, intelligence: 30 }),
    display_order: 19,
    conditions: [{ type: 'custom', target: 100 }]
  },

  'weekly_champion': {
    key: 'weekly_champion',
    title: 'Weekly Champion',
    description: 'Complete 50 weekly quests',
    icon: '🏅',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(350, { wisdom: 50, intelligence: 35 }),
    display_order: 20,
    conditions: [{ type: 'custom', target: 50 }]
  },

  'breakthrough_hunter': {
    key: 'breakthrough_hunter',
    title: 'Breakthrough Hunter',
    description: 'Complete 25 breakthrough quests',
    icon: '⚡',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(150, { all_stats: 25 }),
    display_order: 21,
    conditions: [{ type: 'custom', target: 25 }]
  },

  'quest_variety': {
    key: 'quest_variety',
    title: 'Quest Variety',
    description: 'Complete at least 5 of each quest type',
    icon: '🌈',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(120, { all_stats: 15 }),
    display_order: 22,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'speed_quester': {
    key: 'speed_quester',
    title: 'Speed Quester',
    description: 'Complete a quest within 1 hour of it being assigned',
    icon: '⚡',
    rarity: 'rare',
    is_hidden: true,
    rewards: createRewards(80, { agility: 40 }),
    display_order: 23,
    conditions: [{ type: 'custom', target: 1 }]
  },

  // ========================================
  // STAT SPECIALIST ACHIEVEMENTS (15 total)
  // ========================================

  // Strength achievements
  'strength_apprentice': {
    key: 'strength_apprentice',
    title: 'Strength Apprentice',
    description: 'Reach level 5 in Strength',
    icon: '💪',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(30, { strength: 15 }),
    display_order: 30,
    conditions: [{ type: 'stat_level', target: 5, stat_name: 'strength' }]
  },

  'strength_master': {
    key: 'strength_master',
    title: 'Strength Master',
    description: 'Reach level 10 in Strength',
    icon: '🏋️',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(100, { strength: 50 }),
    display_order: 31,
    conditions: [{ type: 'stat_level', target: 10, stat_name: 'strength' }]
  },

  'strength_legend': {
    key: 'strength_legend',
    title: 'Strength Legend',
    description: 'Reach level 25 in Strength',
    icon: '🦾',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { strength: 150 }),
    display_order: 32,
    conditions: [{ type: 'stat_level', target: 25, stat_name: 'strength' }]
  },

  // Intelligence achievements
  'intelligence_apprentice': {
    key: 'intelligence_apprentice',
    title: 'Intelligence Apprentice',
    description: 'Reach level 5 in Intelligence',
    icon: '🧠',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(30, { intelligence: 15 }),
    display_order: 33,
    conditions: [{ type: 'stat_level', target: 5, stat_name: 'intelligence' }]
  },

  'intelligence_master': {
    key: 'intelligence_master',
    title: 'Intelligence Master',
    description: 'Reach level 10 in Intelligence',
    icon: '🎓',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(100, { intelligence: 50 }),
    display_order: 34,
    conditions: [{ type: 'stat_level', target: 10, stat_name: 'intelligence' }]
  },

  'intelligence_legend': {
    key: 'intelligence_legend',
    title: 'Intelligence Legend',
    description: 'Reach level 25 in Intelligence',
    icon: '🔬',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { intelligence: 150 }),
    display_order: 35,
    conditions: [{ type: 'stat_level', target: 25, stat_name: 'intelligence' }]
  },

  // Wisdom achievements
  'wisdom_apprentice': {
    key: 'wisdom_apprentice',
    title: 'Wisdom Apprentice',
    description: 'Reach level 5 in Wisdom',
    icon: '📚',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(30, { wisdom: 15 }),
    display_order: 36,
    conditions: [{ type: 'stat_level', target: 5, stat_name: 'wisdom' }]
  },

  'wisdom_master': {
    key: 'wisdom_master',
    title: 'Wisdom Master',
    description: 'Reach level 10 in Wisdom',
    icon: '🦉',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(100, { wisdom: 50 }),
    display_order: 37,
    conditions: [{ type: 'stat_level', target: 10, stat_name: 'wisdom' }]
  },

  'wisdom_legend': {
    key: 'wisdom_legend',
    title: 'Wisdom Legend',
    description: 'Reach level 25 in Wisdom',
    icon: '🧘',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { wisdom: 150 }),
    display_order: 38,
    conditions: [{ type: 'stat_level', target: 25, stat_name: 'wisdom' }]
  },

  // Constitution achievements
  'constitution_apprentice': {
    key: 'constitution_apprentice',
    title: 'Constitution Apprentice',
    description: 'Reach level 5 in Constitution',
    icon: '🛡️',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(30, { constitution: 15 }),
    display_order: 39,
    conditions: [{ type: 'stat_level', target: 5, stat_name: 'constitution' }]
  },

  'constitution_master': {
    key: 'constitution_master',
    title: 'Constitution Master',
    description: 'Reach level 10 in Constitution',
    icon: '⚡',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(100, { constitution: 50 }),
    display_order: 40,
    conditions: [{ type: 'stat_level', target: 10, stat_name: 'constitution' }]
  },

  'constitution_legend': {
    key: 'constitution_legend',
    title: 'Constitution Legend',
    description: 'Reach level 25 in Constitution',
    icon: '🏰',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { constitution: 150 }),
    display_order: 41,
    conditions: [{ type: 'stat_level', target: 25, stat_name: 'constitution' }]
  },

  // Agility achievements
  'agility_apprentice': {
    key: 'agility_apprentice',
    title: 'Agility Apprentice',
    description: 'Reach level 5 in Agility',
    icon: '🏃',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(30, { agility: 15 }),
    display_order: 42,
    conditions: [{ type: 'stat_level', target: 5, stat_name: 'agility' }]
  },

  'agility_master': {
    key: 'agility_master',
    title: 'Agility Master',
    description: 'Reach level 10 in Agility',
    icon: '🤸',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(100, { agility: 50 }),
    display_order: 43,
    conditions: [{ type: 'stat_level', target: 10, stat_name: 'agility' }]
  },

  'agility_legend': {
    key: 'agility_legend',
    title: 'Agility Legend',
    description: 'Reach level 25 in Agility',
    icon: '🦘',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { agility: 150 }),
    display_order: 44,
    conditions: [{ type: 'stat_level', target: 25, stat_name: 'agility' }]
  },

  // ========================================
  // BALANCED BUILD ACHIEVEMENTS (5 total)
  // ========================================

  'balanced_build': {
    key: 'balanced_build',
    title: 'Balanced Build',
    description: 'Reach level 10 in all stats',
    icon: '⚖️',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(500, { all_stats: 60 }),
    display_order: 45,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'true_master': {
    key: 'true_master',
    title: 'True Master',
    description: 'Reach level 15 in all stats',
    icon: '🌟',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(1000, { all_stats: 100 }, 'True Master'),
    display_order: 46,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'stat_specialist': {
    key: 'stat_specialist',
    title: 'Stat Specialist',
    description: 'Reach level 20 in any single stat',
    icon: '🎯',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(400, { all_stats: 40 }),
    display_order: 47,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'total_power': {
    key: 'total_power',
    title: 'Total Power',
    description: 'Accumulate 10,000 total stat XP across all stats',
    icon: '💎',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(600, { all_stats: 70 }),
    display_order: 48,
    conditions: [{ type: 'custom', target: 10000 }]
  },

  'stat_diversity': {
    key: 'stat_diversity',
    title: 'Stat Diversity',
    description: 'Earn at least 1,000 XP in each stat category',
    icon: '🌈',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(200, { all_stats: 25 }),
    display_order: 49,
    conditions: [{ type: 'custom', target: 1 }]
  },

  // ========================================
  // RANK PROGRESSION ACHIEVEMENTS (8 total)
  // ========================================

  'bronze_to_gold': {
    key: 'bronze_to_gold',
    title: 'Gold Ascendant',
    description: 'Reach Gold rank',
    icon: '🥇',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(150, { all_stats: 30 }),
    display_order: 50,
    conditions: [{ type: 'rank', target: 1 }]
  },

  'gold_to_platinum': {
    key: 'gold_to_platinum',
    title: 'Platinum Elite',
    description: 'Reach Platinum rank',
    icon: '💎',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { all_stats: 60 }),
    display_order: 51,
    conditions: [{ type: 'rank', target: 2 }]
  },

  'platinum_to_diamond': {
    key: 'platinum_to_diamond',
    title: 'Diamond Master',
    description: 'Reach Diamond rank',
    icon: '💎',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(500, { all_stats: 100 }),
    display_order: 52,
    conditions: [{ type: 'rank', target: 3 }]
  },

  'diamond_to_grandmaster': {
    key: 'diamond_to_grandmaster',
    title: 'Grandmaster Legend',
    description: 'Reach Grandmaster rank',
    icon: '👑',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(1000, { all_stats: 200 }, 'Grandmaster'),
    display_order: 53,
    conditions: [{ type: 'rank', target: 4 }]
  },

  'rank_retention': {
    key: 'rank_retention',
    title: 'Rank Retention',
    description: 'Maintain Diamond rank for 3 consecutive assessments',
    icon: '🛡️',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(400, { wisdom: 80, constitution: 60 }),
    display_order: 54,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'rr_collector': {
    key: 'rr_collector',
    title: 'RR Collector',
    description: 'Accumulate 1,000 RR points',
    icon: '💰',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(200, { all_stats: 30 }),
    display_order: 55,
    conditions: [{ type: 'total_rr', target: 1000 }]
  },

  'rr_magnate': {
    key: 'rr_magnate',
    title: 'RR Magnate',
    description: 'Accumulate 5,000 RR points',
    icon: '💵',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(750, { all_stats: 80 }),
    display_order: 56,
    conditions: [{ type: 'total_rr', target: 5000 }]
  },

  'rank_comeback': {
    key: 'rank_comeback',
    title: 'Comeback King',
    description: 'Drop a rank then regain it within the next assessment',
    icon: '🔄',
    rarity: 'rare',
    is_hidden: true,
    rewards: createRewards(180, { wisdom: 40, agility: 30 }),
    display_order: 57,
    conditions: [{ type: 'custom', target: 1 }]
  },

  // ========================================
  // STREAK CHAMPION ACHIEVEMENTS (6 total)
  // ========================================

  'streak_beginner': {
    key: 'streak_beginner',
    title: 'Streak Beginner',
    description: 'Maintain a 3-day activity streak',
    icon: '🔥',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(25, { constitution: 10, agility: 5 }),
    display_order: 60,
    conditions: [{ type: 'quest_streak', target: 3 }]
  },

  'streak_regular': {
    key: 'streak_regular',
    title: 'Streak Regular',
    description: 'Maintain a 14-day activity streak',
    icon: '🔥',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(80, { constitution: 25, wisdom: 15 }),
    display_order: 61,
    conditions: [{ type: 'quest_streak', target: 14 }]
  },

  'streak_veteran': {
    key: 'streak_veteran',
    title: 'Streak Veteran',
    description: 'Maintain a 30-day activity streak',
    icon: '🔥',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(200, { all_stats: 35 }),
    display_order: 62,
    conditions: [{ type: 'quest_streak', target: 30 }]
  },

  'streak_legend': {
    key: 'streak_legend',
    title: 'Streak Legend',
    description: 'Maintain a 90-day activity streak',
    icon: '🔥',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(800, { all_stats: 120 }, 'Unbreakable'),
    display_order: 63,
    conditions: [{ type: 'quest_streak', target: 90 }]
  },

  'consistency_master': {
    key: 'consistency_master',
    title: 'Consistency Master',
    description: 'Complete at least one quest every day for 60 days',
    icon: '📆',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(350, { wisdom: 70, constitution: 50 }),
    display_order: 64,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'perfectionist_streak': {
    key: 'perfectionist_streak',
    title: 'Perfectionist Streak',
    description: 'Complete all daily quests with 100% accuracy for 14 days straight',
    icon: '✨',
    rarity: 'legendary',
    is_hidden: true,
    rewards: createRewards(600, { all_stats: 100 }, 'Perfectionist'),
    display_order: 65,
    conditions: [{ type: 'custom', target: 1 }]
  },

  // ========================================
  // CRITICAL EXPERT ACHIEVEMENTS (4 total)
  // ========================================

  'first_critical': {
    key: 'first_critical',
    title: 'First Critical Hit',
    description: 'Score your first critical hit on a quest',
    icon: '⚡',
    rarity: 'rare',
    is_hidden: true,
    rewards: createRewards(50, { agility: 20, intelligence: 15 }),
    display_order: 70,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'critical_streak': {
    key: 'critical_streak',
    title: 'Critical Streak',
    description: 'Score critical hits on 3 consecutive quests',
    icon: '⚡',
    rarity: 'epic',
    is_hidden: true,
    rewards: createRewards(250, { all_stats: 40 }),
    display_order: 71,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'critical_master': {
    key: 'critical_master',
    title: 'Critical Master',
    description: 'Score 10 critical hits total',
    icon: '⚡',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(300, { agility: 60, intelligence: 40 }),
    display_order: 72,
    conditions: [{ type: 'custom', target: 10 }]
  },

  'perfect_execution': {
    key: 'perfect_execution',
    title: 'Perfect Execution',
    description: 'Complete a quest with a 5x critical hit bonus',
    icon: '🌟',
    rarity: 'legendary',
    is_hidden: true,
    rewards: createRewards(500, { all_stats: 80 }, 'Perfect Execution'),
    display_order: 73,
    conditions: [{ type: 'custom', target: 1 }]
  },

  // ========================================
  // SYSTEM MASTERY ACHIEVEMENTS (8 total)
  // ========================================

  'system_explorer': {
    key: 'system_explorer',
    title: 'System Explorer',
    description: 'Visit every section of the application at least once',
    icon: '🗺️',
    rarity: 'rare',
    is_hidden: true,
    rewards: createRewards(100, { intelligence: 30, wisdom: 20 }),
    display_order: 80,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'character_customizer': {
    key: 'character_customizer',
    title: 'Character Customizer',
    description: 'Change your character appearance or theme 5 times',
    icon: '🎨',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(40, { all_stats: 10 }),
    display_order: 81,
    conditions: [{ type: 'custom', target: 5 }]
  },

  'data_master': {
    key: 'data_master',
    title: 'Data Master',
    description: 'Import or export data 10 times',
    icon: '📊',
    rarity: 'common',
    is_hidden: false,
    rewards: createRewards(60, { intelligence: 25, wisdom: 15 }),
    display_order: 82,
    conditions: [{ type: 'custom', target: 10 }]
  },

  'kpi_enthusiast': {
    key: 'kpi_enthusiast',
    title: 'KPI Enthusiast',
    description: 'Create and track 20 different KPIs',
    icon: '📈',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(120, { intelligence: 40, wisdom: 25 }),
    display_order: 83,
    conditions: [{ type: 'custom', target: 20 }]
  },

  'deep_work_timer': {
    key: 'deep_work_timer',
    title: 'Deep Work Expert',
    description: 'Accumulate 100 hours of deep work focus time',
    icon: '⏰',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(280, { wisdom: 60, intelligence: 40 }),
    display_order: 84,
    conditions: [{ type: 'custom', target: 360000 }] // 100 hours in seconds
  },

  'content_creator': {
    key: 'content_creator',
    title: 'Content Creator',
    description: 'Track content metrics for 50 different pieces of content',
    icon: '✍️',
    rarity: 'rare',
    is_hidden: false,
    rewards: createRewards(150, { intelligence: 45, wisdom: 30 }),
    display_order: 85,
    conditions: [{ type: 'custom', target: 50 }]
  },

  'financial_tracker': {
    key: 'financial_tracker',
    title: 'Financial Tracker',
    description: 'Maintain financial tracking for 6 consecutive months',
    icon: '💳',
    rarity: 'epic',
    is_hidden: false,
    rewards: createRewards(320, { wisdom: 70, intelligence: 50 }),
    display_order: 86,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'system_veteran': {
    key: 'system_veteran',
    title: 'System Veteran',
    description: 'Use the system actively for 365 days',
    icon: '🏅',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(1200, { all_stats: 150 }, 'System Veteran'),
    display_order: 87,
    conditions: [{ type: 'custom', target: 365 }]
  },

  // ========================================
  // HIDDEN LEGENDARY ACHIEVEMENTS (4 total)
  // ========================================

  'secret_achievement_1': {
    key: 'secret_achievement_1',
    title: 'The Hidden Path',
    description: 'Discover a secret feature in the application',
    icon: '🔮',
    rarity: 'legendary',
    is_hidden: true,
    rewards: createRewards(400, { all_stats: 100 }, 'Pathfinder'),
    display_order: 90,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'speed_demon': {
    key: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete all daily quests within 2 hours of their assignment',
    icon: '⚡',
    rarity: 'legendary',
    is_hidden: true,
    rewards: createRewards(450, { agility: 150, intelligence: 75 }, 'Speed Demon'),
    display_order: 91,
    conditions: [{ type: 'custom', target: 1 }]
  },

  'ultimate_perfection': {
    key: 'ultimate_perfection',
    description: 'Complete 100 quests with 100% accuracy',
    icon: '✨',
    rarity: 'legendary',
    is_hidden: true,
    rewards: createRewards(800, { all_stats: 200 }, 'Ultimate Perfectionist'),
    display_order: 92,
    conditions: [{ type: 'custom', target: 100 }]
  },

  'achievement_hunter': {
    key: 'achievement_hunter',
    title: 'Achievement Hunter',
    description: 'Unlock 75% of all available achievements',
    icon: '🏆',
    rarity: 'legendary',
    is_hidden: false,
    rewards: createRewards(1500, { all_stats: 300 }, 'Achievement Hunter'),
    display_order: 93,
    conditions: [{ type: 'custom', target: 1 }]
  }
};

// Achievement count verification
export const TOTAL_ACHIEVEMENTS = Object.keys(COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS).length;

// Achievement rarity distribution
export const ACHIEVEMENT_RARITY_DISTRIBUTION = {
  common: Object.values(COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS).filter(a => a.rarity === 'common').length,
  rare: Object.values(COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS).filter(a => a.rarity === 'rare').length,
  epic: Object.values(COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS).filter(a => a.rarity === 'epic').length,
  legendary: Object.values(COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS).filter(a => a.rarity === 'legendary').length,
};

// Achievement category distribution
export const ACHIEVEMENT_CATEGORY_DISTRIBUTION = {
  quest_master: 15,
  stat_specialist: 15,
  balanced_build: 5,
  rank_progression: 8,
  streak_champion: 6,
  critical_expert: 4,
  system_mastery: 8,
  hidden_legendary: 4,
};