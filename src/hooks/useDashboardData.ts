/**
 * useDashboardData Hook
 *
 * Single hook that fetches all data needed for the Dashboard.
 * Consolidates week progress, rank, level, streak, and history.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { kpiManager } from "@/lib/configurableKpis";
import {
  loadWeeklyKPIs,
  getCurrentWeek,
  getRecentWeeks,
  formatWeekKey,
} from "@/lib/weeklyKpi";
import { rankingManager, RANK_CONFIG, RankTier } from "@/lib/rankingSystem";
import { useProgressionStore } from "@/stores/progressionStore";
import { REALTIME_EVENTS } from "@/hooks/useRealtimeSync";

// Types
export type Rank = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface KPIBreakdown {
  id: string;
  name: string;
  percentage: number;
  color: string;
}

export interface WeekData {
  weekKey: string;
  percentage: number;
  rrChange?: number;
  rank?: Rank;
}

export interface DashboardData {
  // This week
  currentWeekPercentage: number;
  currentWeekKey: string;
  kpiBreakdown: KPIBreakdown[];

  // Rank
  rank: Rank;
  rrPoints: number;
  rrToNextRank: number;
  nextRank: Rank | null;
  rrChangeThisWeek: number;
  rankProgress: number; // 0-100 within current tier

  // Rank history
  rankHistory: WeekData[];

  // Level & XP
  level: number;
  xp: number;
  xpProgress: number; // 0-100 within current level
  xpGainedThisWeek: number;

  // Streak
  currentStreak: number;

  // Rolling 4 weeks
  lastFourWeeksPercentage: number;
  lastFourWeeks: WeekData[];

  // Year visualization
  yearWeeks: WeekData[];
}

// Rank thresholds
const RANK_THRESHOLDS: Record<Rank, { min: number; max: number }> = {
  bronze: { min: 0, max: 499 },
  silver: { min: 500, max: 999 },
  gold: { min: 1000, max: 1499 },
  platinum: { min: 1500, max: 1999 },
  diamond: { min: 2000, max: Infinity },
};

const RANK_ORDER: Rank[] = ["bronze", "silver", "gold", "platinum", "diamond"];

function getNextRank(currentRank: Rank): Rank | null {
  const index = RANK_ORDER.indexOf(currentRank);
  if (index === -1 || index === RANK_ORDER.length - 1) return null;
  return RANK_ORDER[index + 1];
}

function getRankFromRR(rr: number): Rank {
  if (rr >= 2000) return "diamond";
  if (rr >= 1500) return "platinum";
  if (rr >= 1000) return "gold";
  if (rr >= 500) return "silver";
  return "bronze";
}

function getRankProgress(rr: number, rank: Rank): number {
  const threshold = RANK_THRESHOLDS[rank];
  if (rank === "diamond") return 100;
  const range = threshold.max - threshold.min + 1;
  const progress = rr - threshold.min;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

function getRRToNextRank(rr: number, rank: Rank): number {
  const nextRank = getNextRank(rank);
  if (!nextRank) return 0;
  return RANK_THRESHOLDS[nextRank].min - rr;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const progression = useProgressionStore((state) => state.progression);
  const progressionLoading = useProgressionStore((state) => state.isLoading);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load KPIs and weekly data
      const [activeKPIs, userRank] = await Promise.all([
        kpiManager.getActiveKPIs(),
        rankingManager.getUserRank(),
      ]);

      const weeklyData = loadWeeklyKPIs();
      const currentWeekKey = getCurrentWeek();

      // Get current week's record
      const currentWeekRecord = weeklyData.records.find(
        (r) => r.weekKey === currentWeekKey,
      );

      // Calculate current week percentage
      const currentWeekPercentage = currentWeekRecord
        ? Math.round(
            kpiManager.calculateWeekCompletion(
              currentWeekRecord.values,
              activeKPIs,
            ),
          )
        : 0;

      // Build KPI breakdown
      const kpiBreakdown: KPIBreakdown[] = activeKPIs.map((kpi) => {
        // Use kpi.kpi_id (string identifier like "deepWorkHours") not kpi.id (UUID)
        const value = currentWeekRecord?.values[kpi.kpi_id] ?? 0;
        const percentage =
          kpi.target > 0
            ? Math.min(100, Math.round((value / kpi.target) * 100))
            : 0;
        return {
          id: kpi.kpi_id,
          name: kpi.name,
          percentage,
          color: kpi.color || "#5FE3B3",
        };
      });

      // Get recent weeks for history and calculations
      const recentWeekKeys = getRecentWeeks(52); // Full year
      const yearWeeks: WeekData[] = recentWeekKeys.map((weekKey) => {
        const record = weeklyData.records.find((r) => r.weekKey === weekKey);
        const percentage = record
          ? Math.round(
              kpiManager.calculateWeekCompletion(record.values, activeKPIs),
            )
          : 0;
        return { weekKey, percentage };
      });

      // Last 4 weeks
      const lastFourWeekKeys = getRecentWeeks(4);
      const lastFourWeeks: WeekData[] = lastFourWeekKeys.map((weekKey) => {
        const record = weeklyData.records.find((r) => r.weekKey === weekKey);
        const percentage = record
          ? Math.round(
              kpiManager.calculateWeekCompletion(record.values, activeKPIs),
            )
          : 0;
        return { weekKey, percentage };
      });

      const lastFourWeeksPercentage =
        lastFourWeeks.length > 0
          ? Math.round(
              lastFourWeeks.reduce((sum, w) => sum + w.percentage, 0) /
                lastFourWeeks.length,
            )
          : 0;

      // Rank data
      const rrPoints = userRank?.rr_points ?? 0;
      const rank = getRankFromRR(rrPoints);
      const nextRank = getNextRank(rank);
      const rrToNextRank = getRRToNextRank(rrPoints, rank);
      const rankProgress = getRankProgress(rrPoints, rank);

      // TODO: Calculate actual RR change this week from history
      // For now, estimate based on current week performance
      const rrChangeThisWeek = Math.round((currentWeekPercentage - 50) * 1.5);

      // Rank history (last 8 weeks)
      const rankHistoryWeeks = getRecentWeeks(8);
      const rankHistory: WeekData[] = rankHistoryWeeks.map((weekKey) => {
        const record = weeklyData.records.find((r) => r.weekKey === weekKey);
        const percentage = record
          ? Math.round(
              kpiManager.calculateWeekCompletion(record.values, activeKPIs),
            )
          : 0;
        // Estimate RR change based on performance
        const rrChange = Math.round((percentage - 50) * 1.5);
        return { weekKey, percentage, rrChange, rank };
      });

      // Level & XP from progression store
      const level = progression?.level ?? 1;
      const xp = progression?.xp ?? 0;
      const xpInCurrentLevel = xp % 100;
      const xpProgress = xpInCurrentLevel;

      // Estimate XP gained this week based on completion
      let xpGainedThisWeek = 0;
      if (currentWeekPercentage >= 100) xpGainedThisWeek = 100;
      else if (currentWeekPercentage >= 80) xpGainedThisWeek = 75;
      else if (currentWeekPercentage >= 60) xpGainedThisWeek = 50;
      else if (currentWeekPercentage >= 40) xpGainedThisWeek = 25;
      else if (currentWeekPercentage >= 20) xpGainedThisWeek = 10;

      // Streak
      const currentStreak =
        progression?.current_streak ?? userRank?.current_streak_days ?? 0;

      setData({
        currentWeekPercentage,
        currentWeekKey,
        kpiBreakdown,
        rank,
        rrPoints,
        rrToNextRank,
        nextRank,
        rrChangeThisWeek,
        rankProgress,
        rankHistory,
        level,
        xp,
        xpProgress,
        xpGainedThisWeek,
        currentStreak,
        lastFourWeeksPercentage,
        lastFourWeeks,
        yearWeeks,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load dashboard data"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, progression]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for real-time KPI updates
  useEffect(() => {
    const handleKPIUpdate = () => {
      console.log("[Dashboard] KPI update detected, refreshing data...");
      loadData();
    };

    window.addEventListener(REALTIME_EVENTS.KPI_UPDATED, handleKPIUpdate);
    window.addEventListener(
      REALTIME_EVENTS.PROGRESSION_UPDATED,
      handleKPIUpdate,
    );

    return () => {
      window.removeEventListener(REALTIME_EVENTS.KPI_UPDATED, handleKPIUpdate);
      window.removeEventListener(
        REALTIME_EVENTS.PROGRESSION_UPDATED,
        handleKPIUpdate,
      );
    };
  }, [loadData]);

  // Refresh function
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading: isLoading || progressionLoading,
    error,
    refresh,
  };
}

export default useDashboardData;
