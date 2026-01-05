import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { GoalStatus } from '@/components/roadmap/StatusIndicator';

// Types (frontend uses camelCase)
export interface Goal {
  id: string;
  name: string;
  yearlyTarget: number;
  unit: string;
  source: 'kpi' | 'content' | 'manual';
  connectedKpis?: string[];
  manualMonthly?: Record<string, number>;
}

export interface GoalWithProgress extends Goal {
  currentTotal: number;
  progressPct: number;
  monthlyTarget: number;
  monthlyActuals: number[];
  
  // v3 additions
  status: GoalStatus;
  trend: {
    percentChange: number;
    direction: 'up' | 'flat' | 'down';
  };
  weeklyData: {
    current: number;
    last4Weeks: number[];
    weeklyTarget: number;
    weeklyAverage: number;
  };
  remaining: {
    amount: number;
    perMonth: number;
  };
  expectedPace: number;
}

// Database row type (snake_case)
interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  yearly_target: number;
  unit: string;
  source: 'kpi' | 'content' | 'manual';
  connected_kpis: string[] | null;
  manual_monthly: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Convert DB row to frontend Goal
const rowToGoal = (row: GoalRow): Goal => ({
  id: row.id,
  name: row.name,
  yearlyTarget: row.yearly_target,
  unit: row.unit,
  source: row.source,
  connectedKpis: row.connected_kpis || undefined,
  manualMonthly: row.manual_monthly || undefined,
});

// Convert frontend Goal to DB row (partial for inserts/updates)
const goalToRow = (goal: Omit<Goal, 'id'> | Goal): Partial<GoalRow> => {
  const row: Partial<GoalRow> = {
    name: goal.name,
    yearly_target: goal.yearlyTarget,
    unit: goal.unit,
    source: goal.source,
    connected_kpis: goal.connectedKpis || [],
    manual_monthly: goal.manualMonthly || {},
  };
  if ('id' in goal) {
    row.id = goal.id;
  }
  return row;
};

