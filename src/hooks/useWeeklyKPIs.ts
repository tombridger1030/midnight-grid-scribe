/**
 * useWeeklyKPIs Hook
 * 
 * Main data hook for weekly KPI tracking.
 * Handles fetching, updating, and calculating progress.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_KPIS, KPIType, AutoSyncSource } from '@/lib/kpiDefaults';
import { getCurrentWeek, getWeekDates, formatWeekKey } from '@/lib/weeklyKpi';

export interface KPIConfig {
  id: string;
  kpi_id: string;
  name: string;
  target: number | null;
  unit: string;
  color: string;
  kpi_type: KPIType;
  auto_sync_source: AutoSyncSource;
  sort_order: number;
  is_active: boolean;
}

export interface WeeklyKPIData {
  kpis: KPIConfig[];
  values: Record<string, number>;
  weekKey: string;
  weekLabel: string;
  weekDates: { start: Date; end: Date };
  overallProgress: number;
  isLoading: boolean;
  error: Error | null;
}

export interface UseWeeklyKPIsReturn extends WeeklyKPIData {
  updateValue: (kpiId: string, value: number) => Promise<void>;
  navigateWeek: (direction: 'prev' | 'next') => void;
  goToWeek: (weekKey: string) => void;
  refreshData: () => Promise<void>;
}

export function useWeeklyKPIs(initialWeekKey?: string): UseWeeklyKPIsReturn {
  const { user } = useAuth();
  const [weekKey, setWeekKey] = useState(initialWeekKey || getCurrentWeek());
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Compute week metadata
  const weekDates = useMemo(() => getWeekDates(weekKey), [weekKey]);
  const weekLabel = useMemo(() => formatWeekKey(weekKey), [weekKey]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const activeKpis = kpis.filter(k => k.is_active && k.target && k.target > 0);
    if (activeKpis.length === 0) return 0;

    let totalProgress = 0;
    for (const kpi of activeKpis) {
      const value = values[kpi.kpi_id] || 0;
      const progress = Math.min(100, (value / kpi.target!) * 100);
      totalProgress += progress;
    }

    return Math.round(totalProgress / activeKpis.length);
  }, [kpis, values]);

  // Load KPI configs
  const loadKPIConfigs = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('user_kpis')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          kpi_id: row.kpi_id,
          name: row.name,
          target: row.target ? parseFloat(row.target) : null,
          unit: row.unit,
          color: row.color,
          kpi_type: row.kpi_type || 'counter',
          auto_sync_source: row.auto_sync_source || null,
          sort_order: row.sort_order || 0,
          is_active: row.is_active,
        })) as KPIConfig[];
      }

      // No KPIs found - initialize defaults
      await initializeDefaultKPIs();
      return DEFAULT_KPIS.map((kpi, idx) => ({
        id: `default-${idx}`,
        ...kpi,
      })) as KPIConfig[];
    } catch (err) {
      console.error('Failed to load KPI configs:', err);
      // Return defaults as fallback
      return DEFAULT_KPIS.map((kpi, idx) => ({
        id: `default-${idx}`,
        ...kpi,
      })) as KPIConfig[];
    }
  }, [user?.id]);

  // Initialize default KPIs for new users
  const initializeDefaultKPIs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const kpisToInsert = DEFAULT_KPIS.map(kpi => ({
        user_id: user.id,
        ...kpi,
      }));

      const { error: insertError } = await supabase
        .from('user_kpis')
        .upsert(kpisToInsert, { onConflict: 'user_id,kpi_id' });

      if (insertError) {
        console.error('Failed to initialize default KPIs:', insertError);
      }
    } catch (err) {
      console.error('Error initializing default KPIs:', err);
    }
  }, [user?.id]);

  // Load weekly values
  const loadWeeklyValues = useCallback(async () => {
    if (!user?.id) return {};

    try {
      const { data, error: fetchError } = await supabase
        .from('weekly_kpis')
        .select('data')
        .eq('user_id', user.id)
        .eq('week_key', weekKey)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data?.data) {
        // Handle both old format (values nested) and new format
        const values = data.data.values || data.data;
        return typeof values === 'object' ? values : {};
      }

      return {};
    } catch (err) {
      console.error('Failed to load weekly values:', err);
      return {};
    }
  }, [user?.id, weekKey]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [loadedKpis, loadedValues] = await Promise.all([
        loadKPIConfigs(),
        loadWeeklyValues(),
      ]);

      setKpis(loadedKpis);
      setValues(loadedValues);
    } catch (err) {
      console.error('Failed to load weekly KPI data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadKPIConfigs, loadWeeklyValues]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when week changes
  useEffect(() => {
    if (!isLoading) {
      loadWeeklyValues().then(setValues);
    }
  }, [weekKey]);

  // Update a KPI value
  const updateValue = useCallback(async (kpiId: string, value: number) => {
    if (!user?.id) return;

    // Optimistic update
    const newValues = { ...values, [kpiId]: value };
    setValues(newValues);

    try {
      const { error: upsertError } = await supabase
        .from('weekly_kpis')
        .upsert({
          user_id: user.id,
          week_key: weekKey,
          data: { values: newValues },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,week_key' });

      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('Failed to update KPI value:', err);
      // Revert on error
      setValues(values);
    }
  }, [user?.id, weekKey, values]);

  // Navigate between weeks
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    const [year, week] = weekKey.split('-W').map(Number);
    let newWeek = week + (direction === 'next' ? 1 : -1);
    let newYear = year;

    if (newWeek < 1) {
      newWeek = 52;
      newYear -= 1;
    } else if (newWeek > 52) {
      newWeek = 1;
      newYear += 1;
    }

    setWeekKey(`${newYear}-W${String(newWeek).padStart(2, '0')}`);
  }, [weekKey]);

  // Go to specific week
  const goToWeek = useCallback((newWeekKey: string) => {
    setWeekKey(newWeekKey);
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    kpis,
    values,
    weekKey,
    weekLabel,
    weekDates,
    overallProgress,
    isLoading,
    error,
    updateValue,
    navigateWeek,
    goToWeek,
    refreshData,
  };
}

export default useWeeklyKPIs;
