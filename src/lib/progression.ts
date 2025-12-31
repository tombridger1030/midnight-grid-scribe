/**
 * Simplified Progression System
 * 
 * Core concepts:
 * - Level: Based on XP (100 XP per level)
 * - Rank: Bronze → Silver → Gold → Platinum → Diamond (based on RR points)
 * - Achievements: Simple milestones (15 total)
 * - XP Sources: Weekly completion, ships, content
 */

import { supabase } from './supabase';

// ============================================
// Types
// ============================================

export type Rank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface UserProgression {
  id: string;
  user_id: string;
  level: number;
  xp: number;
  rank: Rank;
  rr_points: number;
  current_streak: number;
  longest_streak: number;
  weeks_completed: number;
  perfect_weeks: number;
  total_ships: number;
  total_content: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (progression: UserProgression) => boolean;
}

export interface UnlockedAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// ============================================
// Constants
// ============================================

export const XP_PER_LEVEL = 100;

export const XP_REWARDS = {
  // Weekly completion rewards
  weekly: {
    perfect: 100,    // 100%
    excellent: 75,   // 80-99%
    good: 50,        // 60-79%
    fair: 25,        // 40-59%
    poor: 10,        // 20-39%
    none: 0,         // <20%
  },
  ship: 10,          // Per ship logged
  content: 15,       // Per content published
} as const;

export const RANK_THRESHOLDS: Record<Rank, { min: number; max: number; color: string; icon: string }> = {
  bronze: { min: 0, max: 499, color: '#CD7F32', icon: '🥉' },
  silver: { min: 500, max: 999, color: '#C0C0C0', icon: '🥈' },
  gold: { min: 1000, max: 1499, color: '#FFD700', icon: '🥇' },
  platinum: { min: 1500, max: 1999, color: '#E5E4E2', icon: '🏅' },
  diamond: { min: 2000, max: Infinity, color: '#B9F2FF', icon: '👑' },
};

export const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  {
    id: 'first_week',
    name: 'First Steps',
    description: 'Complete your first week',
    icon: '🌱',
    condition: (p) => p.weeks_completed >= 1,
  },
  {
    id: 'streak_4',
    name: 'On Fire',
    description: '4-week streak',
    icon: '🔥',
    condition: (p) => p.current_streak >= 4 || p.longest_streak >= 4,
  },
  {
    id: 'streak_8',
    name: 'Unstoppable',
    description: '8-week streak',
    icon: '⚡',
    condition: (p) => p.current_streak >= 8 || p.longest_streak >= 8,
  },
  {
    id: 'streak_12',
    name: 'Legendary',
    description: '12-week streak',
    icon: '💎',
    condition: (p) => p.current_streak >= 12 || p.longest_streak >= 12,
  },
  // Level achievements
  {
    id: 'level_10',
    name: 'Rising Star',
    description: 'Reach level 10',
    icon: '⭐',
    condition: (p) => p.level >= 10,
  },
  {
    id: 'level_25',
    name: 'Veteran',
    description: 'Reach level 25',
    icon: '🌟',
    condition: (p) => p.level >= 25,
  },
  {
    id: 'level_50',
    name: 'Master',
    description: 'Reach level 50',
    icon: '💫',
    condition: (p) => p.level >= 50,
  },
  // Rank achievements
  {
    id: 'rank_silver',
    name: 'Silver Badge',
    description: 'Reach Silver rank',
    icon: '🥈',
    condition: (p) => ['silver', 'gold', 'platinum', 'diamond'].includes(p.rank),
  },
  {
    id: 'rank_gold',
    name: 'Gold Badge',
    description: 'Reach Gold rank',
    icon: '🥇',
    condition: (p) => ['gold', 'platinum', 'diamond'].includes(p.rank),
  },
  {
    id: 'rank_platinum',
    name: 'Platinum Badge',
    description: 'Reach Platinum rank',
    icon: '🏅',
    condition: (p) => ['platinum', 'diamond'].includes(p.rank),
  },
  {
    id: 'rank_diamond',
    name: 'Diamond Badge',
    description: 'Reach Diamond rank',
    icon: '👑',
    condition: (p) => p.rank === 'diamond',
  },
  // Perfect week achievements
  {
    id: 'perfect_week',
    name: 'Perfectionist',
    description: 'Complete a perfect week (100%)',
    icon: '✨',
    condition: (p) => p.perfect_weeks >= 1,
  },
  {
    id: 'perfect_4',
    name: 'Flawless Month',
    description: '4 perfect weeks',
    icon: '🏆',
    condition: (p) => p.perfect_weeks >= 4,
  },
  // Total weeks achievements
  {
    id: 'weeks_10',
    name: 'Dedicated',
    description: '10 weeks completed',
    icon: '📊',
    condition: (p) => p.weeks_completed >= 10,
  },
  {
    id: 'weeks_52',
    name: 'Year Strong',
    description: '52 weeks completed',
    icon: '🎯',
    condition: (p) => p.weeks_completed >= 52,
  },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate level from total XP
 * Level N requires (N-1) * 100 XP
 */
