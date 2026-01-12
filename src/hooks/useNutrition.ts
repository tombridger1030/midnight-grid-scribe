/**
 * useNutrition Hook
 *
 * Manages daily nutrition tracking (calories + protein per meal).
 * Also exports food items functions from nutritionAnalysis for convenience.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getWeekDates, updateWeeklyKPIRecord } from "@/lib/weeklyKpi";
import { useProgressionStore } from "@/stores/progressionStore";

// Re-export food items functions from nutritionAnalysis
export {
  saveFoodItems,
  saveMealItems,
  getMealItems,
  searchFoodItems,
} from "@/lib/ai/nutritionAnalysis";

export type { FoodItem } from "@/lib/ai/nutritionAnalysis";

export interface DailyNutrition {
  id?: string;
  user_id?: string;
  date: string;
  breakfast_calories: number;
  breakfast_protein: number;
  lunch_calories: number;
  lunch_protein: number;
  dinner_calories: number;
  dinner_protein: number;
  snacks_calories: number;
  snacks_protein: number;
}

export interface MealData {
  calories: number;
  protein: number;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export interface UseNutritionReturn {
  weekData: Record<string, DailyNutrition>;
  weeklyTotals: { calories: number; protein: number };
  dailyAverage: { calories: number; protein: number };
  daysTracked: number;
  isLoading: boolean;
  error: Error | null;
  updateMeal: (date: string, meal: MealType, data: MealData) => Promise<void>;
  getDayTotals: (date: string) => { calories: number; protein: number };
}

const emptyDay: DailyNutrition = {
  date: "",
  breakfast_calories: 0,
  breakfast_protein: 0,
  lunch_calories: 0,
  lunch_protein: 0,
  dinner_calories: 0,
  dinner_protein: 0,
  snacks_calories: 0,
  snacks_protein: 0,
};

export function useNutrition(weekKey: string): UseNutritionReturn {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<Record<string, DailyNutrition>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get week date range
  const { start, end } = getWeekDates(weekKey);
  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  // Load nutrition data for the week
  const loadWeekData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("daily_nutrition")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (fetchError) throw fetchError;

      // Convert to record keyed by date
      const byDate: Record<string, DailyNutrition> = {};
      (data || []).forEach((row: DailyNutrition) => {
        byDate[row.date] = row;
      });

      setWeekData(byDate);
    } catch (err) {
      console.error("Failed to load nutrition data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load nutrition data"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, startDate, endDate]);

  // Initial load
  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Update a specific meal for a date
  const updateMeal = useCallback(
    async (date: string, meal: MealType, data: MealData) => {
      if (!user?.id) return;

      const existing = weekData[date] || { ...emptyDay, date };
      const updated: DailyNutrition = {
        ...existing,
        date,
        [`${meal}_calories`]: data.calories,
        [`${meal}_protein`]: data.protein,
      };

      // Optimistic update
      setWeekData((prev) => ({ ...prev, [date]: updated }));

      try {
        const { error: upsertError } = await supabase
          .from("daily_nutrition")
          .upsert(
            {
              user_id: user.id,
              date,
              breakfast_calories: updated.breakfast_calories,
              breakfast_protein: updated.breakfast_protein,
              lunch_calories: updated.lunch_calories,
              lunch_protein: updated.lunch_protein,
              dinner_calories: updated.dinner_calories,
              dinner_protein: updated.dinner_protein,
              snacks_calories: updated.snacks_calories,
              snacks_protein: updated.snacks_protein,
            },
            { onConflict: "user_id,date" },
          );

        if (upsertError) throw upsertError;

        // Award XP for new meal entries (not updates to existing meals)
        const existingMealCals =
          (existing[`${meal}_calories` as keyof DailyNutrition] as number) || 0;
        const existingMealProtein =
          (existing[`${meal}_protein` as keyof DailyNutrition] as number) || 0;
        const isNewEntry =
          !existing.id || (existingMealCals === 0 && existingMealProtein === 0);
        if (isNewEntry && (data.calories > 0 || data.protein > 0)) {
          useProgressionStore.getState().onKPIEntry("nutrition_meal");
        }
      } catch (err) {
        console.error("Failed to update nutrition:", err);
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

  // Get totals for a specific day
  const getDayTotals = useCallback(
    (date: string): { calories: number; protein: number } => {
      const day = weekData[date];
      if (!day) return { calories: 0, protein: 0 };

      return {
        calories:
          (day.breakfast_calories || 0) +
          (day.lunch_calories || 0) +
          (day.dinner_calories || 0) +
          (day.snacks_calories || 0),
        protein:
          (day.breakfast_protein || 0) +
          (day.lunch_protein || 0) +
          (day.dinner_protein || 0) +
          (day.snacks_protein || 0),
      };
    },
    [weekData],
  );

  // Calculate weekly totals
  const weeklyTotals = Object.values(weekData).reduce(
    (acc, day) => ({
      calories:
        acc.calories +
        (day.breakfast_calories || 0) +
        (day.lunch_calories || 0) +
        (day.dinner_calories || 0) +
        (day.snacks_calories || 0),
      protein:
        acc.protein +
        (day.breakfast_protein || 0) +
        (day.lunch_protein || 0) +
        (day.dinner_protein || 0) +
        (day.snacks_protein || 0),
    }),
    { calories: 0, protein: 0 },
  );

  // Calculate days with actual data (calories > 0 or protein > 0)
  const daysTracked = Object.values(weekData).filter((day) => {
    const totalCals =
      (day.breakfast_calories || 0) +
      (day.lunch_calories || 0) +
      (day.dinner_calories || 0) +
      (day.snacks_calories || 0);
    const totalProtein =
      (day.breakfast_protein || 0) +
      (day.lunch_protein || 0) +
      (day.dinner_protein || 0) +
      (day.snacks_protein || 0);
    return totalCals > 0 || totalProtein > 0;
  }).length;

  // Calculate daily average (over days with actual data only)
  const dailyAverage =
    daysTracked > 0
      ? {
          calories: Math.round(weeklyTotals.calories / daysTracked),
          protein: Math.round(weeklyTotals.protein / daysTracked),
        }
      : { calories: 0, protein: 0 };

  // Sync combined nutrition score to weekly KPI system
  useEffect(() => {
    if (user?.id && weekKey && daysTracked > 0) {
      // Get targets from localStorage (or defaults)
      const nutritionTargets = JSON.parse(
        localStorage.getItem("noctisium-nutrition-targets") ||
          '{"calories": 2000, "protein": 150}',
      );

      // Calculate combined nutrition score (avg of calories % + protein %)
      const caloriesPercent =
        nutritionTargets.calories > 0
          ? Math.min(
              100,
              (dailyAverage.calories / nutritionTargets.calories) * 100,
            )
          : 0;
      const proteinPercent =
        nutritionTargets.protein > 0
          ? Math.min(
              100,
              (dailyAverage.protein / nutritionTargets.protein) * 100,
            )
          : 0;
      const combinedScore = Math.round((caloriesPercent + proteinPercent) / 2);

      updateWeeklyKPIRecord(weekKey, {
        nutrition: combinedScore, // Single combined score (0-100)
      });
    }
  }, [dailyAverage, user?.id, weekKey, daysTracked]);

  return {
    weekData,
    weeklyTotals,
    dailyAverage,
    daysTracked,
    isLoading,
    error,
    updateMeal,
    getDayTotals,
  };
}

export default useNutrition;
