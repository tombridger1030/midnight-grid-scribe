import { userStorage } from "./userStorage";
import { kpiManager, ConfigurableKPI } from "./configurableKpis";
import {
  loadWeeklyKPIs,
  getCurrentWeek,
  getWeeklyKPIRecord,
  getWeekDates,
} from "./weeklyKpi";
import { supabase } from "./supabase";

// Ranking system types
export type RankTier =
  | "bronze"
  | "gold"
  | "platinum"
  | "diamond"
  | "grandmaster";

export interface UserRank {
  current_rank: RankTier;
  rr_points: number;
  total_weeks: number;
  weeks_completed: number;
  last_assessment: string; // ISO date string
  created_at: string;
  updated_at: string;
  // Gamification fields
  character_level?: number;
  total_stat_xp?: number;
  current_streak_days?: number;
  longest_streak_days?: number;
  critical_hit_count?: number;
}

export interface RankChange {
  week_key: string;
  old_rank: RankTier;
  new_rank: RankTier;
  old_rr: number;
  new_rr: number;
  completion_percentage: number;
  timestamp: string;
}

export interface WeeklyAssessment {
  week_key: string;
  completion_percentage: number;
  rr_change: number;
  rank_before: RankTier;
  rank_after: RankTier;
  kpi_breakdown: Array<{
    kpi_id: string;
    name: string;
    completed: boolean;
    percentage: number;
  }>;
}

// Rank configuration
export const RANK_CONFIG: Record<
  RankTier,
  {
    name: string;
    min_rr: number;
    max_rr: number;
    color: string;
    icon: string;
    rr_multiplier: number;
  }
> = {
  bronze: {
    name: "Bronze",
    min_rr: 0,
    max_rr: 199,
    color: "#CD7F32",
    icon: "🥉",
    rr_multiplier: 1.0,
  },
  gold: {
    name: "Gold",
    min_rr: 200,
    max_rr: 499,
    color: "#FFD700",
    icon: "🥇",
    rr_multiplier: 1.5,
  },
  platinum: {
    name: "Platinum",
    min_rr: 500,
    max_rr: 999,
    color: "#E5E4E2",
    icon: "💎",
    rr_multiplier: 2.0,
  },
  diamond: {
    name: "Diamond",
    min_rr: 1000,
    max_rr: 1999,
    color: "#185ADB",
    icon: "💎",
    rr_multiplier: 3.0,
  },
  grandmaster: {
    name: "Grandmaster",
    min_rr: 2000,
    max_rr: 9999,
    color: "#B026FF",
    icon: "👑",
    rr_multiplier: 5.0,
  },
};

// Base RR values
const BASE_RR_GAIN = 50;
const BASE_RR_LOSS = 30;
const COMPLETION_THRESHOLD = 50; // Below this percentage = RR loss

export class RankingManager {
  // Get user's current rank data
  async getUserRank(): Promise<UserRank | null> {
    try {
      const rankData = await userStorage.getUserRank();
      return rankData;
    } catch (error) {
      console.error("Failed to get user rank:", error);
      return null;
    }
  }

  // Initialize ranking for new user
  async initializeUserRank(): Promise<UserRank> {
    const initialRank: Omit<UserRank, "created_at" | "updated_at"> = {
      current_rank: "bronze",
      rr_points: 100, // Start in middle of bronze
      total_weeks: 0,
      weeks_completed: 0,
      last_assessment: new Date().toISOString(),
    };

    try {
      const savedRank = await userStorage.setUserRank(initialRank);
      return savedRank;
    } catch (error) {
      console.error("Failed to initialize user rank:", error);
      throw error;
    }
  }

