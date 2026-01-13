/**
 * useWeight Hook
 *
 * Manages daily weight tracking (lbs per day).
 * Follows the exact pattern of useNutrition and useSleep.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getWeekDates, updateWeeklyKPIRecord } from "@/lib/weeklyKpi";
import { useProgressionStore } from "@/stores/progressionStore";
import { formatLocalDate } from "@/lib/dateUtils";

export interface DailyWeight {
  id?: string;
  user_id?: string;
  date: string;
  weight_lbs: number;
  notes?: string;
}

export interface UseWeightReturn {
  weekData: Record<string, DailyWeight>;
  weeklyStats: {
    startWeight: number;
    endWeight: number;
    weightChange: number;
    avgWeight: number;
    minWeight: number;
    maxWeight: number;
    trend: "up" | "down" | "neutral";
  };
  daysTracked: number;
  isLoading: boolean;
  error: Error | null;
  updateDay: (date: string, data: Partial<DailyWeight>) => Promise<void>;
  getDay: (date: string) => DailyWeight | null;
}

const emptyDay: DailyWeight = {
  date: "",
  weight_lbs: 0,
};

export function useWeight(weekKey: string): UseWeightReturn {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<Record<string, DailyWeight>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { start, end } = getWeekDates(weekKey);
  const startDate = formatLocalDate(start);
  const endDate = formatLocalDate(end);

  // Load weight data for the week
  const loadWeekData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("daily_weight")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      const byDate: Record<string, DailyWeight> = {};
      (data || []).forEach((row: DailyWeight) => {
        byDate[row.date] = row;
      });

      setWeekData(byDate);
    } catch (err) {
      console.error("Failed to load weight data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load weight data"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, startDate, endDate]);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Update weight for a date
  const updateDay = useCallback(
    async (date: string, data: Partial<DailyWeight>) => {
      if (!user?.id) return;

      const existing = weekData[date] || { ...emptyDay, date };
      const updated: DailyWeight = {
        ...existing,
        ...data,
        date,
      };

      // Optimistic update
      setWeekData((prev) => ({ ...prev, [date]: updated }));

      try {
        const { error: upsertError } = await supabase
          .from("daily_weight")
          .upsert(
            {
              user_id: user.id,
              date,
              weight_lbs: updated.weight_lbs,
              notes: updated.notes,
            },
            { onConflict: "user_id,date" },
          );

        if (upsertError) throw upsertError;

        // Award XP for new weight entries
        const isNewEntry = !existing.id;
        if (isNewEntry && updated.weight_lbs > 0) {
          useProgressionStore.getState().onKPIEntry("weight_entry");
        }
      } catch (err) {
        console.error("Failed to update weight:", err);
        // Revert on error
        setWeekData((prev) => {
          const reverted = { ...prev };
          if (existing.id) {
            reverted[date] = existing;
          } else {
            delete reverted[date];
          }
          return reverted;
        });
        throw err;
      }
    },
    [user?.id, weekData],
  );

  const getDay = useCallback(
    (date: string): DailyWeight | null => {
      return weekData[date] || null;
    },
    [weekData],
  );

  // Calculate weekly stats
  // Get chronological entries for start/end/trend
  const chronologicalEntries = Object.entries(weekData)
    .filter(([_, d]) => d.weight_lbs > 0)
    .sort(([aDate], [bDate]) => aDate.localeCompare(bDate));

  const weightArray = Object.values(weekData)
    .map((d) => d.weight_lbs)
    .filter((w) => w > 0);

  // startWeight = first chronological entry, endWeight = last chronological entry
  const startWeight =
    chronologicalEntries.length > 0 ? chronologicalEntries[0][1].weight_lbs : 0;
  const endWeight =
    chronologicalEntries.length > 0
      ? chronologicalEntries[chronologicalEntries.length - 1][1].weight_lbs
      : 0;
  const weightChange = endWeight - startWeight;

  let trend: "up" | "down" | "neutral" = "neutral";
  if (Math.abs(weightChange) > 0.5) {
    trend = weightChange > 0 ? "up" : "down";
  }

  const avgWeight =
    weightArray.length > 0
      ? weightArray.reduce((sum, w) => sum + w, 0) / weightArray.length
      : 0;

  const minWeight = weightArray.length > 0 ? Math.min(...weightArray) : 0;
  const maxWeight = weightArray.length > 0 ? Math.max(...weightArray) : 0;

  const daysTracked = weightArray.length;

  // Sync weight tracking days to weekly KPI system
  useEffect(() => {
    if (user?.id && weekKey && daysTracked > 0) {
      updateWeeklyKPIRecord(weekKey, {
        weightDaysTracked: daysTracked,
      });
    }
  }, [daysTracked, user?.id, weekKey]);

  return {
    weekData,
    weeklyStats: {
      startWeight,
      endWeight,
      weightChange,
      avgWeight,
      minWeight,
      maxWeight,
      trend,
    },
    daysTracked,
    isLoading,
    error,
    updateDay,
    getDay,
  };
}

export default useWeight;

/**
 * Standalone function to get weight data for a single date.
 * Used by QuickDailyEntry when week context isn't needed.
 */
export async function getWeightForDate(
  userId: string,
  date: string,
): Promise<DailyWeight | null> {
  try {
    const { data, error } = await supabase
      .from("daily_weight")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw error;
    return data as DailyWeight | null;
  } catch (err) {
    console.error("Failed to get weight for date:", err);
    return null;
  }
}

/**
 * Standalone function to save weight data for a single date.
 * Used by QuickDailyEntry for quick save without week context.
 */
export async function saveWeightForDate(
  userId: string,
  date: string,
  weightLbs: number,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("daily_weight").upsert(
      {
        user_id: userId,
        date,
        weight_lbs: weightLbs,
      },
      { onConflict: "user_id,date" },
    );

    if (error) throw error;

    // Award XP for weight entry
    useProgressionStore.getState().onKPIEntry("weight_entry");

    return true;
  } catch (err) {
    console.error("Failed to save weight for date:", err);
    return false;
  }
}
