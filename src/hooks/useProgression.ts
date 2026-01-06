/**
 * useProgression Hook
 *
 * Single hook for all progression functionality.
 * Replaces: useGamification, useGamificationMode, useGamificationFeatures, etc.
 */

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProgressionStore,
  useLevel,
  useXP,
  useRank,
  useRRPoints,
  useStreak,
  useIsLoading,
  useIsInitialized,
  usePendingToasts,
} from "@/stores/progressionStore";
import {
  ACHIEVEMENTS,
  RANK_THRESHOLDS,
  getXPProgress,
  getRRProgress,
} from "@/lib/progression";

/**
 * Main progression hook - use this for most cases
 */
export function useProgression() {
  const { user } = useAuth();
  const store = useProgressionStore();

  // Auto-initialize when user is available
  useEffect(() => {
    if (user?.id && !store.isInitialized && !store.isLoading) {
      store.initialize(user.id);
    }
  }, [user?.id, store.isInitialized, store.isLoading]);

  // Computed values
  const level = store.getLevel();
  const xp = store.getXP();
  const xpProgress = store.getXPProgress();
  const rank = store.getRank();
  const rrPoints = store.getRRPoints();
  const rrProgress = store.getRRProgress();
  const streak = store.getStreak();
  const longestStreak = store.getLongestStreak();
  const weeksCompleted = store.getWeeksCompleted();
  const perfectWeeks = store.getPerfectWeeks();
  const achievements = store.getAchievements();
  const rankInfo = store.getRankInfo();

  return {
    // State
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    error: store.error,

    // Level & XP
    level,
    xp,
    xpProgress,

    // Rank
    rank,
    rankInfo,
    rrPoints,
    rrProgress,

    // Streaks & Stats
    streak,
    longestStreak,
    weeksCompleted,
    perfectWeeks,

    // Achievements
    achievements,

    // Toasts
    pendingToasts: store.pendingToasts,
    dismissToast: store.dismissToast,
    clearToasts: store.clearToasts,

    // Actions
    onShip: store.onShip,
    onContent: store.onContent,
    onWeekComplete: store.onWeekComplete,
    refresh: store.refresh,
  };
}

/**
 * Lightweight hook for just displaying level badge
 */
export function useLevelBadge() {
  const level = useLevel();
  const rank = useRank();
  const streak = useStreak();
  const isLoading = useIsLoading();

  const rankInfo = RANK_THRESHOLDS[rank];

  return {
    level,
    rank,
    rankIcon: rankInfo.icon,
    rankColor: rankInfo.color,
    rankName: rank.charAt(0).toUpperCase() + rank.slice(1),
    streak,
    isLoading,
  };
}

/**
 * Hook for achievement toasts
 */
export function useAchievementToasts() {
  const pendingToasts = usePendingToasts();
  const dismissToast = useProgressionStore((state) => state.dismissToast);
  const clearToasts = useProgressionStore((state) => state.clearToasts);

  return {
    toasts: pendingToasts,
    dismiss: dismissToast,
    clearAll: clearToasts,
  };
}

/**
 * Hook for XP actions (to be used by ShipFeed, Content creation, KPI hooks, etc.)
 */
export function useXPActions() {
  const store = useProgressionStore();

  return {
    onShip: store.onShip,
    onContent: store.onContent,
    onWeekComplete: store.onWeekComplete,
    onKPIEntry: store.onKPIEntry,
  };
}

export default useProgression;
