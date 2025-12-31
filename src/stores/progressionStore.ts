/**
 * Progression Store
 * 
 * Single Zustand store for all progression state.
 * Replaces: achievementStore, characterStore, questStore, skillProgressionStore
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  UserProgression,
  Achievement,
  ACHIEVEMENTS,
  RANK_THRESHOLDS,
  getUserProgression,
  initializeProgression,
  getUnlockedAchievements,
  addXP,
  processShip,
  processContent,
  processWeeklyCompletion,
  checkAndUnlockAchievements,
  getXPProgress,
  getRRProgress,
  Rank,
} from '@/lib/progression';

// ============================================
// Types
// ============================================

interface ProgressionState {
  // Data
  progression: UserProgression | null;
  unlockedAchievementIds: string[];
  
  // UI State
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Toast queue for achievement notifications
  pendingToasts: Achievement[];
  
  // Actions
  initialize: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  
  // XP Actions
  onShip: () => Promise<{ xpGained: number; leveledUp: boolean }>;
  onContent: () => Promise<{ xpGained: number; leveledUp: boolean }>;
  onWeekComplete: (completionPercentage: number, rrPoints: number) => Promise<{ xpGained: number; leveledUp: boolean }>;
  
  // Toast Actions
  dismissToast: (achievementId: string) => void;
  clearToasts: () => void;
  
  // Computed Getters (called as functions for reactivity)
  getLevel: () => number;
  getXP: () => number;
  getXPProgress: () => { current: number; required: number; percentage: number };
  getRank: () => Rank;
  getRRPoints: () => number;
  getRRProgress: () => { current: number; required: number; percentage: number; nextRank: Rank | null };
  getStreak: () => number;
  getLongestStreak: () => number;
  getWeeksCompleted: () => number;
  getPerfectWeeks: () => number;
  getAchievements: () => { unlocked: Achievement[]; locked: Achievement[]; total: number; unlockedCount: number };
  getRankInfo: () => { color: string; icon: string; name: string };
}

// ============================================
// Store
// ============================================

let currentUserId: string | null = null;

export const useProgressionStore = create<ProgressionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      progression: null,
      unlockedAchievementIds: [],
      isLoading: false,
      isInitialized: false,
      error: null,
      pendingToasts: [],

      // Initialize progression for a user
      initialize: async (userId: string) => {
        if (get().isLoading) return;
        
        currentUserId = userId;
        set({ isLoading: true, error: null });

        try {
          // Get or create progression
          let progression = await getUserProgression(userId);
          if (!progression) {
            progression = await initializeProgression(userId);
          }

          // Get unlocked achievements
          const unlockedIds = await getUnlockedAchievements(userId);

          set({
            progression,
            unlockedAchievementIds: unlockedIds,
            isLoading: false,
            isInitialized: true,
            error: null,
          });

          // Check for any new achievements (in case data changed externally)
          const newAchievements = await checkAndUnlockAchievements(userId);
          if (newAchievements.length > 0) {
            set((state) => ({
              unlockedAchievementIds: [...state.unlockedAchievementIds, ...newAchievements.map(a => a.id)],
              pendingToasts: [...state.pendingToasts, ...newAchievements],
            }));
          }
        } catch (error) {
          console.error('Failed to initialize progression:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to initialize progression',
          });
        }
      },

      // Refresh progression data
      refresh: async () => {
        if (!currentUserId) return;
        
        try {
          const progression = await getUserProgression(currentUserId);
          const unlockedIds = await getUnlockedAchievements(currentUserId);

          set({
            progression,
            unlockedAchievementIds: unlockedIds,
          });
        } catch (error) {
          console.error('Failed to refresh progression:', error);
        }
      },

      // Handle ship event
      onShip: async () => {
        if (!currentUserId) return { xpGained: 0, leveledUp: false };

        try {
          const result = await processShip(currentUserId);
          
          set((state) => ({
            progression: result.progression,
            unlockedAchievementIds: [
              ...state.unlockedAchievementIds,
              ...result.newAchievements.map(a => a.id),
            ],
            pendingToasts: [...state.pendingToasts, ...result.newAchievements],
          }));

          return { xpGained: result.xpGained, leveledUp: result.leveledUp };
        } catch (error) {
          console.error('Failed to process ship:', error);
          return { xpGained: 0, leveledUp: false };
        }
      },

      // Handle content creation event
      onContent: async () => {
        if (!currentUserId) return { xpGained: 0, leveledUp: false };

        try {
          const result = await processContent(currentUserId);
          
          set((state) => ({
            progression: result.progression,
            unlockedAchievementIds: [
              ...state.unlockedAchievementIds,
              ...result.newAchievements.map(a => a.id),
            ],
            pendingToasts: [...state.pendingToasts, ...result.newAchievements],
          }));

          return { xpGained: result.xpGained, leveledUp: result.leveledUp };
        } catch (error) {
          console.error('Failed to process content:', error);
          return { xpGained: 0, leveledUp: false };
        }
      },

      // Handle weekly completion
      onWeekComplete: async (completionPercentage: number, rrPoints: number) => {
        if (!currentUserId) return { xpGained: 0, leveledUp: false };

        try {
          const result = await processWeeklyCompletion(currentUserId, completionPercentage, rrPoints);
          
          set((state) => ({
            progression: result.progression,
            unlockedAchievementIds: [
              ...state.unlockedAchievementIds,
              ...result.newAchievements.map(a => a.id),
            ],
            pendingToasts: [...state.pendingToasts, ...result.newAchievements],
          }));

          return { xpGained: result.xpGained, leveledUp: result.leveledUp };
        } catch (error) {
          console.error('Failed to process weekly completion:', error);
          return { xpGained: 0, leveledUp: false };
        }
      },

      // Dismiss a toast
      dismissToast: (achievementId: string) => {
        set((state) => ({
          pendingToasts: state.pendingToasts.filter(a => a.id !== achievementId),
        }));
      },

      // Clear all toasts
      clearToasts: () => {
        set({ pendingToasts: [] });
      },

      // Computed getters
      getLevel: () => get().progression?.level ?? 1,
      
      getXP: () => get().progression?.xp ?? 0,
      
      getXPProgress: () => {
        const xp = get().progression?.xp ?? 0;
        return getXPProgress(xp);
      },
      
      getRank: () => get().progression?.rank ?? 'bronze',
      
      getRRPoints: () => get().progression?.rr_points ?? 0,
      
      getRRProgress: () => {
        const rr = get().progression?.rr_points ?? 0;
        return getRRProgress(rr);
      },
      
      getStreak: () => get().progression?.current_streak ?? 0,
      
      getLongestStreak: () => get().progression?.longest_streak ?? 0,
      
      getWeeksCompleted: () => get().progression?.weeks_completed ?? 0,
      
      getPerfectWeeks: () => get().progression?.perfect_weeks ?? 0,
      
      getAchievements: () => {
        const unlockedIds = get().unlockedAchievementIds;
        const unlocked = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
        const locked = ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id));
        
        return {
          unlocked,
          locked,
          total: ACHIEVEMENTS.length,
          unlockedCount: unlocked.length,
        };
      },
      
      getRankInfo: () => {
        const rank = get().progression?.rank ?? 'bronze';
        const info = RANK_THRESHOLDS[rank];
        return {
          color: info.color,
          icon: info.icon,
          name: rank.charAt(0).toUpperCase() + rank.slice(1),
        };
      },
    }),
    { name: 'progression-store' }
  )
);

// ============================================
// Selector Hooks (for better performance)
// ============================================

export const useLevel = () => useProgressionStore((state) => state.progression?.level ?? 1);
export const useXP = () => useProgressionStore((state) => state.progression?.xp ?? 0);
export const useRank = () => useProgressionStore((state) => state.progression?.rank ?? 'bronze');
export const useRRPoints = () => useProgressionStore((state) => state.progression?.rr_points ?? 0);
export const useStreak = () => useProgressionStore((state) => state.progression?.current_streak ?? 0);
export const useIsLoading = () => useProgressionStore((state) => state.isLoading);
export const useIsInitialized = () => useProgressionStore((state) => state.isInitialized);
export const usePendingToasts = () => useProgressionStore((state) => state.pendingToasts);
