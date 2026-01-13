/**
 * useDeepWorkFromCommits Hook
 *
 * Calculates deep work hours from GitHub commits.
 * Logic: Any hour with at least 1 commit = 1 hour of deep work.
 */

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { getGitHubConfig } from "@/lib/github";

export interface CommitHour {
  hour: number; // 0-23
  commitCount: number;
  isAutomatic: boolean; // true = from commits, false = manual
}

export interface UseDeepWorkFromCommitsReturn {
  deepWorkHours: number;
  commitCount: number;
  commitHours: CommitHour[];
  isLoading: boolean;
  error: Error | null;
  isConfigured: boolean;
}

/**
 * Fetches commits for a specific date and calculates deep work hours.
 * Each unique hour with at least 1 commit = 1 hour of deep work.
 */
export function useDeepWorkFromCommits(
  date: Date,
): UseDeepWorkFromCommitsReturn {
  const [deepWorkHours, setDeepWorkHours] = useState(0);
  const [commitCount, setCommitCount] = useState(0);
  const [commitHours, setCommitHours] = useState<CommitHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");

  const fetchCommitsForDate = useCallback(async () => {
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
      // Use GitHub Search API to get commits for the specific date
      const response = await fetch(
        `https://api.github.com/search/commits?q=author:${config.username}+committer-date:${dateStr}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: "application/vnd.github.cloak-preview+json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          // Rate limited
          throw new Error("GitHub API rate limit exceeded");
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const commits = data.items || [];

      // Group commits by hour
      const hourSet = new Set<number>();
      const hourCounts: Record<number, number> = {};

      commits.forEach((c: any) => {
        const commitDate = c.commit?.author?.date;
        if (commitDate) {
          const parsed = parseISO(commitDate);
          const hour = parsed.getHours();
          hourSet.add(hour);
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      // Convert to CommitHour array
      const hours: CommitHour[] = Array.from(hourSet)
        .sort((a, b) => a - b)
        .map((hour) => ({
          hour,
          commitCount: hourCounts[hour],
          isAutomatic: true,
        }));

      setDeepWorkHours(hourSet.size);
      setCommitCount(commits.length);
      setCommitHours(hours);
    } catch (err) {
      console.error("Failed to fetch commits:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch commits"),
      );
      setDeepWorkHours(0);
      setCommitCount(0);
      setCommitHours([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateStr]);

  // Fetch on mount and when date changes
  useEffect(() => {
    fetchCommitsForDate();
  }, [fetchCommitsForDate]);

  return {
    deepWorkHours,
    commitCount,
    commitHours,
    isLoading,
    error,
    isConfigured,
  };
}

export default useDeepWorkFromCommits;
