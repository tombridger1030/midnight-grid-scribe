/**
 * useWeeklyDefaults Hook
 *
 * Fetches data from the same day last week to provide smart defaults.
 * Used to pre-fill Sleep and Weight inputs with weekly pattern hints.
 */

import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface WeeklyDefaults {
  sleepHours: number | null;
  weightLbs: number | null;
}

export interface UseWeeklyDefaultsReturn {
  defaults: WeeklyDefaults;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches sleep and weight data from 7 days ago to suggest as defaults.
 */
export function useWeeklyDefaults(date: Date): UseWeeklyDefaultsReturn {
  const { user } = useAuth();
  const [defaults, setDefaults] = useState<WeeklyDefaults>({
    sleepHours: null,
    weightLbs: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate the date 7 days ago
  const lastWeekDate = subDays(date, 7);
  const lastWeekDateStr = format(lastWeekDate, "yyyy-MM-dd");

  const fetchDefaults = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch sleep and weight from same day last week in parallel
      const [sleepResult, weightResult] = await Promise.all([
        supabase
          .from("daily_sleep")
          .select("hours")
          .eq("user_id", user.id)
          .eq("date", lastWeekDateStr)
          .maybeSingle(),
        supabase
          .from("daily_weight")
          .select("weight_lbs")
          .eq("user_id", user.id)
          .eq("date", lastWeekDateStr)
          .maybeSingle(),
      ]);

      const sleepHours = sleepResult.data?.hours || null;
      const weightLbs = weightResult.data?.weight_lbs || null;

      setDefaults({
        sleepHours,
        weightLbs,
      });
    } catch (err) {
      console.error("Failed to fetch weekly defaults:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch defaults"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, lastWeekDateStr]);

  // Fetch on mount and when date changes
  useEffect(() => {
    fetchDefaults();
  }, [fetchDefaults]);

  return {
    defaults,
    isLoading,
    error,
  };
}

export default useWeeklyDefaults;
