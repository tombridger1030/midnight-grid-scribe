import { Achievement } from '../achievementSystem';
import { COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS } from './definitions';

// Achievement category interface
export interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  achievements: string[]; // Achievement keys that belong to this category
  order: number;
  isHidden?: boolean;
}

// Achievement category definitions
export const ACHIEVEMENT_CATEGORIES: Record<string, AchievementCategory> = {
  quest_master: {
    id: 'quest_master',
    name: 'Quest Master',
    description: 'Achievements related to completing quests and maintaining streaks',
    icon: '📋',
    color: '#10B981', // emerald
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-500/10',
    achievements: [
      'first_quest',
      'quest_enthusiast',
      'quest_master',
      'quest_legend',
      'quest_demon',
      'perfect_week',
      'perfect_month',
      'quest_streak_7',
      'quest_streak_30',
      'quest_streak_100',
      'daily_master',
      'weekly_champion',
      'breakthrough_hunter',
      'quest_variety',
      'speed_quester'
    ],
    order: 1
  },

  stat_specialist: {
    id: 'stat_specialist',
    name: 'Stat Specialist',
    description: 'Achievements for leveling up individual stats and building character power',
    icon: '💪',
    color: '#F59E0B', // amber
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-500/10',
    achievements: [
      'strength_apprentice',
      'strength_master',
      'strength_legend',
      'intelligence_apprentice',
      'intelligence_master',
      'intelligence_legend',
      'wisdom_apprentice',
      'wisdom_master',
      'wisdom_legend',
      'constitution_apprentice',
      'constitution_master',
      'constitution_legend',
      'agility_apprentice',
      'agility_master',
      'agility_legend'
    ],
    order: 2
  },

  balanced_build: {
    id: 'balanced_build',
    name: 'Balanced Build',
    description: 'Achievements for developing well-rounded character builds',
    icon: '⚖️',
    color: '#8B5CF6', // violet
    borderColor: 'border-violet-500',
    bgColor: 'bg-violet-500/10',
    achievements: [
      'balanced_build',
      'true_master',
      'stat_specialist',
      'total_power',
      'stat_diversity'
    ],
    order: 3
  },

  rank_progression: {
    id: 'rank_progression',
    name: 'Rank Progression',
    description: 'Achievements for climbing the ranks and demonstrating consistent performance',
    icon: '🏆',
    color: '#3B82F6', // blue
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    achievements: [
      'bronze_to_gold',
      'gold_to_platinum',
      'platinum_to_diamond',
      'diamond_to_grandmaster',
      'rank_retention',
      'rr_collector',
      'rr_magnate',
      'rank_comeback'
    ],
    order: 4
  },

  streak_champion: {
    id: 'streak_champion',
    name: 'Streak Champion',
    description: 'Achievements for maintaining consistent daily activity and streaks',
    icon: '🔥',
    color: '#EF4444', // red
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/10',
    achievements: [
      'streak_beginner',
      'streak_regular',
      'streak_veteran',
      'streak_legend',
      'consistency_master',
      'perfectionist_streak'
    ],
    order: 5
  },

  critical_expert: {
    id: 'critical_expert',
    name: 'Critical Expert',
    description: 'Achievements for scoring critical hits and exceptional performance',
    icon: '⚡',
    color: '#EC4899', // pink
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-500/10',
    achievements: [
      'first_critical',
      'critical_streak',
      'critical_master',
      'perfect_execution'
    ],
    order: 6
  },

  system_mastery: {
    id: 'system_mastery',
    name: 'System Mastery',
    description: 'Achievements for exploring and mastering all features of the system',
    icon: '🎯',
    color: '#14B8A6', // teal
    borderColor: 'border-teal-500',
    bgColor: 'bg-teal-500/10',
    achievements: [
      'system_explorer',
      'character_customizer',
      'data_master',
      'kpi_enthusiast',
      'deep_work_timer',
      'content_creator',
      'financial_tracker',
      'system_veteran'
    ],
    order: 7
  },

  hidden_legendary: {
    id: 'hidden_legendary',
    name: 'Hidden Legendary',
    description: 'Secret achievements that only reveal themselves under special conditions',
    icon: '🌟',
    color: '#F97316', // orange
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
    achievements: [
      'secret_achievement_1',
      'speed_demon',
      'ultimate_perfection',
      'achievement_hunter'
    ],
    order: 8,
    isHidden: true
  }
};

// Helper functions for working with categories
export class AchievementCategoryService {
  // Get all categories
  static getAllCategories(): AchievementCategory[] {
    return Object.values(ACHIEVEMENT_CATEGORIES).sort((a, b) => a.order - b.order);
  }

