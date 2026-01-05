/**
 * useAutoSync Hook
 * 
 * Auto-syncs KPI values from external sources like GitHub and Deep Work timer.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getWeekDates } from '@/lib/weeklyKpi';
import { deepWorkService } from '@/lib/deepWorkService';

export interface AutoSyncValues {
  prs_created?: number;
  deep_work_hours?: number;
}

export interface UseAutoSyncReturn {
  syncedValues: AutoSyncValues;
  lastSynced: Date | null;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

export function useAutoSync(weekKey: string): UseAutoSyncReturn {
  const { user } = useAuth();
  const [syncedValues, setSyncedValues] = useState<AutoSyncValues>({});
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get week date range
  const { start, end } = getWeekDates(weekKey);
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  // Sync deep work hours from Supabase sessions
  const syncDeepWorkHours = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      // Query deep work sessions from Supabase for the current week
      const { data: sessions, error } = await supabase
        .from('deep_work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`)
        .eq('is_active', false); // Only completed sessions

      if (error) {
        console.error('Failed to fetch deep work sessions:', error);
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
      console.log('Deep work sync:', { sessions: sessions.length, totalSeconds, hours });
      
      return hours;
    } catch (err) {
      console.error('Failed to sync deep work hours:', err);
      return 0;
    }
  }, [user?.id, startDate, endDate]);

  // Sync GitHub PRs
  const syncGitHubPRs = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      // Check if user has GitHub token configured
      const { data: config } = await supabase
        .from('user_configs')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'github_token')
        .maybeSingle();

      if (!config?.config_value) {
        return 0; // No GitHub token configured
      }

      const token = config.config_value;
      
      // Get user's GitHub username
      const { data: usernameConfig } = await supabase
        .from('user_configs')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'github_username')
        .maybeSingle();

      if (!usernameConfig?.config_value) {
        return 0;
      }

      const username = usernameConfig.config_value;

      // Fetch PRs created by user this week
      const response = await fetch(
        `https://api.github.com/search/issues?q=author:${username}+type:pr+created:${startDate}..${endDate}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        console.error('GitHub API error:', response.status);
        return 0;
      }

      const data = await response.json();
      return data.total_count || 0;
    } catch (err) {
      console.error('Failed to sync GitHub PRs:', err);
      return 0;
    }
  }, [user?.id, startDate, endDate]);

  // Perform full sync
  const syncNow = useCallback(async () => {
    if (!user?.id || isSyncing) return;

    setIsSyncing(true);

    try {
      const [deepWorkHours, prsCreated] = await Promise.all([
        syncDeepWorkHours(),
        syncGitHubPRs(),
      ]);

      const newValues: AutoSyncValues = {};
      
      if (deepWorkHours > 0) {
        newValues.deep_work_hours = deepWorkHours;
      }
      
      if (prsCreated > 0) {
        newValues.prs_created = prsCreated;
      }

      setSyncedValues(newValues);
      setLastSynced(new Date());
    } catch (err) {
      console.error('Auto-sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isSyncing, syncDeepWorkHours, syncGitHubPRs]);

  // Auto-sync on mount and when week changes
  useEffect(() => {
    if (user?.id) {
      syncNow();
    }
  }, [user?.id, weekKey]);

  return {
    syncedValues,
    lastSynced,
    syncNow,
    isSyncing,
  };
}

export default useAutoSync;
