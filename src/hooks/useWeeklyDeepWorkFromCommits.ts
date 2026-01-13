/**
 * useWeeklyDeepWorkFromCommits Hook
 *
 * Calculates weekly deep work hours from GitHub commits.
 * Fetches commits for each day of the week and aggregates hours.
 * Logic: Any hour with at least 1 commit = 1 hour of deep work.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { getGitHubConfig } from "@/lib/github";

export interface DailyCommitData {
  date: string;
  hours: number;
  commitCount: number;
}

export interface UseWeeklyDeepWorkFromCommitsReturn {
  dailyData: Record<string, DailyCommitData>;
  totalHours: number;
  totalCommits: number;
  isLoading: boolean;
  error: Error | null;
  isConfigured: boolean;
}

/**
 * Fetches commits for a specific date and returns hours count.
 */
async function fetchCommitsForDate(
  date: string,
  username: string,
  token: string,
): Promise<{ hours: number; commitCount: number }> {
  const response = await fetch(
    `https://api.github.com/search/commits?q=author:${username}+committer-date:${date}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.cloak-preview+json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded");
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  const commits = data.items || [];

  // Group commits by hour
  const hourSet = new Set<number>();
  commits.forEach((c: any) => {
    const commitDate = c.commit?.author?.date;
    if (commitDate) {
      const parsed = parseISO(commitDate);
      hourSet.add(parsed.getHours());
    }
  });

  return {
    hours: hourSet.size,
    commitCount: commits.length,
  };
}

/**
 * Fetches commits for all days in the week and calculates total deep work hours.
 */
export function useWeeklyDeepWorkFromCommits(
  weekStart: Date,
  weekEnd: Date,
): UseWeeklyDeepWorkFromCommitsReturn {
  const [dailyData, setDailyData] = useState<Record<string, DailyCommitData>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Generate all dates in the week
  const weekDates = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
  }, [weekStart, weekEnd]);

  const fetchWeeklyCommits = useCallback(async () => {
    const config = getGitHubConfig();

    // Check if GitHub is configured
    if (!config.enabled || !config.token || !config.username) {
      setIsConfigured(false);
      setIsLoading(false);
      return;
    }

    setIsConfigured(true);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all days in parallel
      const results = await Promise.all(
        weekDates.map(async (date) => {
          try {
            const { hours, commitCount } = await fetchCommitsForDate(
              date,
              config.username,
              config.token,
            );
            return { date, hours, commitCount };
          } catch (err) {
            console.error(`Failed to fetch commits for ${date}:`, err);
            return { date, hours: 0, commitCount: 0 };
          }
        }),
      );

      // Build daily data map
      const dataMap: Record<string, DailyCommitData> = {};
      results.forEach((result) => {
        dataMap[result.date] = result;
      });

      setDailyData(dataMap);
    } catch (err) {
      console.error("Failed to fetch weekly commits:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch commits"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [weekDates]);

  // Fetch on mount and when week changes
  useEffect(() => {
    fetchWeeklyCommits();
  }, [fetchWeeklyCommits]);

  // Calculate totals
  const { totalHours, totalCommits } = useMemo(() => {
    let hours = 0;
    let commits = 0;
    Object.values(dailyData).forEach((data) => {
      hours += data.hours;
      commits += data.commitCount;
    });
    return { totalHours: hours, totalCommits: commits };
  }, [dailyData]);

  return {
    dailyData,
    totalHours,
    totalCommits,
    isLoading,
    error,
    isConfigured,
  };
}

export default useWeeklyDeepWorkFromCommits;
