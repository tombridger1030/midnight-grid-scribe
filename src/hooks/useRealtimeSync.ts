/**
 * useRealtimeSync Hook
 * 
 * Subscribes to Supabase real-time changes for live updates across the app.
 * Triggers query invalidation when data changes in the database.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Event types for custom event dispatching
export const REALTIME_EVENTS = {
  KPI_UPDATED: 'noctisium:kpi-updated',
  GOAL_UPDATED: 'noctisium:goal-updated',
  PROGRESSION_UPDATED: 'noctisium:progression-updated',
  CONTENT_UPDATED: 'noctisium:content-updated',
} as const;

// Tables to subscribe to
const SUBSCRIBED_TABLES = [
  'weekly_kpis',
  'weekly_kpi_entries',
  'user_kpis',
  'goals_v2',
  'user_progression',
  'content_metrics',
  'user_rank',
] as const;

type SubscribedTable = typeof SUBSCRIBED_TABLES[number];

interface UseRealtimeSyncOptions {
  enabled?: boolean;
  onKPIChange?: () => void;
  onGoalChange?: () => void;
  onProgressionChange?: () => void;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { enabled = true, onKPIChange, onGoalChange, onProgressionChange } = options;

  // Invalidate queries based on table change
  const handleTableChange = useCallback((table: SubscribedTable) => {
    console.log(`[RealtimeSync] Change detected in table: ${table}`);

    switch (table) {
      case 'weekly_kpis':
      case 'weekly_kpi_entries':
      case 'user_kpis':
        // Invalidate all KPI-related queries
        queryClient.invalidateQueries({ queryKey: ['weekly-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
        // Dispatch custom event for non-React-Query consumers
        window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.KPI_UPDATED));
        onKPIChange?.();
        break;

      case 'goals_v2':
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        queryClient.invalidateQueries({ queryKey: ['roadmap'] });
        window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.GOAL_UPDATED));
        onGoalChange?.();
        break;

      case 'user_progression':
      case 'user_rank':
        queryClient.invalidateQueries({ queryKey: ['progression'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['rank'] });
        window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.PROGRESSION_UPDATED));
        onProgressionChange?.();
        break;

      case 'content_metrics':
        queryClient.invalidateQueries({ queryKey: ['content'] });
        queryClient.invalidateQueries({ queryKey: ['goals'] }); // Content goals need refresh
        window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.CONTENT_UPDATED));
        break;
    }
  }, [queryClient, onKPIChange, onGoalChange, onProgressionChange]);

  // Setup subscriptions
  useEffect(() => {
    if (!user?.id || !enabled) {
      return;
    }

    // Create a unique channel for this user
    const channelName = `realtime-sync-${user.id}`;
    
    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log(`[RealtimeSync] Setting up subscriptions for user: ${user.id}`);

    // Create channel with subscriptions to all tables
    const channel = supabase.channel(channelName);

    // Subscribe to each table with user filter
    SUBSCRIBED_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(`[RealtimeSync] ${payload.eventType} on ${table}:`, payload);
          handleTableChange(table);
        }
      );
    });

    // Start subscription
    channel.subscribe((status, err) => {
      console.log(`[RealtimeSync] Subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeSync] Successfully subscribed to all tables');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[RealtimeSync] Channel error - some tables may not support real-time. This is expected if RLS is not configured for all tables.', err);
        // Real-time will still work for tables that do support it
      } else if (status === 'CLOSED') {
        console.log('[RealtimeSync] Channel closed');
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log('[RealtimeSync] Cleaning up subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, enabled, handleTableChange]);

  // Manual refresh function
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['weekly-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['progression'] });
    queryClient.invalidateQueries({ queryKey: ['content'] });
  }, [queryClient]);

  return {
    refreshAll,
    isConnected: channelRef.current !== null,
  };
}

/**
 * Hook to listen for real-time events (for components not using React Query)
 */
export function useRealtimeEvent(
  event: keyof typeof REALTIME_EVENTS,
  callback: () => void
) {
  useEffect(() => {
    const eventName = REALTIME_EVENTS[event];
    const handler = () => callback();
    
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [event, callback]);
}

export default useRealtimeSync;