  // Calculate weekly completion percentage
  async calculateWeeklyCompletion(weekKey: string): Promise<WeeklyAssessment> {
    const activeKPIs = await kpiManager.getActiveKPIs();
    const weekRecord = getWeeklyKPIRecord(weekKey);

    if (activeKPIs.length === 0) {
      throw new Error("No active KPIs found");
    }

    // If no record exists for this week, return empty assessment
    if (!weekRecord || !weekRecord.values) {
      return {
        week_key: weekKey,
        completion_percentage: 0,
        rr_change: 0,
        rank_before: "bronze",
        rank_after: "bronze",
        kpi_breakdown: activeKPIs.map((kpi) => ({
          kpi_id: kpi.kpi_id,
          name: kpi.name,
          current_value: 0,
          target_value: kpi.min_target || kpi.target,
          completion_percentage: 0,
          completed: false,
        })),
        assessed_at: new Date().toISOString(),
      };
    }

    // Use the same calculation method as other components (kpiManager)
    const completionPercentage = Math.round(
      kpiManager.calculateWeekCompletion(weekRecord.values, activeKPIs),
    );

    // Create KPI breakdown for detailed assessment
    const kpiBreakdown = activeKPIs.map((kpi) => {
      const currentValue = weekRecord.values[kpi.kpi_id] || 0;
      const targetValue = kpi.min_target || kpi.target;

      // Calculate percentage using the KPI manager's logic (simplified for breakdown)
      let percentage: number;
      if (kpi.equal_is_better) {
        const difference = Math.abs(currentValue - targetValue);
        const tolerance = targetValue * 0.1;
        const maxAcceptableDifference = targetValue * 0.5;

        if (difference <= tolerance) {
          percentage = 100;
        } else {
          percentage = Math.max(
            0,
            (1 -
              (difference - tolerance) /
                (maxAcceptableDifference - tolerance)) *
              100,
          );
        }
      } else if (kpi.reverse_scoring) {
        if (currentValue <= targetValue) {
          percentage = 100;
        } else {
          const excess = currentValue - targetValue;
          const maxAcceptableExcess = targetValue * 0.5;
          percentage = Math.max(0, (1 - excess / maxAcceptableExcess) * 100);
        }
      } else {
        // Normal scoring (higher is better)
        percentage =
          targetValue > 0
            ? Math.min(100, (currentValue / targetValue) * 100)
            : 0;
      }

      const completed = percentage >= 100;

      return {
        kpi_id: kpi.kpi_id,
        name: kpi.name,
        current_value: currentValue,
        target_value: targetValue,
        completion_percentage: Math.round(percentage),
        completed,
      };
    });

    // Get current rank for before/after comparison
    const currentRank = await this.getUserRank();
    const currentRankTier = currentRank?.current_rank || "bronze";

    return {
      week_key: weekKey,
      completion_percentage: completionPercentage,
      rr_change: 0, // Will be calculated by assessWeeklyPerformance
      rank_before: currentRankTier,
      rank_after: currentRankTier, // Will be updated by assessWeeklyPerformance
      kpi_breakdown: kpiBreakdown,
    };
  }

  // Calculate RR change based on completion percentage and current rank
  calculateRRChange(
    completionPercentage: number,
    currentRank: RankTier,
  ): number {
    return this.calculateRRChangeWithGamification(
      completionPercentage,
      currentRank,
    );
  }

  // Enhanced RR calculation with gamification mechanics
  calculateRRChangeWithGamification(
    completionPercentage: number,
    currentRank: RankTier,
    isCriticalHit: boolean = false,
    streakMultiplier: number = 1,
  ): number {
    const rankConfig = RANK_CONFIG[currentRank];
    let baseChange: number;

    if (completionPercentage >= 100) {
      // Perfect completion (100%)
      baseChange = BASE_RR_GAIN; // +50 RR
    } else if (completionPercentage >= 80) {
      // Excellent completion (80-99%)
      baseChange = BASE_RR_GAIN * 0.7; // +35 RR
    } else if (completionPercentage >= COMPLETION_THRESHOLD) {
      // Good completion (50-79%)
      baseChange = BASE_RR_GAIN * 0.3; // +15 RR
    } else if (completionPercentage >= 40) {
      // Close to target (40-49%) - small penalty
      baseChange = -10; // -10 RR (not too harsh)
    } else if (completionPercentage >= 30) {
      // Below target (30-39%) - medium penalty
      baseChange = -20; // -20 RR (your 35% example)
    } else if (completionPercentage >= 20) {
      // Poor performance (20-29%) - large penalty
      baseChange = -BASE_RR_LOSS; // -30 RR
    } else {
      // Very poor performance (0-19%) - maximum penalty
      baseChange = -40; // -40 RR (for really bad weeks)
    }

    // Apply rank multiplier (exponential scaling)
    const adjustedChange = baseChange * rankConfig.rr_multiplier;

    // Apply critical hit multiplier (1.5x + random bonus up to 0.5x)
    const criticalMultiplier = isCriticalHit ? 1.5 + Math.random() * 0.5 : 1;

    // Apply streak bonus (10% per streak day, max 100% bonus)
    const streakBonus = Math.min(streakMultiplier * 0.1, 1);
    const finalMultiplier = criticalMultiplier * (1 + streakBonus);

    const finalChange = adjustedChange * finalMultiplier;

    return Math.round(finalChange);
  }

