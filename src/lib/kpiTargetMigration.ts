/**
 * KPI Target Migration Utility
 *
 * Migrates localStorage-based KPI targets to the database.
 * This is a one-time migration for existing users who have
 * nutrition, sleep, or weight targets stored in localStorage.
 */

import { supabase } from "./supabase";

const MIGRATION_KEY = "noctisium-kpi-targets-migrated";

interface NutritionTargets {
  calories: number;
  protein: number;
}

/**
 * Migrates KPI targets from localStorage to the database.
 * This function is idempotent - it can be called multiple times safely.
 *
 * @param userId - The user ID to migrate targets for
 * @returns Promise that resolves when migration is complete
 */
export async function migrateKpiTargetsToDatabase(
  userId: string,
): Promise<void> {
  try {
    // Check if migration already completed using user_configs table
    const { data: migrationFlag, error: checkError } = await supabase
      .from("user_configs")
      .select("config_value")
      .eq("user_id", userId)
      .eq("config_key", MIGRATION_KEY)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking migration status:", checkError);
      return;
    }

    if (migrationFlag) {
      console.log("KPI targets already migrated for user:", userId);
      return;
    }

    const updates: Promise<any>[] = [];

    // Migrate nutrition targets
    const nutritionStr = localStorage.getItem("noctisium-nutrition-targets");
    if (nutritionStr) {
      try {
        const nutrition: NutritionTargets = JSON.parse(nutritionStr);

        if (nutrition.calories && nutrition.calories !== 1900) {
          updates.push(
            supabase
              .from("user_kpis")
              .update({ target: nutrition.calories })
              .eq("user_id", userId)
              .eq("kpi_id", "avg_calories"),
          );
        }

        if (nutrition.protein && nutrition.protein !== 150) {
          updates.push(
            supabase
              .from("user_kpis")
              .update({ target: nutrition.protein })
              .eq("user_id", userId)
              .eq("kpi_id", "avg_protein"),
          );
        }
      } catch (e) {
        console.error("Error parsing nutrition targets:", e);
      }
    }

    // Migrate sleep target
    const sleepStr = localStorage.getItem("noctisium-sleep-target");
    if (sleepStr) {
      const sleepTarget = parseFloat(sleepStr);
      if (!isNaN(sleepTarget) && sleepTarget !== 7) {
        updates.push(
          supabase
            .from("user_kpis")
            .update({ target: sleepTarget })
            .eq("user_id", userId)
            .eq("kpi_id", "sleepTarget"),
        );
      }
    }

    // Migrate weight target
    const weightStr = localStorage.getItem("noctisium-weight-target");
    if (weightStr) {
      const weightTarget = parseFloat(weightStr);
      if (!isNaN(weightTarget) && weightTarget !== 180) {
        updates.push(
          supabase
            .from("user_kpis")
            .update({ target: weightTarget })
            .eq("user_id", userId)
            .eq("kpi_id", "weightTarget"),
        );
      }
    }

    // Execute all updates in parallel
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`Migrated ${updates.length} KPI targets for user:`, userId);
    }

    // Mark migration as complete
    const { error: insertError } = await supabase.from("user_configs").insert({
      user_id: userId,
      config_key: MIGRATION_KEY,
      config_value: { migrated_at: new Date().toISOString() },
    });

    if (insertError) {
      console.error("Error marking migration complete:", insertError);
    }

    // Clean up localStorage (optional - keep as backup for now)
    // localStorage.removeItem("noctisium-nutrition-targets");
    // localStorage.removeItem("noctisium-sleep-target");
    // localStorage.removeItem("noctisium-weight-target");
  } catch (error) {
    console.error("Error migrating KPI targets:", error);
  }
}

/**
 * Checks if the user has completed the KPI target migration.
 *
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if migration is complete
 */
export async function hasMigratedKpiTargets(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_configs")
      .select("config_value")
      .eq("user_id", userId)
      .eq("config_key", MIGRATION_KEY)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}
