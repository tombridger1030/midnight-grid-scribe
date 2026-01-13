/**
 * useActivityData Hook
 *
 * Fetches yearly activity data for the heatmaps:
 * - Git commits
 * - Training sessions
 * - Sleep hours
 * - Deep work hours
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getGitHubConfig } from "@/lib/github";

export interface DayData {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface ActivityData {
  commits: DayData[];
  training: DayData[];
  sleep: DayData[];
  deepWork: DayData[];
}

export interface UseActivityDataReturn {
  data: ActivityData;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Get year range
function getYearRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

// Convert ISO timestamp to local date string (YYYY-MM-DD)
// This fixes timezone issues where UTC dates differ from local dates
function toLocalDateString(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useActivityData(year: number = 2026): UseActivityDataReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ActivityData>({
    commits: [],
    training: [],
    sleep: [],
    deepWork: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { start, end } = getYearRange(year);

  // Fetch training sessions for the year
  const fetchTraining = useCallback(async (): Promise<DayData[]> => {
    if (!user?.id) return [];

    try {
      const { data: sessions, error: fetchError } = await supabase
        .from("training_sessions")
        .select("date")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end);

      if (fetchError) throw fetchError;

      // Count sessions per day
      const countByDate: Record<string, number> = {};
      (sessions || []).forEach((s) => {
        countByDate[s.date] = (countByDate[s.date] || 0) + 1;
      });

      return Object.entries(countByDate).map(([date, value]) => ({
        date,
        value,
      }));
    } catch (err) {
      console.error("Failed to fetch training data:", err);
      return [];
    }
  }, [user?.id, start, end]);

  // Fetch sleep data for the year
  const fetchSleep = useCallback(async (): Promise<DayData[]> => {
    if (!user?.id) return [];

    try {
      const { data: sleepData, error: fetchError } = await supabase
        .from("daily_sleep")
        .select("date, hours")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end);

      if (fetchError) throw fetchError;

      return (sleepData || [])
        .filter((s) => s.hours > 0)
        .map((s) => ({
          date: s.date,
          value: s.hours,
        }));
    } catch (err) {
      console.error("Failed to fetch sleep data:", err);
      return [];
    }
  }, [user?.id, start, end]);

  // Fetch deep work sessions for the year
  const fetchDeepWork = useCallback(async (): Promise<DayData[]> => {
    if (!user?.id) return [];

    try {
      const { data: sessions, error: fetchError } = await supabase
        .from("deep_work_sessions")
        .select("start_time, duration_seconds")
        .eq("user_id", user.id)
        .gte("start_time", `${start}T00:00:00`)
        .lte("start_time", `${end}T23:59:59`)
        .eq("is_active", false);

      if (fetchError) throw fetchError;

      // Sum hours per day
      const hoursByDate: Record<string, number> = {};
      (sessions || []).forEach((s) => {
        if (s.duration_seconds && s.duration_seconds > 0) {
          const date = toLocalDateString(s.start_time);
          const hours = s.duration_seconds / 3600;
          hoursByDate[date] = (hoursByDate[date] || 0) + hours;
        }
      });

      return Object.entries(hoursByDate).map(([date, value]) => ({
        date,
        value: Math.round(value * 10) / 10, // Round to 1 decimal
      }));
    } catch (err) {
      console.error("Failed to fetch deep work data:", err);
      return [];
    }
  }, [user?.id, start, end]);

  // Fetch GitHub commits for the year
  const fetchCommits = useCallback(async (): Promise<DayData[]> => {
    const config = getGitHubConfig();
    if (!config.enabled || !config.token || !config.username) {
      return [];
    }

    try {
      // Use GitHub Search API to get commits for the year
      const response = await fetch(
        `https://api.github.com/search/commits?q=author:${config.username}+committer-date:${start}..${end}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: "application/vnd.github.cloak-preview+json",
          },
        },
      );

      if (!response.ok) {
        console.error("GitHub API error:", response.status);
        return [];
      }

      const data = await response.json();
      const commits = data.items || [];

      // Count commits per day (using local date, not UTC)
      const countByDate: Record<string, number> = {};
      commits.forEach((c: any) => {
        const timestamp = c.commit?.author?.date;
        if (timestamp) {
          const date = toLocalDateString(timestamp);
          countByDate[date] = (countByDate[date] || 0) + 1;
        }
      });

      return Object.entries(countByDate).map(([date, value]) => ({
        date,
        value,
      }));
    } catch (err) {
      console.error("Failed to fetch GitHub commits:", err);
      return [];
    }
  }, [start, end]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [commits, training, sleep, deepWork] = await Promise.all([
        fetchCommits(),
        fetchTraining(),
        fetchSleep(),
        fetchDeepWork(),
      ]);

      setData({ commits, training, sleep, deepWork });
    } catch (err) {
      console.error("Failed to load activity data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load activity data"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchCommits, fetchTraining, fetchSleep, fetchDeepWork]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh: loadData,
  };
}

export default useActivityData;