  // Determine rank based on RR points
  getRankFromRR(rrPoints: number): RankTier {
    if (rrPoints >= RANK_CONFIG.grandmaster.min_rr) return "grandmaster";
    if (rrPoints >= RANK_CONFIG.diamond.min_rr) return "diamond";
    if (rrPoints >= RANK_CONFIG.platinum.min_rr) return "platinum";
    if (rrPoints >= RANK_CONFIG.gold.min_rr) return "gold";
    return "bronze";
  }

  // Load specialized KPI data for any given week
  async loadSpecializedKPIsForWeek(
    weekKey: string,
    userId: string,
  ): Promise<{
    trainingSessions: number;
    sleepAverage: number;
    nutrition: number;
    weightDaysTracked: number;
  }> {
    const { start, end } = getWeekDates(weekKey);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    try {
      // Query all specialized KPI tables in parallel
      const [trainingResult, sleepResult, nutritionResult, weightResult] =
        await Promise.all([
          // Training sessions that count toward target
          supabase
            .from("training_sessions")
            .select("id, training_type:training_types(counts_toward_target)")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate),

          // Sleep entries
          supabase
            .from("sleep_entries")
            .select("hours")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate),

          // Nutrition entries
          supabase
            .from("nutrition_entries")
            .select("*")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate),

          // Weight entries
          supabase
            .from("weight_entries")
            .select("id")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate),
        ]);

      // Calculate training sessions (only those that count toward target)
      const trainingSessions =
        trainingResult.data?.filter(
          (s: any) => s.training_type?.counts_toward_target !== false,
        ).length || 0;

      // Calculate sleep average
      const sleepEntries = sleepResult.data || [];
      const sleepAverage =
        sleepEntries.length > 0
          ? sleepEntries.reduce(
              (sum: number, e: any) => sum + (e.hours || 0),
              0,
            ) / sleepEntries.length
          : 0;

      // Calculate nutrition score
      const nutritionEntries = nutritionResult.data || [];
      let nutritionScore = 0;
      if (nutritionEntries.length > 0) {
        // Get targets from a default (can't access localStorage here)
        const targetCalories = 2000;
        const targetProtein = 150;

        // Calculate daily totals and averages
        let totalCalories = 0;
        let totalProtein = 0;
        for (const entry of nutritionEntries) {
          totalCalories +=
            (entry.breakfast_calories || 0) +
            (entry.lunch_calories || 0) +
            (entry.dinner_calories || 0) +
            (entry.snacks_calories || 0);
          totalProtein +=
            (entry.breakfast_protein || 0) +
            (entry.lunch_protein || 0) +
            (entry.dinner_protein || 0) +
            (entry.snacks_protein || 0);
        }

        const avgCalories = totalCalories / nutritionEntries.length;
        const avgProtein = totalProtein / nutritionEntries.length;

        const calorieScore = Math.min(
          100,
          (avgCalories / targetCalories) * 100,
        );
        const proteinScore = Math.min(100, (avgProtein / targetProtein) * 100);
        nutritionScore = Math.round((calorieScore + proteinScore) / 2);
      }

      // Count weight days tracked
      const weightDaysTracked = weightResult.data?.length || 0;

      return {
        trainingSessions,
        sleepAverage,
        nutrition: nutritionScore,
        weightDaysTracked,
      };
    } catch (error) {
      console.error("Failed to load specialized KPIs for week:", error);
      return {
        trainingSessions: 0,
        sleepAverage: 0,
        nutrition: 0,
        weightDaysTracked: 0,
      };
    }
  }

  // Reset rank history and user rank to initial state
  async resetRankHistory(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user for rank reset");
        return;
      }

      // Delete all rank history for this user
      const { error: deleteError } = await supabase
        .from("rank_history")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Failed to delete rank history:", deleteError);
      }

      // Reset user rank to initial state
      const initialRank: Omit<UserRank, "created_at" | "updated_at"> = {
        current_rank: "bronze",
        rr_points: 100,
        total_weeks: 0,
        weeks_completed: 0,
        last_assessment: new Date().toISOString(),
      };

      await userStorage.setUserRank(initialRank);
      console.log("Rank history reset complete");
    } catch (error) {
      console.error("Failed to reset rank history:", error);
      throw error;
    }
  }

  // Full reset and regenerate rank history with specialized KPIs
  async resetAndRegenerateRankHistory(): Promise<void> {
    console.log("Starting full rank history reset and regeneration...");
    await this.resetRankHistory();
    // Small delay to ensure database operations complete
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.generateRankHistoryFromKPIs();
    console.log("Rank history reset and regeneration complete!");
  }

  // Assess weekly performance and update rank
  async assessWeeklyPerformance(weekKey: string): Promise<WeeklyAssessment> {
    try {
      // Get current rank data
      let currentRank = await this.getUserRank();
      if (!currentRank) {
        currentRank = await this.initializeUserRank();
      }

      // Calculate completion for the week
      const assessment = await this.calculateWeeklyCompletion(weekKey);

      // Calculate RR change
      const rrChange = this.calculateRRChange(
        assessment.completion_percentage,
        currentRank.current_rank,
      );

      // Apply RR change (don't let RR go below 0)
      const newRR = Math.max(0, currentRank.rr_points + rrChange);

      // Determine new rank
      const newRank = this.getRankFromRR(newRR);

      // Update assessment with calculated values
      assessment.rr_change = rrChange;
      assessment.rank_after = newRank;

      // Save updated rank data
      const updatedRank: Omit<UserRank, "created_at" | "updated_at"> = {
        current_rank: newRank,
        rr_points: newRR,
        total_weeks: currentRank.total_weeks + 1,
        weeks_completed:
          assessment.completion_percentage >= COMPLETION_THRESHOLD
            ? currentRank.weeks_completed + 1
            : currentRank.weeks_completed,
        last_assessment: new Date().toISOString(),
      };

      await userStorage.setUserRank(updatedRank);

      // Save rank change history if rank changed
      if (newRank !== currentRank.current_rank) {
        await this.saveRankChange({
          week_key: weekKey,
          old_rank: currentRank.current_rank,
          new_rank: newRank,
          old_rr: currentRank.rr_points,
          new_rr: newRR,
          completion_percentage: assessment.completion_percentage,
          timestamp: new Date().toISOString(),
        });
      }

      return assessment;
    } catch (error) {
      console.error("Failed to assess weekly performance:", error);
      throw error;
    }
  }

  // Save rank change to history
  async saveRankChange(change: RankChange): Promise<void> {
    try {
      await userStorage.saveRankChange(change);
    } catch (error) {
      console.error("Failed to save rank change:", error);
    }
  }

  // Get rank change history
  async getRankHistory(): Promise<RankChange[]> {
    try {
      const history = await userStorage.getRankHistory();

      // If no history exists, try to generate it from existing KPI data
      if (history.length === 0) {
        await this.generateRankHistoryFromKPIs();
        // Try again after generation
        return await userStorage.getRankHistory();
      }

      return history;
    } catch (error) {
      console.error("Failed to get rank history:", error);
      return [];
    }
  }

  // Clear existing rank history (for recalculation)
  async clearRankHistory(): Promise<void> {
    try {
      await userStorage.clearRankHistory();
    } catch (error) {
      console.error("Failed to clear rank history:", error);
    }
  }

  // Regenerate rank history (clears existing first)
  async regenerateRankHistory(): Promise<void> {
    // Prevent multiple regenerations running at once
    if ((this as any)._regenerating) {
      return;
    }

    try {
      (this as any)._regenerating = true;

      await this.clearRankHistory();
      // Add a small delay to ensure clear operation completes
      await new Promise((resolve) => setTimeout(resolve, 200));

      await this.generateRankHistoryFromKPIs();
    } finally {
      (this as any)._regenerating = false;
    }
  }

  // Force regenerate rank history with debug output (for troubleshooting)
  async debugRegenerateRankHistory(): Promise<void> {
    // Force clear any existing regeneration flag
    (this as any)._regenerating = false;

    await this.clearRankHistory();

    // Verify clearing worked
    const clearedHistory = await this.getRankHistory();

    // Add delay to ensure clear operation fully completes
    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.generateRankHistoryFromKPIs();

    // Show the results
    const history = await this.getRankHistory();

    // Group by week to identify duplicates
    const byWeek = new Map<string, number>();
    history.forEach((change) => {
      byWeek.set(change.week_key, (byWeek.get(change.week_key) || 0) + 1);
    });

    Array.from(byWeek.entries())
      .sort()
      .forEach(([week, count]) => {});

    history.forEach((change, index) => {});
  }

  // Generate rank history retroactively from existing KPI data
  async generateRankHistoryFromKPIs(): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user for rank generation");
        return;
      }

      // Get all weekly KPI records from local storage first (more complete data)
      const localData = loadWeeklyKPIs();
      let weeklyRecords = localData.records || [];

      // If no local data, try Supabase
      if (weeklyRecords.length === 0) {
        const weeklyData = await userStorage.getUserWeeklyKPIs();
        weeklyRecords = (weeklyData.records || []).map((record: any) => ({
          weekKey: record.week_key,
          values: record.data?.values || record.data || {},
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        }));
      }

      if (weeklyRecords.length === 0) {
        return;
      }

      // Sort records by week key (oldest first) and remove duplicates
      const uniqueWeeks = new Map<string, any>();

      // Keep only the most recent record for each week (by updatedAt)
      weeklyRecords
        .filter(
          (record) =>
            record.weekKey &&
            record.values &&
            Object.keys(record.values).length > 0,
        )
        .forEach((record) => {
          const existing = uniqueWeeks.get(record.weekKey);
          if (
            !existing ||
            (record.updatedAt && record.updatedAt > (existing.updatedAt || ""))
          ) {
            uniqueWeeks.set(record.weekKey, record);
          }
        });

      const sortedWeeks = Array.from(uniqueWeeks.values()).sort((a, b) =>
        a.weekKey.localeCompare(b.weekKey),
      );

      if (sortedWeeks.length === 0) {
        return;
      }

      // Initialize with starting rank
      let currentRank = await this.getUserRank();
      if (!currentRank) {
        currentRank = await this.initializeUserRank();
      }

      // Start with bronze rank and 100 RR for retroactive calculation
      let runningRank: RankTier = "bronze";
      let runningRR = 100;

      // Get active KPIs once (reuse for all weeks)
      const activeKPIs = await kpiManager.getActiveKPIs();

      // Specialized KPI configs (same targets as dashboard)
      const trainingKpiForTarget = activeKPIs.find(
        (k: any) => k.kpi_type === "training",
      );
      const specializedKpiConfigs = [
        {
          kpi_id: "trainingSessions",
          name: "Training",
          target: trainingKpiForTarget?.target ?? 4,
          is_active: true,
          weight: 1,
        },
        {
          kpi_id: "sleepAverage",
          name: "Sleep",
          target: 7,
          is_active: true,
          weight: 1,
        },
        {
          kpi_id: "nutrition",
          name: "Nutrition",
          target: 100,
          is_active: true,
          weight: 1,
        },
        {
          kpi_id: "weightDaysTracked",
          name: "Weight Tracking",
          target: 7,
          is_active: true,
          weight: 1,
        },
      ];

      // Combine KPIs (avoid duplicates)
      const kpiIds = new Set(activeKPIs.map((k: any) => k.kpi_id));
      const uniqueSpecialized = specializedKpiConfigs.filter(
        (k) => !kpiIds.has(k.kpi_id),
      );
      const combinedKpis = [...activeKPIs, ...uniqueSpecialized];

      for (const weekRecord of sortedWeeks) {
        try {
          const weekKey = weekRecord.weekKey;

          // Validate week key format (should be YYYY-WXX)
          if (!weekKey || !/^\d{4}-W\d{2}$/.test(weekKey)) {
            console.warn(`Skipping invalid week key: ${weekKey}`);
            continue;
          }

          // Extract database KPI values from the record
          const dbValues = weekRecord.values || {};

          // Load specialized KPI values for this week
          const specializedValues = await this.loadSpecializedKPIsForWeek(
            weekKey,
            user.id,
          );

          // Merge values (specialized values override database values if both exist)
          const mergedValues = {
            ...dbValues,
            trainingSessions: specializedValues.trainingSessions,
            sleepAverage: specializedValues.sleepAverage,
            nutrition: specializedValues.nutrition,
            weightDaysTracked: specializedValues.weightDaysTracked,
          };

          // Skip if no meaningful values
          const hasDbValues = Object.keys(dbValues).length > 0;
          const hasSpecializedValues =
            specializedValues.trainingSessions > 0 ||
            specializedValues.sleepAverage > 0 ||
            specializedValues.nutrition > 0 ||
            specializedValues.weightDaysTracked > 0;

          if (!hasDbValues && !hasSpecializedValues) {
            continue;
          }

          // Calculate completion percentage using merged data
          let completionPercentage = 0;

          if (combinedKpis.length > 0) {
            completionPercentage = Math.round(
              kpiManager.calculateWeekCompletion(mergedValues, combinedKpis),
            );
          }

          // Skip weeks with 0% completion
          if (completionPercentage === 0) {
            continue;
          }

          // Calculate RR change for this week
          const rrChange = this.calculateRRChange(
            completionPercentage,
            runningRank,
          );
          const newRR = Math.max(0, runningRR + rrChange);
          const newRank = this.getRankFromRR(newRR);

          // Create rank change record
          const rankChange: RankChange = {
            week_key: weekKey,
            old_rank: runningRank,
            new_rank: newRank,
            old_rr: runningRR,
            new_rr: newRR,
            completion_percentage: completionPercentage,
            timestamp:
              weekRecord.updatedAt ||
              weekRecord.createdAt ||
              new Date().toISOString(),
          };

          // Save this rank change
          await this.saveRankChange(rankChange);

          // Update running totals for next iteration
          runningRank = newRank;
          runningRR = newRR;
        } catch (error) {
          console.error(`Failed to process week ${weekRecord.weekKey}:`, error);
          continue;
        }
      }

      // Update user's current rank to reflect the final calculated rank
      const updatedRank: Omit<UserRank, "created_at" | "updated_at"> = {
        current_rank: runningRank,
        rr_points: runningRR,
        total_weeks: sortedWeeks.length,
        weeks_completed: sortedWeeks.filter((w) => {
          try {
            const values = w.values || {};
            return Object.keys(values).length > 0;
          } catch {
            return false;
          }
        }).length,
        last_assessment: new Date().toISOString(),
      };

      await userStorage.setUserRank(updatedRank);
      console.log(
        `Rank history regenerated: ${runningRank} with ${runningRR} RR`,
      );
    } catch (error) {
      console.error("Failed to generate rank history from KPIs:", error);
    }
  }

  // Get rank progress within current tier
  getRankProgress(rrPoints: number, currentRank: RankTier): number {
    const config = RANK_CONFIG[currentRank];
    const progress =
      ((rrPoints - config.min_rr) / (config.max_rr - config.min_rr)) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  // Get next rank information
  getNextRank(
    currentRank: RankTier,
  ): { rank: RankTier; rrNeeded: number } | null {
    const ranks: RankTier[] = [
      "bronze",
      "gold",
      "platinum",
      "diamond",
      "grandmaster",
    ];
    const currentIndex = ranks.indexOf(currentRank);

    if (currentIndex >= ranks.length - 1) {
      return null; // Already at highest rank
    }

    const nextRank = ranks[currentIndex + 1];
    const rrNeeded = RANK_CONFIG[nextRank].min_rr;

    return { rank: nextRank, rrNeeded };
  }

  // Check if user needs weekly assessment
  async needsWeeklyAssessment(): Promise<boolean> {
    const currentRank = await this.getUserRank();
    if (!currentRank) return true; // New user needs initialization

    const currentWeek = getCurrentWeek();
    const lastAssessmentDate = new Date(currentRank.last_assessment);
    const currentWeekStart = new Date(); // This should be calculated based on week start

    // Check if assessment was done for current week
    // This is a simplified check - you might want to implement proper week comparison
    const daysSinceAssessment =
      (Date.now() - lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceAssessment >= 7; // Assess if more than 7 days since last assessment
  }

  // ===== GAMIFICATION METHODS =====

  // Calculate stat XP gains based on KPI completion
  calculateStatXP(kpiCompletion: {
    completion: number;
    category: string;
  }): Record<string, number> {
    const statMapping: Record<string, string> = {
      discipline: "constitution",
      engineering: "intelligence",
      learning: "wisdom",
      fitness: "strength",
      focus: "agility",
      productivity: "agility",
      health: "strength",
      technical: "intelligence",
      study: "wisdom",
      routine: "constitution",
    };

    const xpGains: Record<string, number> = {};
    const baseXP = Math.round(kpiCompletion.completion * 10);

    // Find matching stat
    const mappedStat = statMapping[kpiCompletion.category.toLowerCase()];
    if (mappedStat) {
      xpGains[mappedStat] = baseXP;
    } else {
      // If no specific match, distribute across all stats equally
      const stats = [
        "strength",
        "intelligence",
        "wisdom",
        "constitution",
        "agility",
      ];
      const xpPerStat = Math.floor(baseXP / stats.length);
      stats.forEach((stat) => {
        xpGains[stat] = xpPerStat;
      });
    }

    return xpGains;
  }

  // Check for critical hit (15% chance for good performance)
  checkForCriticalHit(completionPercentage: number): boolean {
    // Higher completion = higher critical hit chance
    let criticalChance = 0;

    if (completionPercentage >= 100) {
      criticalChance = 0.25; // 25% for perfect completion
    } else if (completionPercentage >= 90) {
      criticalChance = 0.2; // 20% for excellent completion
    } else if (completionPercentage >= 80) {
      criticalChance = 0.15; // 15% for good completion
    } else if (completionPercentage >= 70) {
      criticalChance = 0.1; // 10% for decent completion
    } else {
      criticalChance = 0.05; // 5% for poor completion (still possible!)
    }

    return Math.random() < criticalChance;
  }

  // Calculate user's current streak
  async calculateStreak(): Promise<number> {
    try {
      // This would integrate with quest system for streak tracking
      // For now, return a mock calculation
      const currentRank = await this.getUserRank();
      return currentRank?.current_streak_days || 0;
    } catch (error) {
      console.error("Failed to calculate streak:", error);
      return 0;
    }
  }

  // Check streak bonus multiplier
  checkStreakBonus(streakDays: number): number {
    if (streakDays >= 30) return 3; // 3x for 30+ day streak
    if (streakDays >= 21) return 2.5; // 2.5x for 21+ day streak
    if (streakDays >= 14) return 2; // 2x for 14+ day streak
    if (streakDays >= 7) return 1.5; // 1.5x for 7+ day streak
    if (streakDays >= 3) return 1.2; // 1.2x for 3+ day streak
    return 1; // No bonus for less than 3 days
  }

  // Update user's gamification stats after quest completion
  async updateGamificationStats(questCompletion: {
    completionPercentage: number;
    isCriticalHit: boolean;
    streakDays: number;
    statXPGains: Record<string, number>;
  }): Promise<void> {
    try {
      const currentRank = await this.getUserRank();
      if (!currentRank) return;

      const updates: Partial<UserRank> = {};

      // Update streak
      const newStreakDays = Math.max(
        questCompletion.streakDays,
        currentRank.current_streak_days || 0,
      );
      updates.current_streak_days = newStreakDays;

      // Update longest streak if current is longer
      if (newStreakDays > (currentRank.longest_streak_days || 0)) {
        updates.longest_streak_days = newStreakDays;
      }

      // Increment critical hit count if applicable
      if (questCompletion.isCriticalHit) {
        updates.critical_hit_count = (currentRank.critical_hit_count || 0) + 1;
      }

      // Calculate total stat XP from this completion
      const statXPFromCompletion = Object.values(
        questCompletion.statXPGains,
      ).reduce((sum, xp) => sum + xp, 0);
      updates.total_stat_xp =
        (currentRank.total_stat_xp || 0) + statXPFromCompletion;

      // Calculate character level (1 level per 500 total stat XP)
      updates.character_level =
        Math.floor((updates.total_stat_xp || 0) / 500) + 1;

      // Save updates
      await userStorage.setUserRank(
        updates as Omit<UserRank, "created_at" | "updated_at">,
      );
    } catch (error) {
      console.error("Failed to update gamification stats:", error);
    }
  }

  // Get comprehensive gamification status
  async getGamificationStatus(): Promise<{
    userRank: UserRank | null;
    nextRankProgress: number;
  }> {
    try {
      const userRank = await this.getUserRank();

      const nextRankProgress = userRank
        ? this.getRankProgress(userRank.rr_points, userRank.current_rank)
        : 0;

      return {
        userRank,
        nextRankProgress,
      };
    } catch (error) {
      console.error("Failed to get gamification status:", error);
      throw error;
    }
  }

  // Enhanced weekly assessment with gamification integration
  async assessWeeklyPerformanceWithGamification(weekKey: string): Promise<{
    assessment: WeeklyAssessment;
    isCriticalHit: boolean;
    streakMultiplier: number;
    statXPGains: Record<string, number>;
    progressionEvents: string[];
  }> {
    try {
      // Get base assessment
      const assessment = await this.calculateWeeklyCompletion(weekKey);

      // Check for critical hit
      const isCriticalHit = this.checkForCriticalHit(
        assessment.completion_percentage,
      );

      // Calculate current streak
      const currentStreak = await this.calculateStreak();
      const streakMultiplier = this.checkStreakBonus(currentStreak);

      // Calculate stat XP gains
      const statXPGains: Record<string, number> = {};
      assessment.kpi_breakdown.forEach((kpi) => {
        const xpGains = this.calculateStatXP({
          completion: kpi.percentage,
          category: kpi.name.toLowerCase(),
        });

        // Merge XP gains
        Object.entries(xpGains).forEach(([stat, xp]) => {
          statXPGains[stat] = (statXPGains[stat] || 0) + xp;
        });
      });

      // Calculate enhanced RR change
      const currentRank = await this.getUserRank();
      const rrChange = this.calculateRRChangeWithGamification(
        assessment.completion_percentage,
        currentRank?.current_rank || "bronze",
        isCriticalHit,
        streakMultiplier,
      );

      // Update assessment with new RR change
      assessment.rr_change = rrChange;

      // Track progression events
      const progressionEvents: string[] = [];
      if (isCriticalHit) {
        progressionEvents.push("critical_hit");
      }
      if (streakMultiplier > 1) {
        progressionEvents.push(
          `streak_bonus_${Math.round((streakMultiplier - 1) * 100)}%`,
        );
      }

      // Note: Stat XP gains are now handled by the simplified progression system
      // The new system uses a single XP value rather than per-stat XP

      // Update gamification stats
      await this.updateGamificationStats({
        completionPercentage: assessment.completion_percentage,
        isCriticalHit,
        streakDays: currentStreak,
        statXPGains,
      });

      return {
        assessment,
        isCriticalHit,
        streakMultiplier,
        statXPGains,
        progressionEvents,
      };
    } catch (error) {
      console.error(
        "Failed to assess weekly performance with gamification:",
        error,
      );
      throw error;
    }
  }
}

// Global instance
export const rankingManager = new RankingManager();

// Make debugging functions available globally for troubleshooting
if (typeof window !== "undefined") {
  (window as any).debugRankHistory = async () => {
    await rankingManager.debugRegenerateRankHistory();
  };

  (window as any).calculateRRChange = (percentage: number, rank: string) => {
    return rankingManager.calculateRRChange(percentage, rank as any);
  };

  (window as any).showRRTable = () => {};

  // Full reset and regenerate with specialized KPIs
  (window as any).resetRankHistory = async () => {
    await rankingManager.resetAndRegenerateRankHistory();
  };
}
