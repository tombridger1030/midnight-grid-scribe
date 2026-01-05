/**
 * useAnalytics Hook
 * 
 * Aggregates data from multiple sources for the Analytics page.
 * Provides computed insights, trends, patterns, and projections.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from './useDashboardData';
import { useGoals, GoalWithProgress } from './useGoals';
import { kpiManager, ConfigurableKPI } from '@/lib/configurableKpis';
import { loadWeeklyKPIs, getRecentWeeks, getCurrentWeek } from '@/lib/weeklyKpi';
import { rankingManager } from '@/lib/rankingSystem';
import { REALTIME_EVENTS } from '@/hooks/useRealtimeSync';
import {
  calculateMean,
  calculateTrend,
  calculateRollingAverage,
  calculatePearsonCorrelation,
  buildCorrelationMatrix,
  calculateDayOfWeekDistribution,
  identifyStreaks,
  calculatePace,
  generateHighlights,
  generateRecommendations,
  findPersonalRecords,
  calculateCategoryProgress,
  getProgressColor,
  DEFAULT_CATEGORIES,
  type TrendResult,
  type CorrelationResult,
  type Highlight,
  type Recommendation,
  type PersonalRecord,
  type Streak,
  type DayStats,
  type PaceResult,
} from '@/lib/analyticsCalculations';

// ============================================================================
// TYPES
// ============================================================================

export interface WeekDataPoint {
  weekKey: string;
  percentage: number;
  date?: Date;
}

export interface KPITrendData {
  kpiId: string;
  name: string;
  color: string;
  unit: string;
  currentValue: number;
  target: number;
  average: number;
  best: number;
  bestWeek: string;
  trend: TrendResult;
  history: Array<{ weekKey: string; value: number }>;
  sparklineData: number[];
}

export interface CategoryTrendData {
  id: string;
  name: string;
  color: string;
  currentProgress: number;
  averageProgress: number;
  trend: TrendResult;
  history: number[];
}

export interface RankDataPoint {
  weekKey: string;
  rrPoints: number;
  rank: string;
  change: number;
}

export interface GoalAnalytics {
  id: string;
  name: string;
  yearlyTarget: number;
  unit: string;
  currentTotal: number;
  progressPct: number;
  pace: PaceResult;
  monthlyData: Array<{ month: string; actual: number; target: number }>;
  projectedTotal: number;
}

export interface PatternsData {
  dayOfWeek: Record<string, DayStats[]>;
  correlations: CorrelationResult[];
  streaks: Record<string, Streak[]>;
  distributions: Record<string, number[]>;
}

export interface OverviewData {
  currentWeekScore: number;
  currentWeekKey: string;
  weekOverWeekChange: number;
  monthlyAverage: number;
  yearlyAverage: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  rank: string;
  rrPoints: number;
  totalWeeksTracked: number;
  perfectWeeks: number;
  kpiSummaries: Array<{
    id: string;
    name: string;
    value: number;
    target: number;
    percentage: number;
    color: string;
    trend: 'up' | 'down' | 'stable';
    changeVsAvg: number;
  }>;
  categoryProgress: Record<string, number>;
}

export interface TrendsData {
  weeklyHistory: WeekDataPoint[];
  rollingAverage: number[];
  kpiTrends: KPITrendData[];
  categoryTrends: CategoryTrendData[];
  rankHistory: RankDataPoint[];
}

export interface InsightsData {
  highlights: Highlight[];
  recommendations: Recommendation[];
  records: PersonalRecord[];
  recentAchievements: string[];
}

export interface AnalyticsData {
  overview: OverviewData;
  trends: TrendsData;
  patterns: PatternsData;
  goals: GoalAnalytics[];
  insights: InsightsData;
}

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

// ============================================================================
// HOOK
// ============================================================================

export function useAnalytics(period: AnalyticsPeriod = 'all') {
  const { user } = useAuth();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData();
  const { goals, isLoading: goalsLoading } = useGoals();
  
  const [activeKPIs, setActiveKPIs] = useState<ConfigurableKPI[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<Array<{ weekKey: string; values: Record<string, number> }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load analytics data function
  const loadAnalyticsData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Load KPIs
      const kpis = await kpiManager.getActiveKPIs();
      setActiveKPIs(kpis);
      
      // Load all weekly data
      const weeklyData = loadWeeklyKPIs();
      setWeeklyRecords(weeklyData.records || []);
      
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load analytics data'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load base data on mount
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Listen for real-time KPI updates
  useEffect(() => {
    const handleKPIUpdate = () => {
      console.log('[Analytics] KPI update detected, refreshing data...');
      loadAnalyticsData();
    };

    window.addEventListener(REALTIME_EVENTS.KPI_UPDATED, handleKPIUpdate);

    return () => {
      window.removeEventListener(REALTIME_EVENTS.KPI_UPDATED, handleKPIUpdate);
    };
  }, [loadAnalyticsData]);

  // Get filtered weeks based on period
  const getWeeksForPeriod = useCallback((p: AnalyticsPeriod): number => {
    switch (p) {
      case 'week': return 1;
      case 'month': return 4;
      case 'quarter': return 13;
      case 'year': return 52;
      case 'all': return 999; // All available
      default: return 52;
    }
  }, []);

  // Compute analytics data
  const analyticsData = useMemo<AnalyticsData | null>(() => {
    if (!dashboardData || activeKPIs.length === 0) return null;
    
    const weeksToShow = getWeeksForPeriod(period);
    const allWeekKeys = getRecentWeeks(Math.min(weeksToShow, weeklyRecords.length || 52));
    const currentWeekKey = getCurrentWeek();
    
    // Build weekly history with percentages
    const weeklyHistory: WeekDataPoint[] = allWeekKeys.map(weekKey => {
      const record = weeklyRecords.find(r => r.weekKey === weekKey);
      let percentage = 0;
      
      if (record?.values) {
        let total = 0;
        let count = 0;
        for (const kpi of activeKPIs) {
          if (kpi.target && kpi.target > 0) {
            const value = record.values[kpi.kpi_id] || 0;
            total += Math.min(100, (value / kpi.target) * 100);
            count++;
          }
        }
        percentage = count > 0 ? Math.round(total / count) : 0;
      }
      
      return { weekKey, percentage };
    });
    
    // Build KPI history maps
    const kpiHistoryMap: Record<string, Array<{ weekKey: string; value: number; target: number }>> = {};
    const kpiValuesMap: Record<string, number[]> = {};
    
    for (const kpi of activeKPIs) {
      kpiHistoryMap[kpi.kpi_id] = [];
      kpiValuesMap[kpi.kpi_id] = [];
      
      for (const weekKey of allWeekKeys) {
        const record = weeklyRecords.find(r => r.weekKey === weekKey);
        const value = record?.values?.[kpi.kpi_id] || 0;
        kpiHistoryMap[kpi.kpi_id].push({ weekKey, value, target: kpi.target || 0 });
        kpiValuesMap[kpi.kpi_id].push(value);
      }
    }
    
    // Current week values
    const currentRecord = weeklyRecords.find(r => r.weekKey === currentWeekKey);
    const currentValues: Record<string, number> = currentRecord?.values || {};
    const currentTargets: Record<string, number> = {};
    for (const kpi of activeKPIs) {
      currentTargets[kpi.kpi_id] = kpi.target || 0;
    }
    
    // ========== OVERVIEW ==========
    const percentages = weeklyHistory.map(w => w.percentage);
    const currentWeekScore = dashboardData.currentWeekPercentage;
    const previousWeekScore = percentages.length > 1 ? percentages[percentages.length - 2] : 0;
    const weekOverWeekChange = currentWeekScore - previousWeekScore;
    const monthlyAverage = calculateMean(percentages.slice(-4));
    const yearlyAverage = calculateMean(percentages);
    
    // Count perfect weeks
    const perfectWeeks = percentages.filter(p => p >= 100).length;
    
    // KPI summaries
    const kpiSummaries = activeKPIs.map(kpi => {
      const value = currentValues[kpi.kpi_id] || 0;
      const target = kpi.target || 1;
      const percentage = Math.min(100, Math.round((value / target) * 100));
      const history = kpiValuesMap[kpi.kpi_id] || [];
      const avg = calculateMean(history);
      const trend = calculateTrend(history, 4);
      
      return {
        id: kpi.kpi_id,
        name: kpi.name,
        value,
        target,
        percentage,
        color: kpi.color || '#00F0FF',
        trend: trend.direction,
        changeVsAvg: avg > 0 ? ((value - avg) / avg) * 100 : 0,
      };
    });
    
    // Category progress
    const categoryProgress = calculateCategoryProgress(currentValues, currentTargets);
    
    const overview: OverviewData = {
      currentWeekScore,
      currentWeekKey,
      weekOverWeekChange,
      monthlyAverage: Math.round(monthlyAverage),
      yearlyAverage: Math.round(yearlyAverage),
      currentStreak: dashboardData.currentStreak,
      longestStreak: dashboardData.currentStreak, // TODO: get from progression
      level: dashboardData.level,
      rank: dashboardData.rank,
      rrPoints: dashboardData.rrPoints,
      totalWeeksTracked: weeklyRecords.length,
      perfectWeeks,
      kpiSummaries,
      categoryProgress,
    };
    
    // ========== TRENDS ==========
    const rollingAverage = calculateRollingAverage(percentages, 4);
    
    const kpiTrends: KPITrendData[] = activeKPIs.map(kpi => {
      const history = kpiHistoryMap[kpi.kpi_id] || [];
      const values = history.map(h => h.value);
      const trend = calculateTrend(values, 4);
      const best = Math.max(...values, 0);
      const bestEntry = history.find(h => h.value === best);
      
      return {
        kpiId: kpi.kpi_id,
        name: kpi.name,
        color: kpi.color || '#00F0FF',
        unit: kpi.unit || '',
        currentValue: currentValues[kpi.kpi_id] || 0,
        target: kpi.target || 0,
        average: calculateMean(values),
        best,
        bestWeek: bestEntry?.weekKey || '',
        trend,
        history,
        sparklineData: values.slice(-12), // Last 12 weeks for sparkline
      };
    });
    
    // Category trends
    const categoryTrends: CategoryTrendData[] = DEFAULT_CATEGORIES.map(cat => {
      const catHistory: number[] = [];
      
      for (const weekKey of allWeekKeys) {
        const record = weeklyRecords.find(r => r.weekKey === weekKey);
        const weekValues: Record<string, number> = record?.values || {};
        const progress = calculateCategoryProgress(weekValues, currentTargets);
        catHistory.push(progress[cat.id] || 0);
      }
      
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        currentProgress: categoryProgress[cat.id] || 0,
        averageProgress: calculateMean(catHistory),
        trend: calculateTrend(catHistory, 4),
        history: catHistory,
      };
    });
    
    // Rank history
    const rankHistory: RankDataPoint[] = dashboardData.rankHistory.map((rh, i, arr) => ({
      weekKey: rh.weekKey,
      rrPoints: dashboardData.rrPoints - (arr.length - 1 - i) * 20, // Estimate
      rank: rh.rank || dashboardData.rank,
      change: rh.rrChange || 0,
    }));
    
    const trends: TrendsData = {
      weeklyHistory,
      rollingAverage,
      kpiTrends,
      categoryTrends,
      rankHistory,
    };
    
    // ========== PATTERNS ==========
    // Correlations
    const correlations = buildCorrelationMatrix(kpiValuesMap, activeKPIs.map(k => k.kpi_id));
    
    // Streaks per KPI
    const streaks: Record<string, Streak[]> = {};
    for (const kpi of activeKPIs) {
      const data = kpiHistoryMap[kpi.kpi_id]?.map(h => ({
        weekKey: h.weekKey,
        value: h.target > 0 ? (h.value / h.target) * 100 : 0,
      })) || [];
      streaks[kpi.kpi_id] = identifyStreaks(data, 80); // 80% threshold
    }
    
    // Overall completion streaks
    streaks['overall'] = identifyStreaks(
      weeklyHistory.map(w => ({ weekKey: w.weekKey, value: w.percentage })),
      50
    );
    
    // Distributions
    const distributions: Record<string, number[]> = {};
    distributions['overall'] = percentages;
    for (const kpi of activeKPIs) {
      distributions[kpi.kpi_id] = kpiValuesMap[kpi.kpi_id] || [];
    }
    
    const patterns: PatternsData = {
      dayOfWeek: {}, // TODO: populate from daily data
      correlations,
      streaks,
      distributions,
    };
    
    // ========== GOALS ==========
    const goalsAnalytics: GoalAnalytics[] = (goals || []).map(goal => {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysInYear = 365;
      
      const pace = calculatePace(
        goal.currentTotal,
        goal.yearlyTarget,
        dayOfYear,
        daysInYear
      );
      
      // Build monthly data
      const monthlyData = (goal.monthlyActuals || []).map((actual, i) => ({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        actual,
        target: goal.monthlyTarget,
      }));
      
      return {
        id: goal.id,
        name: goal.name,
        yearlyTarget: goal.yearlyTarget,
        unit: goal.unit,
        currentTotal: goal.currentTotal,
        progressPct: goal.progressPct * 100,
        pace,
        monthlyData,
        projectedTotal: pace.projectedTotal,
      };
    });
    
    // ========== INSIGHTS ==========
    const kpiDataForHighlights: Record<string, Array<{ weekKey: string; value: number; target: number }>> = {};
    for (const kpi of activeKPIs) {
      kpiDataForHighlights[kpi.name] = kpiHistoryMap[kpi.kpi_id] || [];
    }
    
    const highlights = generateHighlights(
      weeklyHistory,
      kpiDataForHighlights,
      dashboardData.currentStreak
    );
    
    // Build trend map for recommendations
    const kpiTrendMap: Record<string, TrendResult> = {};
    for (const kt of kpiTrends) {
      kpiTrendMap[kt.name] = kt.trend;
    }
    
    // Build pace map
    const paceMap: Record<string, PaceResult> = {};
    for (const ga of goalsAnalytics) {
      paceMap[ga.name] = ga.pace;
    }
    
    const recommendations = generateRecommendations(kpiTrendMap, correlations, paceMap);
    
    // Personal records
    const kpiNames: Record<string, string> = {};
    for (const kpi of activeKPIs) {
      kpiNames[kpi.kpi_id] = kpi.name;
    }
    const kpiHistoryForRecords: Record<string, Array<{ weekKey: string; value: number }>> = {};
    for (const kpi of activeKPIs) {
      kpiHistoryForRecords[kpi.kpi_id] = kpiHistoryMap[kpi.kpi_id]?.map(h => ({
        weekKey: h.weekKey,
        value: h.value,
      })) || [];
    }
    const records = findPersonalRecords(kpiHistoryForRecords, kpiNames);
    
    const insights: InsightsData = {
      highlights,
      recommendations,
      records,
      recentAchievements: [], // TODO: integrate with achievement system
    };
    
    return {
      overview,
      trends,
      patterns,
      goals: goalsAnalytics,
      insights,
    };
  }, [dashboardData, activeKPIs, weeklyRecords, goals, period, getWeeksForPeriod]);

  return {
    data: analyticsData,
    isLoading: isLoading || dashboardLoading || goalsLoading,
    error,
    activeKPIs,
  };
}

export default useAnalytics;