export function calculateLevelFromXP(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * Calculate XP required for a specific level
 */
export function xpRequiredForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

/**
 * Calculate XP progress within current level
 */
export function getXPProgress(xp: number): { current: number; required: number; percentage: number } {
  const level = calculateLevelFromXP(xp);
  const xpForCurrentLevel = xpRequiredForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  const currentLevelXP = xp - xpForCurrentLevel;
  const requiredXP = XP_PER_LEVEL;
  
  return {
    current: currentLevelXP,
    required: requiredXP,
    percentage: (currentLevelXP / requiredXP) * 100,
  };
}

/**
 * Get rank from RR points
 */
export function getRankFromRR(rrPoints: number): Rank {
  if (rrPoints >= RANK_THRESHOLDS.diamond.min) return 'diamond';
  if (rrPoints >= RANK_THRESHOLDS.platinum.min) return 'platinum';
  if (rrPoints >= RANK_THRESHOLDS.gold.min) return 'gold';
  if (rrPoints >= RANK_THRESHOLDS.silver.min) return 'silver';
  return 'bronze';
}

/**
 * Get RR progress within current rank
 */
export function getRRProgress(rrPoints: number): { current: number; required: number; percentage: number; nextRank: Rank | null } {
  const rank = getRankFromRR(rrPoints);
  const threshold = RANK_THRESHOLDS[rank];
  
  if (rank === 'diamond') {
    return {
      current: rrPoints - threshold.min,
      required: 0,
      percentage: 100,
      nextRank: null,
    };
  }
  
  const nextRankOrder: Record<Rank, Rank | null> = {
    bronze: 'silver',
    silver: 'gold',
    gold: 'platinum',
    platinum: 'diamond',
    diamond: null,
  };
  
  const nextRank = nextRankOrder[rank];
  const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank].min : rrPoints;
  
  return {
    current: rrPoints - threshold.min,
    required: nextThreshold - threshold.min,
    percentage: ((rrPoints - threshold.min) / (nextThreshold - threshold.min)) * 100,
    nextRank,
  };
}

/**
 * Calculate XP reward based on weekly completion percentage
 */
export function getWeeklyXPReward(completionPercentage: number): number {
  if (completionPercentage >= 100) return XP_REWARDS.weekly.perfect;
  if (completionPercentage >= 80) return XP_REWARDS.weekly.excellent;
  if (completionPercentage >= 60) return XP_REWARDS.weekly.good;
  if (completionPercentage >= 40) return XP_REWARDS.weekly.fair;
  if (completionPercentage >= 20) return XP_REWARDS.weekly.poor;
  return XP_REWARDS.weekly.none;
}

// ============================================
// Database Operations
// ============================================

/**
 * Get user progression from database
 */
export async function getUserProgression(userId: string): Promise<UserProgression | null> {
  const { data, error } = await supabase
    .from('user_progression')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found, return null
      return null;
    }
    console.error('Error fetching user progression:', error);
    return null;
  }

  return data as UserProgression;
}

/**
 * Initialize user progression (create record if doesn't exist)
 */
export async function initializeProgression(userId: string): Promise<UserProgression> {
  // Try to get existing record
  const existing = await getUserProgression(userId);
  if (existing) return existing;

  // Create new record
  const { data, error } = await supabase
    .from('user_progression')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('Error initializing progression:', error);
    throw error;
  }

  return data as UserProgression;
}

/**
 * Add XP to user and update level
 */
export async function addXP(userId: string, amount: number): Promise<{ progression: UserProgression; leveledUp: boolean; newLevel: number }> {
  const current = await getUserProgression(userId);
  if (!current) {
    await initializeProgression(userId);
    return addXP(userId, amount);
  }

  const oldLevel = current.level;
  const newXP = current.xp + amount;
  const newLevel = calculateLevelFromXP(newXP);

  const { data, error } = await supabase
    .from('user_progression')
    .update({ xp: newXP, level: newLevel })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error adding XP:', error);
    throw error;
  }

  return {
    progression: data as UserProgression,
    leveledUp: newLevel > oldLevel,
    newLevel,
  };
}

/**
 * Update rank and RR points
 */
export async function updateRankAndRR(userId: string, rrPoints: number): Promise<UserProgression> {
  const rank = getRankFromRR(rrPoints);

  const { data, error } = await supabase
    .from('user_progression')
    .update({ rank, rr_points: rrPoints })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating rank:', error);
    throw error;
  }

  return data as UserProgression;
}

/**
 * Update streak data
 */
export async function updateStreak(userId: string, completed: boolean): Promise<UserProgression> {
  const current = await getUserProgression(userId);
  if (!current) {
    await initializeProgression(userId);
    return updateStreak(userId, completed);
  }

  let newStreak = completed ? current.current_streak + 1 : 0;
  let longestStreak = Math.max(current.longest_streak, newStreak);

  const { data, error } = await supabase
    .from('user_progression')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating streak:', error);
    throw error;
  }

  return data as UserProgression;
}

/**
 * Increment week stats
 */
