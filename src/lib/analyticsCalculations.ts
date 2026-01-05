/**
 * Analytics Calculations
 * 
 * Pure utility functions for analytics computations.
 * Includes trend analysis, correlations, projections, and insight generation.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TrendResult {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  slope: number;
}

export interface PaceResult {
  status: 'ahead' | 'on-track' | 'behind' | 'far-behind';
  percentDiff: number;
  projectedTotal: number;
  requiredPace: number;
}

export interface Interval {
  low: number;
  high: number;
  confidence: number;
}

export interface DayStats {
  day: string;
  dayIndex: number;
  average: number;
  total: number;
  count: number;
}

export interface Streak {
  type: 'current' | 'historical';
  length: number;
  startDate: string;
  endDate: string;
  kpiId?: string;
}

export interface Highlight {
  id: string;
  type: 'achievement' | 'warning' | 'trend' | 'record' | 'streak';
  icon: string;
  title: string;
  description: string;
  value?: number;
  change?: number;
  priority: number;
}

export interface Recommendation {
  id: string;
  type: 'focus' | 'opportunity' | 'warning' | 'insight';
  icon: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface PersonalRecord {
  kpiId: string;
  kpiName: string;
  value: number;
  weekKey: string;
  date: string;
}

export interface Anomaly {
  kpiId: string;
  weekKey: string;
  value: number;
  expected: number;
  deviation: number;
  type: 'high' | 'low';
}

export interface CorrelationResult {
  kpiA: string;
  kpiB: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative' | 'none';
}

// ============================================================================
// BASIC STATISTICS
// ============================================================================

export function calculateMean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

export function calculateMedian(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateStdDev(data: number[]): number {
  if (data.length < 2) return 0;
  const mean = calculateMean(data);
  const squareDiffs = data.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

export function calculatePercentile(data: number[], percentile: number): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

export function calculateMin(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.min(...data);
}

export function calculateMax(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.max(...data);
}

// ============================================================================
// TREND CALCULATIONS
// ============================================================================

export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function calculateRollingAverage(data: number[], window: number): number[] {
  if (data.length === 0) return [];
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowData = data.slice(start, i + 1);
    result.push(calculateMean(windowData));
  }
  
  return result;
}

export function calculateTrendSlope(data: number[]): number {
  if (data.length < 2) return 0;
  
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(data);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateTrendDirection(data: number[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';
  
  const slope = calculateTrendSlope(data);
  const mean = calculateMean(data);
  const threshold = mean * 0.05; // 5% of mean as threshold
  
  if (slope > threshold) return 'up';
  if (slope < -threshold) return 'down';
  return 'stable';
}

export function calculateTrend(data: number[], periods: number = 4): TrendResult {
  if (data.length < 2) {
    return { direction: 'stable', percentChange: 0, slope: 0 };
  }
  
  const recentData = data.slice(-periods);
  const previousData = data.slice(-periods * 2, -periods);
  
  const recentMean = calculateMean(recentData);
  const previousMean = previousData.length > 0 ? calculateMean(previousData) : recentData[0];
  
  const percentChange = calculatePercentChange(recentMean, previousMean);
  const slope = calculateTrendSlope(recentData);
  const direction = calculateTrendDirection(recentData);
  
  return { direction, percentChange, slope };
}

// ============================================================================
// CORRELATION CALCULATIONS
// ============================================================================

export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  
  const n = x.length;
  const xMean = calculateMean(x);
  const yMean = calculateMean(y);
  
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function getCorrelationStrength(coefficient: number): 'strong' | 'moderate' | 'weak' | 'none' {
  const abs = Math.abs(coefficient);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'none';
}

export function buildCorrelationMatrix(
  kpiData: Record<string, number[]>,
  kpiIds: string[]
): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  
  for (let i = 0; i < kpiIds.length; i++) {
    for (let j = i + 1; j < kpiIds.length; j++) {
      const kpiA = kpiIds[i];
      const kpiB = kpiIds[j];
      const dataA = kpiData[kpiA] || [];
      const dataB = kpiData[kpiB] || [];
      
      // Ensure equal lengths
      const minLength = Math.min(dataA.length, dataB.length);
      if (minLength < 3) continue;
      
      const coefficient = calculatePearsonCorrelation(
        dataA.slice(-minLength),
        dataB.slice(-minLength)
      );
      
      results.push({
        kpiA,
        kpiB,
        coefficient,
        strength: getCorrelationStrength(coefficient),
        direction: coefficient > 0.1 ? 'positive' : coefficient < -0.1 ? 'negative' : 'none',
      });
    }
  }
  
  return results;
}

// ============================================================================
// PATTERN CALCULATIONS
// ============================================================================

export function calculateDayOfWeekDistribution(
  entries: Array<{ date: string; value: number }>
): DayStats[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const stats: DayStats[] = days.map((day, index) => ({
    day,
    dayIndex: index,
    average: 0,
    total: 0,
    count: 0,
  }));
  
  for (const entry of entries) {
    const date = new Date(entry.date);
    const dayIndex = date.getDay();
    stats[dayIndex].total += entry.value;
    stats[dayIndex].count += 1;
  }
  
  for (const stat of stats) {
    stat.average = stat.count > 0 ? stat.total / stat.count : 0;
  }
  
  return stats;
}

export function findBestPerformingDays(dayStats: DayStats[]): DayStats[] {
  if (dayStats.length === 0) return [];
  const maxAvg = Math.max(...dayStats.map(d => d.average));
  const threshold = maxAvg * 0.9; // Within 90% of best
  return dayStats.filter(d => d.average >= threshold).sort((a, b) => b.average - a.average);
}

export function identifyStreaks(
  data: Array<{ weekKey: string; value: number }>,
  threshold: number
): Streak[] {
  const streaks: Streak[] = [];
  let currentStreak: Streak | null = null;
  
  for (const entry of data) {
    const isSuccess = entry.value >= threshold;
    
    if (isSuccess) {
      if (!currentStreak) {
        currentStreak = {
          type: 'historical',
          length: 1,
          startDate: entry.weekKey,
          endDate: entry.weekKey,
        };
      } else {
        currentStreak.length += 1;
        currentStreak.endDate = entry.weekKey;
      }
    } else {
      if (currentStreak && currentStreak.length >= 2) {
        streaks.push(currentStreak);
      }
      currentStreak = null;
    }
  }
  
  // Check if current streak is ongoing
  if (currentStreak) {
    currentStreak.type = 'current';
    if (currentStreak.length >= 2) {
      streaks.push(currentStreak);
    }
  }
  
  return streaks.sort((a, b) => b.length - a.length);
}

// ============================================================================
// PROJECTION CALCULATIONS
// ============================================================================

export function linearProjection(
  currentValue: number,
  daysElapsed: number,
  totalDays: number
): number {
  if (daysElapsed === 0) return 0;
  const dailyRate = currentValue / daysElapsed;
  return dailyRate * totalDays;
}

export function calculatePace(
  current: number,
  target: number,
  elapsed: number,
  total: number
): PaceResult {
  const expectedProgress = (elapsed / total) * target;
  const percentDiff = calculatePercentChange(current, expectedProgress);
  const projectedTotal = linearProjection(current, elapsed, total);
  const remaining = target - current;
  const remainingDays = total - elapsed;
  const requiredPace = remainingDays > 0 ? remaining / remainingDays : 0;
  
  let status: PaceResult['status'];
  if (percentDiff >= 5) status = 'ahead';
  else if (percentDiff >= -5) status = 'on-track';
  else if (percentDiff >= -20) status = 'behind';
  else status = 'far-behind';
  
  return { status, percentDiff, projectedTotal, requiredPace };
}

export function calculateConfidenceInterval(
  data: number[],
  confidence: number = 0.95
): Interval {
  if (data.length < 2) {
    const val = data[0] || 0;
    return { low: val, high: val, confidence };
  }
  
  const mean = calculateMean(data);
  const stdDev = calculateStdDev(data);
  const n = data.length;
  
  // Z-score for confidence level (simplified)
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zScores[confidence] || 1.96;
  
  const marginOfError = z * (stdDev / Math.sqrt(n));
  
  return {
    low: mean - marginOfError,
    high: mean + marginOfError,
    confidence,
  };
}

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

export function generateHighlights(
  weeklyData: Array<{ weekKey: string; percentage: number }>,
  kpiData: Record<string, Array<{ weekKey: string; value: number; target: number }>>,
  currentStreak: number
): Highlight[] {
  const highlights: Highlight[] = [];
  
  if (weeklyData.length === 0) return highlights;
  
  const currentWeek = weeklyData[weeklyData.length - 1];
  const previousWeeks = weeklyData.slice(0, -1);
  
  // Check for new high
  if (previousWeeks.length > 0) {
    const previousMax = Math.max(...previousWeeks.map(w => w.percentage));
    if (currentWeek.percentage > previousMax) {
      highlights.push({
        id: 'new-high',
        type: 'record',
        icon: '🏆',
        title: 'New Personal Best',
        description: `This week's ${currentWeek.percentage}% beats your previous best of ${previousMax}%`,
        value: currentWeek.percentage,
        priority: 1,
      });
    }
  }
  
  // Check overall trend
  const trend = calculateTrend(weeklyData.map(w => w.percentage), 4);
  if (trend.direction === 'up' && trend.percentChange > 10) {
    highlights.push({
      id: 'trend-up',
      type: 'trend',
      icon: '📈',
      title: 'Strong Upward Trend',
      description: `Performance is up ${Math.round(trend.percentChange)}% vs previous month`,
      change: trend.percentChange,
      priority: 2,
    });
  } else if (trend.direction === 'down' && trend.percentChange < -10) {
    highlights.push({
      id: 'trend-down',
      type: 'warning',
      icon: '⚠️',
      title: 'Declining Trend',
      description: `Performance is down ${Math.round(Math.abs(trend.percentChange))}% vs previous month`,
      change: trend.percentChange,
      priority: 2,
    });
  }
  
  // Streak highlight
  if (currentStreak >= 4) {
    highlights.push({
      id: 'streak',
      type: 'streak',
      icon: '🔥',
      title: `${currentStreak}-Week Streak`,
      description: `You've hit your targets for ${currentStreak} weeks straight!`,
      value: currentStreak,
      priority: 3,
    });
  }
  
  // Perfect week
  if (currentWeek.percentage >= 100) {
    highlights.push({
      id: 'perfect-week',
      type: 'achievement',
      icon: '⭐',
      title: 'Perfect Week',
      description: 'You hit 100% of your targets this week!',
      value: 100,
      priority: 1,
    });
  }
  
  // Check individual KPIs for records
  for (const [kpiId, data] of Object.entries(kpiData)) {
    if (data.length < 2) continue;
    
    const current = data[data.length - 1];
    const previous = data.slice(0, -1);
    const previousMax = Math.max(...previous.map(d => d.value));
    
    if (current.value > previousMax && previousMax > 0) {
      highlights.push({
        id: `kpi-record-${kpiId}`,
        type: 'record',
        icon: '🎯',
        title: `${kpiId} Record`,
        description: `New personal best: ${current.value}`,
        value: current.value,
        priority: 4,
      });
    }
  }
  
  return highlights.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

export function generateRecommendations(
  kpiTrends: Record<string, TrendResult>,
  correlations: CorrelationResult[],
  paceData: Record<string, PaceResult>
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // Declining KPIs
  for (const [kpiId, trend] of Object.entries(kpiTrends)) {
    if (trend.direction === 'down' && trend.percentChange < -15) {
      recommendations.push({
        id: `focus-${kpiId}`,
        type: 'focus',
        icon: '🎯',
        title: `Focus on ${kpiId}`,
        description: `This KPI has declined ${Math.round(Math.abs(trend.percentChange))}% recently. Consider prioritizing it.`,
        impact: 'high',
        actionable: true,
      });
    }
  }
  
  // Strong positive correlations
  const strongCorrelations = correlations.filter(
    c => c.strength === 'strong' && c.direction === 'positive'
  );
  for (const corr of strongCorrelations.slice(0, 2)) {
    recommendations.push({
      id: `correlation-${corr.kpiA}-${corr.kpiB}`,
      type: 'insight',
      icon: '🔗',
      title: 'Strong Connection Found',
      description: `${corr.kpiA} and ${corr.kpiB} are highly correlated (+${(corr.coefficient * 100).toFixed(0)}%). Improving one may boost the other.`,
      impact: 'medium',
      actionable: false,
    });
  }
  
  // Pace warnings
  for (const [kpiId, pace] of Object.entries(paceData)) {
    if (pace.status === 'far-behind') {
      recommendations.push({
        id: `pace-${kpiId}`,
        type: 'warning',
        icon: '⏰',
        title: `${kpiId} Behind Pace`,
        description: `You're ${Math.round(Math.abs(pace.percentDiff))}% behind on your yearly goal. Increase weekly effort to catch up.`,
        impact: 'high',
        actionable: true,
      });
    }
  }
  
  return recommendations.slice(0, 5);
}

export function findPersonalRecords(
  kpiHistory: Record<string, Array<{ weekKey: string; value: number }>>,
  kpiNames: Record<string, string>
): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  
  for (const [kpiId, history] of Object.entries(kpiHistory)) {
    if (history.length === 0) continue;
    
    let maxEntry = history[0];
    for (const entry of history) {
      if (entry.value > maxEntry.value) {
        maxEntry = entry;
      }
    }
    
    records.push({
      kpiId,
      kpiName: kpiNames[kpiId] || kpiId,
      value: maxEntry.value,
      weekKey: maxEntry.weekKey,
      date: maxEntry.weekKey, // Could be converted to actual date
    });
  }
  
  return records;
}

export function detectAnomalies(
  data: Array<{ weekKey: string; value: number }>,
  stdDevThreshold: number = 2
): Anomaly[] {
  if (data.length < 4) return [];
  
  const values = data.map(d => d.value);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values);
  
  if (stdDev === 0) return [];
  
  const anomalies: Anomaly[] = [];
  
  for (const entry of data) {
    const deviation = (entry.value - mean) / stdDev;
    
    if (Math.abs(deviation) >= stdDevThreshold) {
      anomalies.push({
        kpiId: '',
        weekKey: entry.weekKey,
        value: entry.value,
        expected: mean,
        deviation,
        type: deviation > 0 ? 'high' : 'low',
      });
    }
  }
  
  return anomalies;
}

// ============================================================================
// CATEGORY AGGREGATIONS
// ============================================================================

export interface CategoryDefinition {
  id: string;
  name: string;
  kpiIds: string[];
  color: string;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'discipline',
    name: 'Discipline',
    kpiIds: ['deepWorkHours', 'deep_work_hours', 'noCompromises', 'no_compromises'],
    color: '#00F0FF',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    kpiIds: ['training', 'trainingSessions', 'training_sessions', 'bjjSessions', 'strengthSessions'],
    color: '#00FF88',
  },
  {
    id: 'recovery',
    name: 'Recovery',
    kpiIds: ['sleep', 'sleepHours', 'sleep_hours', 'recoverySessions', 'recovery_sessions'],
    color: '#9D4EDD',
  },
  {
    id: 'learning',
    name: 'Learning',
    kpiIds: ['books', 'booksRead', 'books_read', 'engineeringHours', 'engineering_hours'],
    color: '#FFB800',
  },
  {
    id: 'output',
    name: 'Output',
    kpiIds: ['ships', 'content', 'prs', 'prs_created'],
    color: '#FF3366',
  },
];

export function calculateCategoryProgress(
  kpiValues: Record<string, number>,
  kpiTargets: Record<string, number>,
  categories: CategoryDefinition[] = DEFAULT_CATEGORIES
): Record<string, number> {
  const categoryProgress: Record<string, number> = {};
  
  for (const category of categories) {
    const matchingKpis = category.kpiIds.filter(
      id => kpiValues[id] !== undefined && kpiTargets[id] !== undefined
    );
    
    if (matchingKpis.length === 0) {
      categoryProgress[category.id] = 0;
      continue;
    }
    
    let totalProgress = 0;
    for (const kpiId of matchingKpis) {
      const value = kpiValues[kpiId] || 0;
      const target = kpiTargets[kpiId] || 1;
      totalProgress += Math.min(100, (value / target) * 100);
    }
    
    categoryProgress[category.id] = Math.round(totalProgress / matchingKpis.length);
  }
  
  return categoryProgress;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return '#00FF88'; // Success green
  if (percentage >= 70) return '#00F0FF'; // Primary cyan
  if (percentage >= 50) return '#FFB800'; // Warning amber
  return '#FF3366'; // Danger red
}

export function weekKeyToDate(weekKey: string): Date {
  // Format: "YYYY-WNN"
  const match = weekKey.match(/(\d{4})-W(\d{2})/);
  if (!match) return new Date();
  
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  
  // Fiscal year starts Sept 1
  const fiscalYearStart = new Date(year, 8, 1); // Sept 1
  const daysToAdd = (week - 1) * 7;
  
  const date = new Date(fiscalYearStart);
  date.setDate(date.getDate() + daysToAdd);
  
  return date;
}

export function getDaysInYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