  // Get visible categories (excluding hidden ones unless user has achievements there)
  static getVisibleCategories(unlockedAchievements: string[]): AchievementCategory[] {
    return Object.values(ACHIEVEMENT_CATEGORIES)
      .filter(category => {
        if (category.isHidden) {
          // Show hidden categories only if user has unlocked achievements in them
          return category.achievements.some(achievementKey =>
            unlockedAchievements.includes(achievementKey)
          );
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }

  // Get category by ID
  static getCategoryById(categoryId: string): AchievementCategory | null {
    return ACHIEVEMENT_CATEGORIES[categoryId] || null;
  }

  // Get category for an achievement
  static getCategoryForAchievement(achievementKey: string): AchievementCategory | null {
    for (const category of Object.values(ACHIEVEMENT_CATEGORIES)) {
      if (category.achievements.includes(achievementKey)) {
        return category;
      }
    }
    return null;
  }

  // Get all achievement keys in a category
  static getAchievementsInCategory(categoryId: string): string[] {
    const category = ACHIEVEMENT_CATEGORIES[categoryId];
    return category ? category.achievements : [];
  }

  // Count achievements in category
  static getAchievementCount(categoryId: string): number {
    const category = ACHIEVEMENT_CATEGORIES[categoryId];
    return category ? category.achievements.length : 0;
  }

  // Count unlocked achievements in category
  static getUnlockedAchievementCount(categoryId: string, unlockedAchievements: string[]): number {
    const category = ACHIEVEMENT_CATEGORIES[categoryId];
    if (!category) return 0;

    return category.achievements.filter(achievementKey =>
      unlockedAchievements.includes(achievementKey)
    ).length;
  }

  // Calculate completion percentage for category
  static getCategoryCompletionPercentage(categoryId: string, unlockedAchievements: string[]): number {
    const total = this.getAchievementCount(categoryId);
    if (total === 0) return 0;

    const unlocked = this.getUnlockedAchievementCount(categoryId, unlockedAchievements);
    return Math.round((unlocked / total) * 100);
  }

  // Get category progress summary
  static getCategoryProgress(categoryId: string, unlockedAchievements: string[]): {
    total: number;
    unlocked: number;
    percentage: number;
    nextAchievements: string[];
  } {
    const total = this.getAchievementCount(categoryId);
    const unlocked = this.getUnlockedAchievementCount(categoryId, unlockedAchievements);
    const percentage = this.getCategoryCompletionPercentage(categoryId, unlockedAchievements);

    // Get next achievements to unlock (simplified - could be enhanced with progress tracking)
    const nextAchievements = this.getAchievementsInCategory(categoryId)
      .filter(achievementKey => !unlockedAchievements.includes(achievementKey))
      .slice(0, 3);

    return { total, unlocked, percentage, nextAchievements };
  }

  // Get all categories with progress
  static getAllCategoriesWithProgress(unlockedAchievements: string[]): Array<AchievementCategory & {
    totalAchievements: number;
    unlockedAchievements: number;
    completionPercentage: number;
    nextAchievements: string[];
  }> {
    return Object.values(ACHIEVEMENT_CATEGORIES)
      .map(category => {
        const progress = this.getCategoryProgress(category.id, unlockedAchievements);
        return {
          ...category,
          totalAchievements: progress.total,
          unlockedAchievements: progress.unlocked,
          completionPercentage: progress.percentage,
          nextAchievements: progress.nextAchievements
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  // Get most completed category
  static getMostCompletedCategory(unlockedAchievements: string[]): AchievementCategory | null {
    const categoriesWithProgress = this.getAllCategoriesWithProgress(unlockedAchievements);

    if (categoriesWithProgress.length === 0) return null;

    return categoriesWithProgress.reduce((mostCompleted, category) => {
      if (category.completionPercentage > mostCompleted.completionPercentage) {
        return category;
      }
      return mostCompleted;
    });
  }

  // Get least completed category (that has some progress)
  static getLeastCompletedCategory(unlockedAchievements: string[]): AchievementCategory | null {
    const categoriesWithProgress = this.getAllCategoriesWithProgress(unlockedAchievements)
      .filter(category => category.unlockedAchievements > 0); // Only categories with some progress

    if (categoriesWithProgress.length === 0) return null;

    return categoriesWithProgress.reduce((leastCompleted, category) => {
      if (category.completionPercentage < leastCompleted.completionPercentage) {
        return category;
      }
      return leastCompleted;
    });
  }

  // Get category rarity breakdown
  static getCategoryRarityBreakdown(categoryId: string): Record<string, number> {
    const category = ACHIEVEMENT_CATEGORIES[categoryId];
    if (!category) return { common: 0, rare: 0, epic: 0, legendary: 0 };

    const breakdown = { common: 0, rare: 0, epic: 0, legendary: 0 };

    category.achievements.forEach(achievementKey => {
      const definition = COMPREHENSIVE_ACHIEVEMENT_DEFINITIONS[achievementKey];
      if (definition) {
        breakdown[definition.rarity]++;
      }
    });

    return breakdown;
  }

  // Get recommended category for user to focus on
  static getRecommendedCategory(unlockedAchievements: string[]): AchievementCategory | null {
    const categoriesWithProgress = this.getAllCategoriesWithProgress(unlockedAchievements);

    // Find categories with 0-50% completion
    const candidateCategories = categoriesWithProgress.filter(
      category => category.completionPercentage >= 0 && category.completionPercentage <= 50
    );

    if (candidateCategories.length === 0) {
      // If all categories are more than 50% complete, suggest the least completed one
      return this.getLeastCompletedCategory(unlockedAchievements);
    }

    // Return the category with the highest completion in the 0-50% range
    return candidateCategories.reduce((recommended, category) => {
      if (category.completionPercentage > recommended.completionPercentage) {
        return category;
      }
      return recommended;
    });
  }

  // Check if achievement is part of a hidden category
  static isAchievementInHiddenCategory(achievementKey: string): boolean {
    const category = this.getCategoryForAchievement(achievementKey);
    return category?.isHidden || false;
  }
}

// Export for convenience
export const achievementCategoryService = AchievementCategoryService;

// Category color utilities
export const getCategoryColor = (categoryId: string): string => {
  const category = ACHIEVEMENT_CATEGORIES[categoryId];
  return category?.color || '#6B7280';
};

export const getCategoryBorderClass = (categoryId: string): string => {
  const category = ACHIEVEMENT_CATEGORIES[categoryId];
  return category?.borderColor || 'border-gray-500';
};

export const getCategoryBgClass = (categoryId: string): string => {
  const category = ACHIEVEMENT_CATEGORIES[categoryId];
  return category?.bgColor || 'bg-gray-500/10';
};