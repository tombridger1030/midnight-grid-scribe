/**
 * useSleep Hook
 * 
 * Manages daily sleep tracking (sleep time, wake time, hours, quality).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getWeekDates } from '@/lib/weeklyKpi';

export interface DailySleep {
  id?: string;
  user_id?: string;
  date: string;
  sleep_time: string | null; // HH:MM format
  wake_time: string | null;  // HH:MM format
  hours: number;
  quality: number; // 1-5 scale
}

export interface UseSleepReturn {
  weekData: Record<string, DailySleep>;
  weeklyTotal: number;
  dailyAverage: number;
  daysTracked: number;
  isLoading: boolean;
  error: Error | null;
  updateDay: (date: string, data: Partial<DailySleep>) => Promise<void>;
  getDay: (date: string) => DailySleep | null;
}

const emptyDay: DailySleep = {
  date: '',
  sleep_time: null,
  wake_time: null,
  hours: 0,
  quality: 0,
};

// Calculate hours between sleep and wake times
function calculateHours(sleepTime: string | null, wakeTime: string | null): number {
  if (!sleepTime || !wakeTime) return 0;
  
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  
  let sleepMinutes = sleepH * 60 + sleepM;
  let wakeMinutes = wakeH * 60 + wakeM;
  
  // If wake time is earlier than sleep time, assume next day
  if (wakeMinutes < sleepMinutes) {
    wakeMinutes += 24 * 60;
  }
  
  const diff = wakeMinutes - sleepMinutes;
  return Math.round(diff / 60 * 10) / 10; // Round to 1 decimal
}

export function useSleep(weekKey: string): UseSleepReturn {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<Record<string, DailySleep>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get week date range
  const { start, end } = getWeekDates(weekKey);
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  // Load sleep data for the week
  const loadWeekData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_sleep')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (fetchError) throw fetchError;

      // Convert to record keyed by date
      const byDate: Record<string, DailySleep> = {};
      (data || []).forEach((row: DailySleep) => {
        byDate[row.date] = row;
      });

      setWeekData(byDate);
    } catch (err) {
      console.error('Failed to load sleep data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load sleep data'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, startDate, endDate]);

  // Initial load
  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Update sleep data for a date
  const updateDay = useCallback(async (date: string, data: Partial<DailySleep>) => {
    if (!user?.id) return;

    const existing = weekData[date] || { ...emptyDay, date };
    
    // Calculate hours if times are provided
    const sleepTime = data.sleep_time !== undefined ? data.sleep_time : existing.sleep_time;
    const wakeTime = data.wake_time !== undefined ? data.wake_time : existing.wake_time;
    const autoHours = calculateHours(sleepTime, wakeTime);
    
    const updated: DailySleep = {
      ...existing,
      ...data,
      date,
      hours: data.hours !== undefined ? data.hours : autoHours,
    };

    // Optimistic update
    setWeekData(prev => ({ ...prev, [date]: updated }));

    try {
      const { error: upsertError } = await supabase
        .from('daily_sleep')
        .upsert({
          user_id: user.id,
          date,
          sleep_time: updated.sleep_time,
          wake_time: updated.wake_time,
          hours: updated.hours,
          quality: updated.quality,
        }, { onConflict: 'user_id,date' });

      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('Failed to update sleep:', err);
      // Revert on error
      setWeekData(prev => {
        const reverted = { ...prev };
        if (existing.id) {
          reverted[date] = existing;
        } else {
          delete reverted[date];
        }
        return reverted;
      });
      throw err;
    }
  }, [user?.id, weekData]);

  // Get data for a specific day
  const getDay = useCallback((date: string): DailySleep | null => {
    return weekData[date] || null;
  }, [weekData]);

  // Calculate weekly total hours
  const weeklyTotal = Object.values(weekData).reduce(
    (acc, day) => acc + (day.hours || 0),
    0
  );

  // Calculate daily average
  const daysTracked = Object.values(weekData).filter(d => d.hours > 0).length;
  const dailyAverage = daysTracked > 0
    ? Math.round((weeklyTotal / daysTracked) * 10) / 10
    : 0;

  return {
    weekData,
    weeklyTotal,
    dailyAverage,
    daysTracked,
    isLoading,
    error,
    updateDay,
    getDay,
  };
}

export default useSleep;