export async function incrementWeekStats(userId: string, isPerfect: boolean): Promise<UserProgression> {
  const current = await getUserProgression(userId);
  if (!current) {
    await initializeProgression(userId);
    return incrementWeekStats(userId, isPerfect);
  }

  const updates: Partial<UserProgression> = {
    weeks_completed: current.weeks_completed + 1,
  };
  
  if (isPerfect) {
    updates.perfect_weeks = current.perfect_weeks + 1;
  }

  const { data, error } = await supabase
    .from('user_progression')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error incrementing week stats:', error);
    throw error;
  }

  return data as UserProgression;
}

/**
 * Increment ship count
 */
export async function incrementShipCount(userId: string): Promise<UserProgression> {
  const { data, error } = await supabase
    .from('user_progression')
    .update({ total_ships: supabase.rpc('increment_ships') })
    .eq('user_id', userId)
    .select()
    .single();

  // Fallback if RPC doesn't exist
  if (error) {
    const current = await getUserProgression(userId);
    if (!current) {
      await initializeProgression(userId);
      return incrementShipCount(userId);
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_progression')
      .update({ total_ships: current.total_ships + 1 })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated as UserProgression;
  }

  return data as UserProgression;
}

/**
 * Increment content count
 */
export async function incrementContentCount(userId: string): Promise<UserProgression> {
  const current = await getUserProgression(userId);
  if (!current) {
    await initializeProgression(userId);
    return incrementContentCount(userId);
  }

  const { data, error } = await supabase
    .from('user_progression')
    .update({ total_content: current.total_content + 1 })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error incrementing content count:', error);
    throw error;
  }

  return data as UserProgression;
}

// ============================================
// Achievement Operations
// ============================================

/**
 * Get user's unlocked achievements
 */
export async function getUnlockedAchievements(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data.map((a) => a.achievement_id);
}

/**
 * Unlock an achievement
 */
export async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievementId });

  if (error) {
    // Already unlocked (unique constraint)
    if (error.code === '23505') return false;
    console.error('Error unlocking achievement:', error);
    return false;
  }

  return true;
}

/**
 * Check and unlock any new achievements based on current progression
 */
export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  const [progression, unlockedIds] = await Promise.all([
    getUserProgression(userId),
    getUnlockedAchievements(userId),
  ]);

  if (!progression) return [];

  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (unlockedIds.includes(achievement.id)) continue;

    // Check if condition is met
    if (achievement.condition(progression)) {
      const success = await unlockAchievement(userId, achievement.id);
      if (success) {
        newlyUnlocked.push(achievement);
      }
    }
  }

  return newlyUnlocked;
}

// ============================================
// Combined Operations
// ============================================

/**
 * Process weekly completion: add XP, update streak, check achievements
 */
export async function processWeeklyCompletion(
  userId: string,
  completionPercentage: number,
  rrPoints: number
): Promise<{
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  progression: UserProgression;
  newAchievements: Achievement[];
}> {
  const xpGained = getWeeklyXPReward(completionPercentage);
  const isPerfect = completionPercentage >= 100;
  const weekCompleted = completionPercentage >= 50; // Consider 50%+ as "completed"

  // Add XP
  const { progression, leveledUp, newLevel } = await addXP(userId, xpGained);

  // Update rank
  await updateRankAndRR(userId, rrPoints);

  // Update streak
  await updateStreak(userId, weekCompleted);

  // Increment week stats
  await incrementWeekStats(userId, isPerfect);

  // Check achievements
  const newAchievements = await checkAndUnlockAchievements(userId);

  // Get final progression state
  const finalProgression = await getUserProgression(userId);

  return {
    xpGained,
    leveledUp,
    newLevel,
    progression: finalProgression || progression,
    newAchievements,
  };
}

/**
 * Process ship: add XP, increment count, check achievements
 */
export async function processShip(userId: string): Promise<{
  xpGained: number;
  leveledUp: boolean;
  progression: UserProgression;
  newAchievements: Achievement[];
}> {
  const xpGained = XP_REWARDS.ship;

  // Add XP
  const { progression, leveledUp } = await addXP(userId, xpGained);

  // Increment ship count
  await incrementShipCount(userId);

  // Check achievements
  const newAchievements = await checkAndUnlockAchievements(userId);

  // Get final progression state
  const finalProgression = await getUserProgression(userId);

  return {
    xpGained,
    leveledUp,
    progression: finalProgression || progression,
    newAchievements,
  };
}

/**
 * Process content creation: add XP, increment count, check achievements
 */
export async function processContent(userId: string): Promise<{
  xpGained: number;
  leveledUp: boolean;
  progression: UserProgression;
  newAchievements: Achievement[];
}> {
  const xpGained = XP_REWARDS.content;

  // Add XP
  const { progression, leveledUp } = await addXP(userId, xpGained);

  // Increment content count
  await incrementContentCount(userId);

  // Check achievements
  const newAchievements = await checkAndUnlockAchievements(userId);

  // Get final progression state
  const finalProgression = await getUserProgression(userId);

  return {
    xpGained,
    leveledUp,
    progression: finalProgression || progression,
    newAchievements,
  };
}
