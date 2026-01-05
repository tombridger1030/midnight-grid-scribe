/**
 * useAutoSync Hook
 *
 * Auto-syncs KPI values from external sources like GitHub and Deep Work timer.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getWeekDates } from "@/lib/weeklyKpi";
import { deepWorkService } from "@/lib/deepWorkService";
import { REALTIME_EVENTS } from "@/hooks/useRealtimeSync";
import { invalidateShipCache } from "@/lib/github";

export interface AutoSyncValues {
  prs_created?: number;
  commits_created?: number;
  deep_work_hours?: number;
}

export interface UseAutoSyncReturn {
  syncedValues: AutoSyncValues;
  kpiValueMapping: Record<string, number>; // kpi_id -> value
  lastSynced: Date | null;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

export function useAutoSync(weekKey: string): UseAutoSyncReturn {
  const { user } = useAuth();
  const [syncedValues, setSyncedValues] = useState<AutoSyncValues>({});
  const [kpiValueMapping, setKpiValueMapping] = useState<
    Record<string, number>
  >({});
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get week date range
  const { start, end } = getWeekDates(weekKey);
  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  // Sync deep work hours from Supabase sessions
  const syncDeepWorkHours = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      // Query deep work sessions from Supabase for the current week
      const { data: sessions, error } = await supabase
        .from("deep_work_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", `${startDate}T00:00:00`)
        .lte("start_time", `${endDate}T23:59:59`)
        .eq("is_active", false); // Only completed sessions

      if (error) {
        console.error("Failed to fetch deep work sessions:", error);
        return 0;
      }

      if (!sessions || sessions.length === 0) {
        return 0;
      }

      // Sum up duration_seconds from all completed sessions
      let totalSeconds = 0;
      for (const session of sessions) {
        if (session.duration_seconds && session.duration_seconds > 0) {
          totalSeconds += session.duration_seconds;
        }
      }

      // Convert to hours and round to 1 decimal
      const hours = Math.round((totalSeconds / 3600) * 10) / 10;
      console.log("Deep work sync:", {
        sessions: sessions.length,
        totalSeconds,
        hours,
      });

      return hours;
    } catch (err) {
      console.error("Failed to sync deep work hours:", err);
      return 0;
    }
  }, [user?.id, startDate, endDate]);

  // Sync GitHub PRs
  const syncGitHubPRs = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      // Check if user has GitHub settings configured
      // First try the combined github_settings key (new format)
      const { data: settingsConfig } = await supabase
        .from("user_configs")
        .select("config_value")
        .eq("user_id", user.id)
        .eq("config_key", "github_settings")
        .maybeSingle();

      let token: string | null = null;
      let username: string | null = null;

      if (settingsConfig?.config_value) {
        // New format: combined settings object
        const settings = settingsConfig.config_value as {
          api_token?: string;
          username?: string;
        };
        token = settings.api_token || null;
        username = settings.username || null;
      }

      // Fallback to localStorage if Supabase doesn't have it
      if (!token) {
        token = localStorage.getItem("github_api_token");
      }
      if (!username) {
        username = localStorage.getItem("github_username");
      }

      if (!token || !username) {
        return 0; // No GitHub credentials configured
      }

      // Fetch PRs created by user this week
      const response = await fetch(
        `https://api.github.com/search/issues?q=author:${username}+type:pr+created:${startDate}..${endDate}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (!response.ok) {
        console.error("GitHub API error:", response.status);
        return 0;
      }

      const data = await response.json();
      return data.total_count || 0;
    } catch (err) {
      console.error("Failed to sync GitHub PRs:", err);
      return 0;
    }
  }, [user?.id, startDate, endDate]);

  // Sync GitHub Commits
  const syncGitHubCommits = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      // Get GitHub settings (reuse the same pattern as PRs)
      const { data: settingsConfig } = await supabase
        .from("user_configs")
        .select("config_value")
        .eq("user_id", user.id)
        .eq("config_key", "github_settings")
        .maybeSingle();

      let token: string | null = null;
      let username: string | null = null;

      if (settingsConfig?.config_value) {
        const settings = settingsConfig.config_value as {
          api_token?: string;
          username?: string;
        };
        token = settings.api_token || null;
        username = settings.username || null;
      }

      // Fallback to localStorage
      if (!token) {
        token = localStorage.getItem("github_api_token");
      }
      if (!username) {
        username = localStorage.getItem("github_username");
      }

      if (!token || !username) {
        return 0;
      }

      // Fetch commits by user this week using search API
      const response = await fetch(
        `https://api.github.com/search/commits?q=author:${username}+committer-date:${startDate}..${endDate}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.cloak-preview+json", // Required for commit search
          },
        },
      );

      if (!response.ok) {
        console.error("GitHub API error (commits):", response.status);
        return 0;
      }

      const data = await response.json();
      return data.total_count || 0;
    } catch (err) {
      console.error("Failed to sync GitHub commits:", err);
      return 0;
    }
  }, [user?.id, startDate, endDate]);

  // Perform full sync
  const syncNow = useCallback(async () => {
    if (!user?.id || isSyncing) return;

    setIsSyncing(true);

    try {
      const [deepWorkHours, prsCreated, commitsCreated] = await Promise.all([
        syncDeepWorkHours(),
        syncGitHubPRs(),
        syncGitHubCommits(),
      ]);

      const newValues: AutoSyncValues = {};

      if (deepWorkHours > 0) {
        newValues.deep_work_hours = deepWorkHours;
      }

      if (prsCreated > 0) {
        newValues.prs_created = prsCreated;
      }

      if (commitsCreated > 0) {
        newValues.commits_created = commitsCreated;
      }

      setSyncedValues(newValues);
      setLastSynced(new Date());

      // Build KPI value mapping based on auto_sync_source
      const { data: kpis } = await supabase
        .from("user_kpis")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const mapping: Record<string, number> = {};
      kpis?.forEach((kpi: any) => {
        if (kpi.auto_sync_source === "github_prs") {
          mapping[kpi.kpi_id] = prsCreated;
        } else if (kpi.auto_sync_source === "github_commits") {
          mapping[kpi.kpi_id] = commitsCreated;
        } else if (kpi.auto_sync_source === "deep_work_timer") {
          mapping[kpi.kpi_id] = deepWorkHours;
        }
      });
      setKpiValueMapping(mapping);

      // Dispatch event to notify Dashboard and other components
      window.dispatchEvent(
        new CustomEvent(REALTIME_EVENTS.KPI_UPDATED, {
          detail: {
            source: "auto-sync",
            values: newValues,
            kpiMapping: mapping,
          },
        }),
      );

      // Invalidate ship cache so widget updates with new GitHub data
      if (prsCreated > 0 || commitsCreated > 0) {
        invalidateShipCache();
      }
    } catch (err) {
      console.error("Auto-sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [
    user?.id,
    isSyncing,
    syncDeepWorkHours,
    syncGitHubPRs,
    syncGitHubCommits,
  ]);

  // Auto-sync on mount and when week changes
  useEffect(() => {
    if (user?.id) {
      syncNow();
    }
  }, [user?.id, weekKey]);

  return {
    syncedValues,
    kpiValueMapping,
    lastSynced,
    syncNow,
    isSyncing,
  };
}

export default useAutoSync;
