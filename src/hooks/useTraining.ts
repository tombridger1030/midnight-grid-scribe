/**
 * useTraining Hook
 *
 * Manages training types and sessions.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrainingType,
  TrainingSession,
  DEFAULT_TRAINING_TYPES,
} from "@/lib/kpiDefaults";
import { getWeekDates, updateWeeklyKPIRecord } from "@/lib/weeklyKpi";
import { formatLocalDate } from "@/lib/dateUtils";
import { useProgressionStore } from "@/stores/progressionStore";

export interface UseTrainingReturn {
  trainingTypes: TrainingType[];
  sessions: TrainingSession[];
  sessionCount: number;
  countingSessionCount: number; // Only sessions that count toward target
  addSession: (typeId: string, date: string, notes?: string) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  addTrainingType: (
    name: string,
    color: string,
    icon?: string,
  ) => Promise<void>;
  updateTrainingType: (
    id: string,
    updates: Partial<TrainingType>,
  ) => Promise<void>;
  deleteTrainingType: (id: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useTraining(weekKey: string): UseTrainingReturn {
  const { user } = useAuth();
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get week date range
  const { start, end } = getWeekDates(weekKey);
  const startDate = formatLocalDate(start);
  const endDate = formatLocalDate(end);

  // Load training types
  const loadTrainingTypes = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from("training_types")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order");

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        return data as TrainingType[];
      }

      // No training types - initialize defaults
      await initializeDefaultTypes();
      // Reload after initialization
      const { data: reloaded } = await supabase
        .from("training_types")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order");

      return (reloaded || []) as TrainingType[];
    } catch (err) {
      console.error("Failed to load training types:", err);
      return [];
    }
  }, [user?.id]);

  // Initialize default training types
  const initializeDefaultTypes = useCallback(async () => {
    if (!user?.id) return;

    try {
      const typesToInsert = DEFAULT_TRAINING_TYPES.map((type) => ({
        user_id: user.id,
        ...type,
        is_active: true,
      }));

      const { error: insertError } = await supabase
        .from("training_types")
        .upsert(typesToInsert, { onConflict: "user_id,name" });

      if (insertError) {
        console.error("Failed to initialize training types:", insertError);
      }
    } catch (err) {
      console.error("Error initializing training types:", err);
    }
  }, [user?.id]);

  // Load sessions for the week
  const loadSessions = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from("training_sessions")
        .select(
          `
          *,
          training_type:training_types(*)
        `,
        )
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      return (data || []) as TrainingSession[];
    } catch (err) {
      console.error("Failed to load training sessions:", err);
      return [];
    }
  }, [user?.id, startDate, endDate]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [types, weekSessions] = await Promise.all([
        loadTrainingTypes(),
        loadSessions(),
      ]);

      setTrainingTypes(types);
      setSessions(weekSessions);
    } catch (err) {
      console.error("Failed to load training data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load training data"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadTrainingTypes, loadSessions]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when week changes
  useEffect(() => {
    if (!isLoading && user?.id) {
      loadSessions().then(setSessions);
    }
  }, [weekKey]);

  // Add a training session
  const addSession = useCallback(
    async (typeId: string, date: string, notes?: string) => {
      if (!user?.id) return;

      try {
        const { data, error: insertError } = await supabase
          .from("training_sessions")
          .insert({
            user_id: user.id,
            training_type_id: typeId,
            date,
            notes,
          })
          .select(
            `
          *,
          training_type:training_types(*)
        `,
          )
          .single();

        if (insertError) throw insertError;

        if (data) {
          setSessions((prev) =>
            [...prev, data as TrainingSession].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          );
          // Award XP for training session
          useProgressionStore.getState().onKPIEntry("training");
        }
      } catch (err) {
        console.error("Failed to add training session:", err);
        throw err;
      }
    },
    [user?.id],
  );

  // Remove a training session
  const removeSession = useCallback(
    async (sessionId: string) => {
      if (!user?.id) return;

      // Optimistic update
      const previousSessions = sessions;
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      try {
        const { error: deleteError } = await supabase
          .from("training_sessions")
          .delete()
          .eq("id", sessionId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;
      } catch (err) {
        console.error("Failed to remove training session:", err);
        setSessions(previousSessions);
        throw err;
      }
    },
    [user?.id, sessions],
  );

  // Add a new training type
  const addTrainingType = useCallback(
    async (name: string, color: string, icon?: string) => {
      if (!user?.id) return;

      try {
        const maxSortOrder = Math.max(
          0,
          ...trainingTypes.map((t) => t.sort_order),
        );

        const { data, error: insertError } = await supabase
          .from("training_types")
          .insert({
            user_id: user.id,
            name,
            color,
            icon: icon || "🏋️",
            counts_toward_target: true,
            sort_order: maxSortOrder + 1,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (data) {
          setTrainingTypes((prev) => [...prev, data as TrainingType]);
        }
      } catch (err) {
        console.error("Failed to add training type:", err);
        throw err;
      }
    },
    [user?.id, trainingTypes],
  );

  // Update a training type
  const updateTrainingType = useCallback(
    async (id: string, updates: Partial<TrainingType>) => {
      if (!user?.id) return;

      try {
        const { error: updateError } = await supabase
          .from("training_types")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setTrainingTypes((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        );
      } catch (err) {
        console.error("Failed to update training type:", err);
        throw err;
      }
    },
    [user?.id],
  );

  // Delete (deactivate) a training type
  const deleteTrainingType = useCallback(
    async (id: string) => {
      if (!user?.id) return;

      try {
        const { error: updateError } = await supabase
          .from("training_types")
          .update({ is_active: false })
          .eq("id", id)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setTrainingTypes((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        console.error("Failed to delete training type:", err);
        throw err;
      }
    },
    [user?.id],
  );

  // Calculate session counts
  const sessionCount = sessions.length;
  const countingSessionCount = sessions.filter(
    (s) => s.training_type?.counts_toward_target !== false,
  ).length;

  // Sync combined training sessions count to weekly KPI system
  useEffect(() => {
    if (user?.id && weekKey) {
      updateWeeklyKPIRecord(weekKey, {
        trainingSessions: countingSessionCount, // Combined total of all training types
      });
    }
  }, [countingSessionCount, user?.id, weekKey]);

  return {
    trainingTypes,
    sessions,
    sessionCount,
    countingSessionCount,
    addSession,
    removeSession,
    addTrainingType,
    updateTrainingType,
    deleteTrainingType,
    isLoading,
    error,
  };
}

export default useTraining;
