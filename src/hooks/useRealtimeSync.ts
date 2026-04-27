// Realtime sync — subscribes to v3 operator tables and invalidates client cache
// when remote changes occur (e.g. from edge functions or another device).

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

const SUBSCRIBED_TABLES = [
  "daily_inputs",
  "block_instances",
  "daily_flow",
  "monthly_goals",
  "blog_posts",
  "schedule_blocks",
] as const;

type SubscribedTable = (typeof SUBSCRIBED_TABLES)[number];

interface UseRealtimeSyncOptions {
  enabled?: boolean;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { enabled = true } = options;

  const handleTableChange = useCallback(
    (table: SubscribedTable) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      window.dispatchEvent(new CustomEvent(`noctisium:${table}-updated`));
    },
    [queryClient],
  );

  useEffect(() => {
    if (!user?.id || !enabled) return;

    const channelName = `operator-${user.id}`;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(channelName);
    SUBSCRIBED_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${user.id}`,
        },
        () => handleTableChange(table),
      );
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(
          "[RealtimeSync] channel error — RLS may not be configured",
        );
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, enabled, handleTableChange]);

  const refreshAll = useCallback(() => {
    SUBSCRIBED_TABLES.forEach((table) =>
      queryClient.invalidateQueries({ queryKey: [table] }),
    );
  }, [queryClient]);

  return { refreshAll };
}