// Get week dates for a week key (handles fiscal year)
const getWeekDates = (weekKey: string): { start: Date; end: Date } => {
  const [year, week] = weekKey.split('-W').map(Number);
  const fiscalStart = new Date(year, 8, 1); // September 1st
  const start = new Date(fiscalStart);
  start.setDate(fiscalStart.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
};

// Get current week key
const getCurrentWeekKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const fiscalStart = new Date(year, 8, 1);
  const effectiveStart = now >= fiscalStart ? fiscalStart : new Date(year - 1, 8, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayIndex = Math.floor((now.getTime() - effectiveStart.getTime()) / msPerDay);
  const weekNumber = Math.floor(dayIndex / 7) + 1;
  const yearLabel = now >= fiscalStart ? year : year - 1;
  return `${yearLabel}-W${weekNumber.toString().padStart(2, '0')}`;
};

// Calculate monthly totals from weekly KPI data
const calculateMonthlyFromKPIs = (
  weeklyRecords: any[],
  kpiIds: string[],
  year: number
): number[] => {
  const monthlyTotals = new Array(12).fill(0);

  weeklyRecords.forEach(record => {
    const { start } = getWeekDates(record.week_key);
    if (start.getFullYear() !== year) return;

    const monthIndex = start.getMonth();
    kpiIds.forEach(kpiId => {
      const value = record.values?.[kpiId] || 0;
      monthlyTotals[monthIndex] += value;
    });
  });

  return monthlyTotals;
};

// Calculate weekly data for a goal
const calculateWeeklyData = (
  weeklyRecords: any[],
  kpiIds: string[],
  yearlyTarget: number
): { current: number; last4Weeks: number[]; weeklyTarget: number; weeklyAverage: number } => {
  const currentWeekKey = getCurrentWeekKey();
  const weeklyTarget = yearlyTarget / 52;
  
  // Sort records by week key descending
  const sortedRecords = [...weeklyRecords].sort((a, b) => 
    b.week_key.localeCompare(a.week_key)
  );
  
  // Get last 4 weeks of data
  const last4Weeks: number[] = [];
  let current = 0;
  let totalWeeks = 0;
  let totalValue = 0;
  
  sortedRecords.forEach(record => {
    let weekValue = 0;
    kpiIds.forEach(kpiId => {
      weekValue += record.values?.[kpiId] || 0;
    });
    
    if (record.week_key === currentWeekKey) {
      current = weekValue;
    }
    
    if (last4Weeks.length < 4) {
      last4Weeks.push(weekValue);
    }
    
    totalValue += weekValue;
    totalWeeks++;
  });
  
  // Reverse to get chronological order
  last4Weeks.reverse();
  
  const weeklyAverage = totalWeeks > 0 ? totalValue / totalWeeks : 0;
  
  return { current, last4Weeks, weeklyTarget, weeklyAverage };
};

// Calculate monthly follower growth from content metrics
const calculateMonthlyFollowers = (
  contentMetrics: any[],
  year: number
): { monthlyGrowth: number[]; cumulative: number } => {
  const monthlyGrowth = new Array(12).fill(0);
  let cumulative = 0;

  contentMetrics.forEach(metric => {
    const date = new Date(metric.snapshot_date || metric.created_at);
    if (date.getFullYear() !== year) return;

    const monthIndex = date.getMonth();
    const follows = metric.follows || 0;
    monthlyGrowth[monthIndex] += follows;
    cumulative += follows;
  });

  return { monthlyGrowth, cumulative };
};

// Calculate status based on pace
const calculateStatus = (currentTotal: number, yearlyTarget: number): GoalStatus => {
  const currentMonth = new Date().getMonth();
  const expectedPace = ((currentMonth + 1) / 12) * yearlyTarget;
  const paceRatio = currentTotal / expectedPace;
  
  if (paceRatio >= 1) return 'on-pace';
  if (paceRatio >= 0.75) return 'slightly-behind';
  return 'behind';
};

// Calculate trend
const calculateTrend = (monthlyActuals: number[]): { percentChange: number; direction: 'up' | 'flat' | 'down' } => {
  const currentMonth = new Date().getMonth();
  const current = monthlyActuals[currentMonth] || 0;
  const previous = currentMonth > 0 ? monthlyActuals[currentMonth - 1] || 0 : 0;
  
  if (previous === 0) {
    return { percentChange: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
  }
  
  const percentChange = ((current - previous) / previous) * 100;
  const direction = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'flat';
  
  return { percentChange, direction };
};

export const useGoals = () => {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Fetch and compute goals with progress
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);

    try {
      // 1. Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals_v2')
        .select('*')
        .order('created_at', { ascending: true });

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        setGoals([]);
        setIsLoading(false);
        return;
      }

      // Convert rows to frontend format
      const rawGoals: Goal[] = (goalsData as GoalRow[] || []).map(rowToGoal);

      // 2. Fetch weekly KPIs for current year
      const { data: weeklyKPIs } = await supabase
        .from('weekly_kpi_entries')
        .select('week_key, values')
        .like('week_key', `${currentYear}%`);

      // 3. Fetch content metrics for followers
      const { data: contentMetrics } = await supabase
        .from('content_metrics')
        .select('follows, snapshot_date, created_at')
        .gte('created_at', `${currentYear}-01-01`);

      // 4. Calculate progress for each goal
      const goalsWithProgress: GoalWithProgress[] = rawGoals.map(goal => {
        let monthlyActuals: number[] = new Array(12).fill(0);
        let currentTotal = 0;
        let weeklyData = { current: 0, last4Weeks: [0, 0, 0, 0], weeklyTarget: goal.yearlyTarget / 52, weeklyAverage: 0 };

        if (goal.source === 'kpi' && goal.connectedKpis?.length) {
          monthlyActuals = calculateMonthlyFromKPIs(
            weeklyKPIs || [],
            goal.connectedKpis,
            currentYear
          );
          currentTotal = monthlyActuals.reduce((sum, v) => sum + v, 0);
          weeklyData = calculateWeeklyData(weeklyKPIs || [], goal.connectedKpis, goal.yearlyTarget);
        } else if (goal.source === 'content') {
          const { monthlyGrowth, cumulative } = calculateMonthlyFollowers(
            contentMetrics || [],
            currentYear
          );
          monthlyActuals = monthlyGrowth;
          currentTotal = cumulative;
          // For content, use monthly data for weekly approximation
          const currentMonthValue = monthlyActuals[currentMonth] || 0;
          weeklyData = {
            current: Math.round(currentMonthValue / 4),
            last4Weeks: [
              Math.round((monthlyActuals[Math.max(0, currentMonth - 1)] || 0) / 4),
              Math.round((monthlyActuals[Math.max(0, currentMonth - 1)] || 0) / 4),
              Math.round(currentMonthValue / 4),
              Math.round(currentMonthValue / 4),
            ],
            weeklyTarget: goal.yearlyTarget / 52,
            weeklyAverage: currentTotal / Math.max(1, currentMonth + 1) / 4,
          };
        } else if (goal.source === 'manual' && goal.manualMonthly) {
          monthlyActuals = MONTHS.map(m => goal.manualMonthly?.[m] || 0);
          currentTotal = monthlyActuals.reduce((sum, v) => sum + v, 0);
          // For manual, estimate weekly from monthly
          const currentMonthValue = monthlyActuals[currentMonth] || 0;
          weeklyData = {
            current: Math.round(currentMonthValue / 4),
            last4Weeks: [
              Math.round((monthlyActuals[Math.max(0, currentMonth - 1)] || 0) / 4),
              Math.round((monthlyActuals[Math.max(0, currentMonth - 1)] || 0) / 4),
              Math.round(currentMonthValue / 4),
              Math.round(currentMonthValue / 4),
            ],
            weeklyTarget: goal.yearlyTarget / 52,
            weeklyAverage: currentTotal / Math.max(1, currentMonth + 1) / 4,
          };
        }

        const monthsRemaining = 12 - currentMonth - 1;
        const remaining = Math.max(0, goal.yearlyTarget - currentTotal);
        const expectedPace = ((currentMonth + 1) / 12) * goal.yearlyTarget;

        return {
          ...goal,
          currentTotal,
          progressPct: goal.yearlyTarget > 0 ? currentTotal / goal.yearlyTarget : 0,
          monthlyTarget: goal.yearlyTarget / 12,
          monthlyActuals,
          status: calculateStatus(currentTotal, goal.yearlyTarget),
          trend: calculateTrend(monthlyActuals),
          weeklyData,
          remaining: {
            amount: remaining,
            perMonth: monthsRemaining > 0 ? remaining / monthsRemaining : remaining,
          },
          expectedPace,
        };
      });

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error in fetchGoals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  // Add a new goal
  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      throw new Error('Not authenticated');
    }

    const row = {
      ...goalToRow(goal),
      user_id: user.id,
    };

    const { error } = await supabase
      .from('goals_v2')
      .insert(row);

    if (error) {
      console.error('Error adding goal:', error);
      throw error;
    }

    await fetchGoals();
  }, [fetchGoals]);

  // Update an existing goal
  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    const row: Record<string, any> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.yearlyTarget !== undefined) row.yearly_target = updates.yearlyTarget;
    if (updates.unit !== undefined) row.unit = updates.unit;
    if (updates.source !== undefined) row.source = updates.source;
    if (updates.connectedKpis !== undefined) row.connected_kpis = updates.connectedKpis || [];
    if (updates.manualMonthly !== undefined) row.manual_monthly = updates.manualMonthly || {};

    const { error } = await supabase
      .from('goals_v2')
      .update(row)
      .eq('id', id);

    if (error) {
      console.error('Error updating goal:', error);
      throw error;
    }

    await fetchGoals();
  }, [fetchGoals]);

  // Delete a goal
  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('goals_v2')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }

    await fetchGoals();
  }, [fetchGoals]);

  // Initial fetch
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    isLoading,
    addGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals,
  };
};
