/**
 * Storage abstraction module
 * 
 * This module provides an abstraction layer for data storage operations.
 * Currently it uses localStorage, but can be extended to use other storage methods.
 */

import { supabase } from './supabase';
import { userStorage } from './userStorage';

export interface MetricData {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'text' | 'time';
  values: Record<string, string | number | boolean>;
}

export interface TrackerData {
  metrics: MetricData[];
  dates: string[];
}

// Roadmap interfaces
export interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  completed: boolean;
  quantitativeTarget?: number;
  currentProgress?: number;
  unit?: string;
}

export interface YearlyGoal {
  id: string;
  name: string;
  category: 'professional' | 'fitness' | 'financial' | 'personal';
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  milestones: Milestone[];
}

export interface MonthlyTarget {
  id: string;
  month: string; // YYYY-MM format
  goals: {
    goalId: string;
    target: number;
    achieved: number;
  }[];
}

export interface RoadmapData {
  yearlyGoals: YearlyGoal[];
  monthlyTargets: MonthlyTarget[];
}

// New simplified Goal interface for monthly tracking
export type Month = 'Jan'|'Feb'|'Mar'|'Apr'|'May'|'Jun'|'Jul'|'Aug'|'Sep'|'Oct'|'Nov'|'Dec';

export interface MonthlyGoalTarget {
  target: number;
  description?: string;
}

export interface Goal {
  id: string;
  name: string;
  yearlyTarget: number;
  unit: string;
  category: 'professional' | 'fitness' | 'financial' | 'personal';
  isNumeric: boolean; // whether this goal supports numeric rollup
  monthly: Partial<Record<Month, number>>; // actual values
  monthlyTargets: Partial<Record<Month, MonthlyGoalTarget>>; // planned targets
  currentTotal: number; // derived from monthly values
  progressPct: number; // derived percentage (0-1)
  connectedKpi?: string; // KPI ID for auto-tracking (e.g., 'deepWorkHours', 'bjjSessions')
}

export interface GoalsData {
  goals: Goal[];
}

// Noctisium Core Data Models
export interface NoctisiumEvent {
  id: string;
  type: 'deep_work_start' | 'deep_work_stop' | 'ship';
  timestamp: string;
  sliceId?: string;
  proofUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ShipRecord {
  id: string;
  sliceId: string;
  timestamp: string;
  description: string;
  proofUrl?: string;
  source: 'manual' | 'github_pr' | 'social_media' | 'content_publish' | 'content_input';
  cycleTimeMinutes?: number;
  firstWorkStartTime?: string;
}

export interface DeepWorkSession {
  id: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  sliceId?: string;
  priority?: string;
  isActive: boolean;
}

export interface WorkSlice {
  id: string;
  priority: string;
  startedAt: string;
  shippedAt?: string;
  cycleTimeMinutes?: number;
  description: string;
  firstDeepWorkStart?: string;
  isActive: boolean;
}

export interface WeeklyConstraint {
  id: string;
  weekStart: string;
  constraint: string;
  reason?: string;
  isActive: boolean;
}

export interface RunwayData {
  id: string;
  monthYear: string;
  totalBalance: number;
  monthlyBurn: number;
  monthsRemaining: number;
  lastUpdated: string;
  suggestedCuts?: string[];
  suggestedIncomeTargets?: string[];
}

export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'instagram' | 'youtube';
  postId: string;
  url: string;
  content: string;
  publishedAt: string;
  autoShipCreated: boolean;
}

export interface NoctisiumAlert {
  id: string;
  type: 'no_ship' | 'low_runway';
  isActive: boolean;
  createdAt: string;
  suggestedActions: string[];
  metadata?: Record<string, any>;
}

export interface AvoidanceItem {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface NoctisiumData {
  events: NoctisiumEvent[];
  ships: ShipRecord[];
  deepWorkSessions: DeepWorkSession[];
  workSlices: WorkSlice[];
  weeklyConstraints: WeeklyConstraint[];
  runwayData: RunwayData[];
  socialMediaPosts: SocialMediaPost[];
  alerts: NoctisiumAlert[];
  currentPriority: string; // Keep for backwards compatibility
  avoidanceItems: AvoidanceItem[];
  currentSliceId?: string;
  lastUpdated: string;
}

const STORAGE_KEY = 'noctisium-tracker-data';

// Predefined metrics
export const predefinedMetrics: MetricData[] = [
  { id: 'deepWork', name: 'Deep Work (hrs)', type: 'number', values: {} },
  { id: 'jiuJitsuSessions', name: 'Jiu-Jitsu Sessions', type: 'number', values: {} },
  { id: 'weightliftingSessions', name: 'Weightlifting Sessions', type: 'number', values: {} },
  { id: 'proteinIntake', name: 'Protein Intake (g)', type: 'number', values: {} },
  { id: 'dailyWeight', name: 'Daily Weight (kg)', type: 'number', values: {} },
  { id: 'hrv', name: 'HRV (ms)', type: 'number', values: {} },
  { id: 'wakingTime', name: 'Waking Time', type: 'time', values: {} },
  { id: 'sleepTime', name: 'Sleep Time', type: 'time', values: {} },
  { id: 'recovery', name: 'Recovery Score', type: 'number', values: {} },
  { id: 'coldShower', name: 'Cold Shower Taken', type: 'boolean', values: {} },
  { id: 'noDopamine', name: 'No Dopamine', type: 'boolean', values: {} },
  { id: 'sleepHours', name: 'Sleep (hrs)', type: 'number', values: {} },
  { id: 'calories', name: 'Calories (kcal)', type: 'number', values: {} },
  { id: 'waterIntake', name: 'Water Intake (oz)', type: 'number', values: {} },
  { id: 'readingHours', name: 'Reading (hrs)', type: 'number', values: {} },
];

// Initial data structure
export const initialData: TrackerData = {
  metrics: predefinedMetrics,
  dates: []
};

/**
 * Load data from storage
 */
export const loadData = (): TrackerData => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return initialData;

    const parsedData = JSON.parse(storedData);
    
    // Remove any metrics that are no longer predefined
    parsedData.metrics = parsedData.metrics.filter((m: MetricData) =>
      predefinedMetrics.some(pm => pm.id === m.id)
    );
    // Ensure all predefined metrics exist
    const existingMetricIds = parsedData.metrics.map((m: MetricData) => m.id);
    const missingMetrics = predefinedMetrics.filter(metric => !existingMetricIds.includes(metric.id));
    
    if (missingMetrics.length > 0) {
      // Add any missing predefined metrics
      parsedData.metrics = [...parsedData.metrics, ...missingMetrics];
    }
    
    // Persist the cleaned and updated metrics list back to storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
    return parsedData;
  } catch (error) {
    console.error("Failed to load data from storage:", error);
    return initialData;
  }
};

/**
 * Save data to storage
 */
export const saveData = (data: TrackerData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save data to storage:", error);
  }
};

/**
 * Export data to JSON file
 */
export const exportData = (): void => {
  const data = loadData();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "noctisium-tracker-data.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

/**
 * Import data from JSON file
 */
export const importData = (fileContent: string): boolean => {
  try {
    const data = JSON.parse(fileContent);
    
    // Basic validation
    if (!data.metrics || !Array.isArray(data.metrics) || !data.dates || !Array.isArray(data.dates)) {
      throw new Error("Invalid data format");
    }
    
    saveData(data);
    return true;
  } catch (error) {
    console.error("Failed to import data:", error);
    return false;
  }
};

/**
 * Export data to CSV format
 */
export const exportDataCSV = (): void => {
  const data = loadData();
  if (data.metrics.length === 0 || data.dates.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Create header row with dates
  let csv = "Metric Name," + data.dates.join(",") + "\n";
  
  // Add rows for each metric
  data.metrics.forEach(metric => {
    const row = [metric.name];
    data.dates.forEach(date => {
      const value = metric.values[date] !== undefined ? metric.values[date] : "";
      row.push(value.toString());
    });
    csv += row.join(",") + "\n";
  });
  
  const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "noctisium-tracker-data.csv");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

/**
 * Import data from CSV format
 */
export const importDataCSV = (fileContent: string): boolean => {
  try {
    const lines = fileContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }
    
    // Parse header row to get dates
    const headers = lines[0].split(',');
    const dates = headers.slice(1); // First column is metric name
    
    // Parse data rows to get metrics
    const metrics: MetricData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const metricName = values[0];
      
      // Check if any value can be parsed as a number
      let valueType: 'number' | 'boolean' | 'text' | 'time' = 'text';
      for (let j = 1; j < values.length && j <= dates.length; j++) {
        const rawValue = values[j].trim();
        if (rawValue === 'true' || rawValue === 'false') {
          valueType = 'boolean';
          break;
        } else if (!isNaN(parseFloat(rawValue)) && rawValue !== '') {
          valueType = 'number';
          break;
        }
      }
      
      const metric: MetricData = {
        id: `csv-import-${i}-${Date.now()}`, // Generate a unique ID
        name: metricName,
        type: valueType, // Added the missing 'type' property
        values: {}
      };
      
      // Populate values for each date
      for (let j = 1; j < values.length && j <= dates.length; j++) {
        const rawValue = values[j].trim();
        // Try to convert to number if possible
        const numValue = parseFloat(rawValue);
        metric.values[dates[j-1]] = !isNaN(numValue) ? numValue : rawValue;
      }
      
      metrics.push(metric);
    }
    
    const importedData: TrackerData = {
      metrics,
      dates
    };
    
    saveData(importedData);
    return true;
  } catch (error) {
    console.error("Failed to import CSV data:", error);
    return false;
  }
};

// Supabase-syncing storage functions
type SupabaseMetricRow = { date: string; data: Record<string, string | number | boolean> };

// Helper function to get current user ID
const getCurrentUserId = () => {
  const userId = userStorage.getCurrentUserId();
  if (!userId) {
    console.warn('No authenticated user ID found');
    return null;
  }
  return userId;
};

/**
 * Load all metrics from Supabase (falls back to localStorage)
 */
export async function loadMetrics(): Promise<TrackerData> {
  try {
    const { data, error } = await supabase
      .from('metrics')
      .select('date, data')
      .eq('user_id', getCurrentUserId())
      .order('date', { ascending: true });
    if (error || !data || data.length === 0) {
      return loadData();
    }

    const rows = data as SupabaseMetricRow[];
    const metricsByDate = rows.reduce(
      (acc, row) => {
        acc[row.date] = row.data;
        return acc;
      },
      {} as Record<string, Record<string, string | number | boolean>>
    );

    const dates = Object.keys(metricsByDate).sort();
    const metrics: MetricData[] = predefinedMetrics.map((metric) => ({
      ...metric,
      values: dates.reduce((vals, date) => {
        vals[date] = metricsByDate[date][metric.id] ?? '';
        return vals;
      }, {} as Record<string, string | number | boolean>),
    }));

    const trackerData: TrackerData = { metrics, dates };
    saveData(trackerData);
    return trackerData;
  } catch (e) {
    console.error('Failed to load metrics:', e);
    return loadData();
  }
}

/**
 * Save metrics locally and upsert into Supabase
 */
export async function saveMetrics(trackerData: TrackerData): Promise<void> {
  try {
    console.log('📈 Syncing metrics data...');
    console.log('📊 Metrics to sync:', trackerData.dates.length, 'days,', trackerData.metrics.length, 'metrics');
    
    // First, write to localStorage as backup
  saveData(trackerData);
  
    if (trackerData.dates.length === 0) {
      console.log('ℹ️ No metrics data to sync');
      return;
    }
    
    // Check if the table exists
    const { data: existingData, error: readError } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .limit(1);
    
    if (readError) {
      console.error('❌ Cannot read metrics table:', readError);
      throw new Error(`Metrics table access error: ${readError.message}`);
    }
    
    // Build entries with only the fields that exist in the metrics table
  const entries = trackerData.dates.map((date) => {
    const payload: Record<string, string | number | boolean> = {};
    trackerData.metrics.forEach((metric) => {
        const value = metric.values[date];
        if (value !== undefined && value !== '') {
          payload[metric.id] = value;
        }
      });
      
      // Only include the three fields that exist in the metrics table
      return { 
        user_id: getCurrentUserId(), 
        date: date, 
        data: payload
      };
    }).filter(entry => Object.keys(entry.data).length > 0); // Only sync days with actual data
    
    console.log('📤 Metrics payload:', entries.length, 'entries');

    if (entries.length === 0) {
      console.log('ℹ️ No metrics entries to sync');
      return;
    }

    // Use standard upsert without returning option
  const { data, error } = await supabase
    .from('metrics')
      .upsert(entries, { 
        onConflict: 'user_id,date'
      });
    
    if (error) {
      console.error('❌ Metrics upsert error:', error);
      throw new Error(`Failed to save metrics to Supabase: ${error.message}`);
    }

    console.log('✅ Metrics data synced successfully');
  } catch (err) {
    console.error('💥 Error syncing metrics:', err);
    throw err;
  }
}

/**
 * Load roadmap data from Supabase (falls back to localStorage)
 */
export async function loadRoadmapData(): Promise<RoadmapData | null> {
  try {
    // Load yearly goals
    const { data: goalsData, error: goalsError } = await supabase
      .from('yearly_goals')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .order('created_at', { ascending: true });

    // Load monthly targets
    const { data: targetsData, error: targetsError } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .order('month', { ascending: true });

    if (goalsError || targetsError) {
      console.log('Error loading roadmap data from Supabase, falling back to localStorage');
      return null;
    }

    if (!goalsData || !targetsData) {
      return null;
    }

    const roadmapData: RoadmapData = {
      yearlyGoals: goalsData.map(row => ({
        id: row.goal_id,
        name: row.name,
        category: row.category,
        description: row.description,
        targetValue: row.target_value,
        currentValue: row.current_value,
        unit: row.unit,
        deadline: row.deadline,
        milestones: row.milestones || []
      })),
      monthlyTargets: targetsData.map(row => ({
        id: row.id,
        month: row.month,
        goals: row.goals || []
      }))
    };

    return roadmapData;
  } catch (e) {
    console.error('Failed to load roadmap data:', e);
    return null;
  }
}

/**
 * Save roadmap data to Supabase
 */
export async function saveRoadmapData(roadmapData: RoadmapData): Promise<void> {
  try {
    // Save yearly goals
    const goalsPayload = roadmapData.yearlyGoals.map(goal => ({
      user_id: getCurrentUserId(),
      goal_id: goal.id,
      name: goal.name,
      category: goal.category,
      description: goal.description,
      target_value: goal.targetValue,
      current_value: goal.currentValue,
      unit: goal.unit,
      deadline: goal.deadline,
      milestones: goal.milestones
    }));

    const { error: goalsError } = await supabase
      .from('yearly_goals')
      .upsert(goalsPayload, { onConflict: 'user_id,goal_id' });

    // Save monthly targets
    const targetsPayload = roadmapData.monthlyTargets.map(target => ({
      user_id: getCurrentUserId(),
      id: target.id,
      month: target.month,
      goals: target.goals
    }));

    const { error: targetsError } = await supabase
      .from('monthly_targets')
      .upsert(targetsPayload, { onConflict: 'user_id,id' });

    if (goalsError) {
      throw new Error(`Failed to save yearly goals: ${goalsError.message}`);
    }
    if (targetsError) {
      throw new Error(`Failed to save monthly targets: ${targetsError.message}`);
    }

    console.log('Roadmap data saved to Supabase successfully');
  } catch (e) {
    console.error('Failed to save roadmap data:', e);
    throw e;
  }
}

/**
 * Calculate derived values for a goal based on monthly data
 */
export function calculateGoalProgress(goal: Pick<Goal, 'monthly' | 'yearlyTarget' | 'isNumeric'>): { currentTotal: number; progressPct: number } {
  if (!goal.isNumeric) {
    // For non-numeric goals, just return 0s
    return { currentTotal: 0, progressPct: 0 };
  }
  
  const monthlyValues = Object.values(goal.monthly).filter(val => val !== undefined && val !== null);
  const currentTotal = monthlyValues.reduce((sum, val) => sum + (val || 0), 0);
  const progressPct = goal.yearlyTarget > 0 ? Math.min(1, currentTotal / goal.yearlyTarget) : 0;
  
  return { currentTotal, progressPct };
}

// Cash Console storage
export type CashHolding =
  | { type: 'equity'; ticker: string; name?: string; quantity: number; lastPriceUsd?: number; prevCloseUsd?: number; currentValueUsd?: number }
  | { type: 'cash'; currency: 'USD'; amountUsd: number };

export type CashExpense = {
  id: string;
  item?: string;
  category: string;
  date?: string; // ISO YYYY-MM-DD
  amountUsd: number;
};

export type CashConsoleData = {
  investments: {
    weekStartValueUsd?: number;
    holdings: CashHolding[];
    lastPricesUpdatedAt?: string;
    history?: { date: string; totalUsd: number }[];
  };
  expenses: {
    monthlyIncomeUsd?: number;
    targetPctOfIncome?: number;
    items: CashExpense[];
    categories?: string[];
  };
  cortal: {
    burnRateUsdPerMonth?: number; // derived from items for selected month
    items?: { id: string; category: string; date: string; amountUsd: number }[];
    categories?: string[]; // e.g., ['dev','designContent']
    cashReservesUsd?: number;
  };
  baseCurrency?: 'USD' | 'CAD';
  fx?: {
    usdToCad?: number;
    lastFxUpdatedAt?: string;
  };
};

export function defaultCashConsoleData(): CashConsoleData {
  return {
    investments: {
      weekStartValueUsd: 0,
      holdings: [],
      lastPricesUpdatedAt: undefined,
      history: []
    },
    expenses: {
      monthlyIncomeUsd: 0,
      targetPctOfIncome: 40,
      items: [],
      categories: ['food', 'rent', 'subscriptions', 'discretionary', 'transport', 'utilities', 'other']
    },
    cortal: {
      burnRateUsdPerMonth: 0,
      items: [],
      categories: ['dev', 'designContent'],
      cashReservesUsd: 0
    },
    baseCurrency: 'CAD',
    fx: { usdToCad: undefined, lastFxUpdatedAt: undefined }
  };
}

export function loadCashConsoleData(): CashConsoleData {
  try {
    const raw = localStorage.getItem('noctisium-cash-console');
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultCashConsoleData();
}

export async function saveCashConsoleData(data: CashConsoleData): Promise<void> {
  try {
    localStorage.setItem('noctisium-cash-console', JSON.stringify(data));
    // Optionally push to Supabase in future
  } catch (e) {
    console.error('Failed to save cash console:', e);
  }
}

/**
 * Update a goal with new derived values
 */
export function updateGoalProgress(goal: Goal): Goal {
  const { currentTotal, progressPct } = calculateGoalProgress(goal);
  return {
    ...goal,
    currentTotal,
    progressPct
  };
}

/**
 * Convert month name to number (1-12)
 */
export function monthNameToNumber(month: Month): number {
  const months: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.indexOf(month) + 1;
}

/**
 * Convert month number to name
 */
export function monthNumberToName(monthNum: number): Month {
  const months: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNum - 1];
}

/**
 * Get current month as Month type
 */
export function getCurrentMonth(): Month {
  const now = new Date();
  return monthNumberToName(now.getMonth() + 1);
}

/**
 * Load goals data (with fallback to seed data)
 */
export function loadGoalsData(): GoalsData {
  try {
    const stored = localStorage.getItem('noctisium-goals-data');
    if (stored) {
      const data = JSON.parse(stored) as GoalsData;
      
      // Check if we need to migrate - if goals don't have monthlyTargets, clear and reload
      const needsMigration = data.goals.some(goal => !goal.monthlyTargets || Object.keys(goal.monthlyTargets).length === 0);
      
      if (needsMigration) {
        console.log('Goals data needs migration to include monthly targets, clearing...');
        localStorage.removeItem('noctisium-goals-data');
      } else {
        // Recalculate derived values
        data.goals = data.goals.map(updateGoalProgress);
        return data;
      }
    }
  } catch (error) {
    console.error('Failed to load goals data:', error);
  }
  
  // Return seed data
  const seedGoals: Goal[] = [
    {
      id: 'echo-revenue',
      name: 'Echo Revenue',
      yearlyTarget: 2000,
      unit: 'USD',
      category: 'professional' as const,
      isNumeric: true,
      monthly: {},
      monthlyTargets: {
        Jun: { target: 0, description: '0% - MVP in users\' hands, no paid plans yet' },
        Jul: { target: 100, description: '5% ≈ USD 100' },
        Aug: { target: 200, description: '10% ≈ USD 200' },
        Sep: { target: 500, description: '25% ≈ USD 500 (launch paid beta)' },
        Oct: { target: 1000, description: '50% ≈ USD 1 000' },
        Nov: { target: 1500, description: '75% ≈ USD 1 500' },
        Dec: { target: 2000, description: '100% USD 2 000' }
      },
      currentTotal: 0,
      progressPct: 0
    },
    {
      id: 'audience-growth',
      name: 'Audience',
      yearlyTarget: 25000,
      unit: 'followers',
      category: 'professional' as const,
      isNumeric: true,
      monthly: { Apr: 2024 },
      monthlyTargets: {
        Jun: { target: 3000, description: '12% of target' },
        Jul: { target: 5000, description: '20%' },
        Aug: { target: 7500, description: '30%' },
        Sep: { target: 11250, description: '45%' },
        Oct: { target: 15000, description: '60%' },
        Nov: { target: 20000, description: '80%' },
        Dec: { target: 25000, description: '100%' }
      },
      currentTotal: 2024,
      progressPct: 2024 / 25000
    },
    {
      id: 'deep-work',
      name: 'Deep Work',
      yearlyTarget: 900,
      unit: 'hours',
      category: 'personal' as const,
      isNumeric: true,
      monthly: {},
      monthlyTargets: {
        Jun: { target: 130, description: 'pace ≈ 130 hrs each month' },
        Jul: { target: 260, description: 'cumulative 260 hrs' },
        Aug: { target: 390, description: 'cumulative 390 hrs' },
        Sep: { target: 520, description: 'cumulative 520 hrs' },
        Oct: { target: 650, description: 'cumulative 650 hrs' },
        Nov: { target: 780, description: 'cumulative 780 hrs' },
        Dec: { target: 900, description: 'cumulative 900 hrs' }
      },
      currentTotal: 0,
      progressPct: 0
    },
    {
      id: 'bjj-sessions',
      name: 'BJJ Sessions',
      yearlyTarget: 100,
      unit: 'sessions',
      category: 'fitness' as const,
      isNumeric: true,
      monthly: {},
      monthlyTargets: {
        Jul: { target: 5, description: 'Blue-belt promotion target' },
        Aug: { target: 60, description: '60 mat sessions logged (fundamentals mastery)' },
        Dec: { target: 100, description: '100 sessions + ≥1 competition podium' }
      },
      currentTotal: 0,
      progressPct: 0
    },
    {
      id: 'net-worth',
      name: 'Net Worth (CAD)',
      yearlyTarget: 200000,
      unit: 'CAD',
      category: 'financial' as const,
      isNumeric: true,
      monthly: { Apr: 140000 },
      monthlyTargets: {
        Jun: { target: 160000, description: 'CAD 160 000' },
        Sep: { target: 180000, description: 'CAD 180 000' },
        Dec: { target: 200000, description: 'CAD 200 000' }
      },
      currentTotal: 140000,
      progressPct: 140000 / 200000
    }
  ];

  return {
    goals: seedGoals.map(updateGoalProgress)
  };
}

/**
 * Save goals data to localStorage
 */
export function saveGoalsData(data: GoalsData): void {
  try {
    localStorage.setItem('noctisium-goals-data', JSON.stringify(data));

    // Dispatch custom event to notify other components of the update
    window.dispatchEvent(new CustomEvent('goalsUpdated', { detail: data }));
    console.log('Goals data saved and event dispatched');
  } catch (error) {
    console.error('Failed to save goals data:', error);
  }
}

/**
 * Update monthly value for a specific goal
 */
export function updateGoalMonthly(goalId: string, month: Month, value: number | null): GoalsData {
  const data = loadGoalsData();
  const goalIndex = data.goals.findIndex(g => g.id === goalId);
  
  if (goalIndex === -1) {
    throw new Error(`Goal with id ${goalId} not found`);
  }
  
  const goal = { ...data.goals[goalIndex] };
  
  if (value === null || value === 0) {
    // Remove the entry
    delete goal.monthly[month];
  } else {
    // Set the value
    goal.monthly[month] = value;
  }
  
  // Update derived values
  const updatedGoal = updateGoalProgress(goal);
  data.goals[goalIndex] = updatedGoal;
  
  saveGoalsData(data);
  return data;
}

/**
 * Load goals data from Supabase (falls back to localStorage)
 */
export async function loadGoalsFromSupabase(): Promise<GoalsData> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .order('created_at', { ascending: true });

    if (error) {
      console.log('Error loading goals from Supabase, falling back to localStorage:', error);
      return loadGoalsData();
    }

    if (!data || data.length === 0) {
      // No goals in Supabase, return local data
      return loadGoalsData();
    }

    const goals: Goal[] = data.map(row => ({
      id: row.goal_id,
      name: row.name,
      yearlyTarget: row.yearly_target,
      unit: row.unit,
      category: row.category as Goal['category'],
      isNumeric: row.is_numeric,
      monthly: row.monthly || {},
      monthlyTargets: row.monthly_targets || {},
      currentTotal: row.current_total,
      progressPct: row.progress_pct
    }));

    const goalsData = { goals };
    saveGoalsData(goalsData); // Cache locally
    return goalsData;
  } catch (e) {
    console.error('Failed to load goals from Supabase:', e);
    return loadGoalsData();
  }
}

/**
 * Enhanced goals sync with detailed logging
 */
export async function saveGoalsToSupabase(data: GoalsData): Promise<void> {
  try {
    console.log('🎯 Syncing goals data to Supabase...');
    console.log('📊 Goals to sync:', data.goals.map(g => ({ id: g.id, name: g.name, yearlyTarget: g.yearlyTarget })));
    
    // Check if the table exists
    const { data: existingData, error: readError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .limit(1);
    
    if (readError) {
      console.error('❌ Cannot read goals table:', readError);
      throw new Error(`Goals table access error: ${readError.message}`);
    }
    
    // Let database defaults handle timestamps - do not include them
    const payload = data.goals.map(goal => ({
      user_id: getCurrentUserId(),
      goal_id: goal.id,
      name: goal.name,
      yearly_target: goal.yearlyTarget,
      unit: goal.unit,
      category: goal.category,
      is_numeric: goal.isNumeric,
      monthly: goal.monthly || {},
      monthly_targets: goal.monthlyTargets || {},
      current_total: goal.currentTotal,
      progress_pct: goal.progressPct
    }));

    console.log('📤 Goals payload:', payload);

    const { data: resultData, error } = await supabase
      .from('goals')
      .upsert(payload, { onConflict: 'user_id,goal_id' });

    if (error) {
      console.error('❌ Goals upsert error:', error);
      throw new Error(`Failed to save goals to Supabase: ${error.message}`);
    }

    console.log('✅ Goals data saved to Supabase successfully:', resultData);
  } catch (e) {
    console.error('💥 Failed to save goals to Supabase:', e);
    throw e;
  }
}

/**
 * Update monthly value for a goal in Supabase
 */
export async function updateGoalMonthlySupabase(goalId: string, month: Month, value: number | null): Promise<GoalsData> {
  try {
    // Get current goal data
    const { data: currentData, error: fetchError } = await supabase
      .from('goals')
      .select('monthly')
      .eq('user_id', getCurrentUserId())
      .eq('goal_id', goalId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch current goal: ${fetchError.message}`);
    }

    // Update monthly data
    const updatedMonthly = { ...(currentData.monthly || {}) };
    if (value === null || value === 0) {
      delete updatedMonthly[month];
    } else {
      updatedMonthly[month] = value;
    }

    // Update in Supabase (triggers will recalculate derived values)
    const { error: updateError } = await supabase
      .from('goals')
      .update({ monthly: updatedMonthly })
      .eq('user_id', getCurrentUserId())
      .eq('goal_id', goalId);

    if (updateError) {
      throw new Error(`Failed to update goal monthly value: ${updateError.message}`);
    }

    // Reload and return updated data
    return await loadGoalsFromSupabase();
  } catch (e) {
    console.error('Failed to update goal monthly value in Supabase:', e);
    // Fallback to local storage
    return updateGoalMonthly(goalId, month, value);
  }
}

/**
 * Update net worth goal from investments data
 */
export function updateNetWorthFromInvestments(totalInvestmentsCAD: number): GoalsData {
  const currentMonth = getCurrentMonth();
  return updateGoalMonthly('net-worth', currentMonth, totalInvestmentsCAD);
}

/**
 * Enhanced financial sync with better error handling
 */
export async function syncFinancialData(): Promise<void> {
  try {
    console.log('🏦 Syncing financial data...');
    
    // Get financial data from localStorage or defaults
    const storedFinancial = localStorage.getItem('noctisium-financial-data');
    let financial = { mrr: 0, netWorth: 0 };
    
    if (storedFinancial) {
      financial = JSON.parse(storedFinancial);
    }
    
    console.log('📊 Financial data to sync:', financial);
    
    // Check if the table exists by trying to read from it first
    const { data: existingData, error: readError } = await supabase
      .from('financial_metrics')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .limit(1);
    
    if (readError) {
      console.error('❌ Cannot read financial_metrics table:', readError);
      throw new Error(`Table access error: ${readError.message}`);
    }
    
    // Let database defaults handle timestamps - do not include them
    const { data, error } = await supabase
      .from('financial_metrics')
      .upsert([{
        user_id: getCurrentUserId(),
        mrr: financial.mrr || 0,
        net_worth: financial.netWorth || 0
      }], { onConflict: 'user_id' });
    
    if (error) {
      console.error('❌ Upsert error:', error);
      throw new Error(`Failed to sync financial data: ${error.message}`);
    }
    
    console.log('✅ Financial data synced successfully:', data);
  } catch (err) {
    console.error('💥 Error syncing financial data:', err);
    throw err;
  }
}

/**
 * Comprehensive Supabase Sync Functions
 */

// Sync all local data to Supabase
export async function syncAllDataToSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🚀 Starting comprehensive data sync to Supabase...');
    const errors: string[] = [];
    
    // 1. Sync financial data first (simplest)
    try {
      await syncFinancialData();
      console.log('✓ Synced financial data');
    } catch (error) {
      const msg = `Financial sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(msg);
      errors.push(msg);
    }
    
    // 2. Sync goals data (roadmap goals with monthly targets)
    try {
      const goalsData = loadGoalsData();
      await saveGoalsToSupabase(goalsData);
      console.log('✓ Synced goals data:', goalsData.goals.length, 'goals');
    } catch (error) {
      const msg = `Goals sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(msg);
      errors.push(msg);
    }
    
    // 3. Sync metrics data (daily habit tracking)
    try {
      const trackerData = loadData();
      await saveMetrics(trackerData);
      console.log('✓ Synced metrics data:', trackerData.dates.length, 'days');
    } catch (error) {
      const msg = `Metrics sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(msg);
      errors.push(msg);
    }
    
    // 4. Sync sprint data
    try {
      await syncSprintData();
      console.log('✓ Synced sprint data');
    } catch (error) {
      const msg = `Sprint sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(msg);
      errors.push(msg);
    }
    
    // 5. Sync roadmap data (if any legacy data exists)
    try {
      const roadmapData = loadRoadmapDataLocal();
      if (roadmapData && roadmapData.yearlyGoals.length > 0) {
        await saveRoadmapDataToSupabase(roadmapData);
        console.log('✓ Synced roadmap data');
      } else {
        console.log('ℹ️ No roadmap data to sync');
      }
    } catch (error) {
      const msg = `Roadmap sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(msg);
      errors.push(msg);
    }
    
    // 6. Sync kanban data
    try {
      const kanbanDataStored = localStorage.getItem('noctisium-kanban');
      if (kanbanDataStored) {
        const kanbanData = JSON.parse(kanbanDataStored) as KanbanData;
        await saveKanbanToSupabase(kanbanData, 'echo');
        console.log('✓ Synced kanban data:', Object.keys(kanbanData.tasks).length, 'tasks');
      } else {
        console.log('ℹ️ No kanban data to sync');
      }
    } catch (error) {
      const msg = `Kanban sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(msg);
      errors.push(msg);
    }
    
    if (errors.length > 0) {
      return { 
        success: false, 
        message: `Partial sync: ${errors.length} errors occurred. Check console for details.` 
      };
    }
    
    return { 
      success: true, 
      message: 'All data successfully synced to Supabase!' 
    };
  } catch (error) {
    console.error('❌ Critical sync failure:', error);
    return { 
      success: false, 
      message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Load all data from Supabase (opposite direction)
export async function loadAllDataFromSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Loading all data from Supabase...');
    
    // 1. Load metrics data
    const trackerData = await loadMetrics();
    saveData(trackerData);
    console.log('✓ Loaded metrics data');
    
    // 2. Load goals data  
    const goalsData = await loadGoalsFromSupabase();
    saveGoalsData(goalsData);
    console.log('✓ Loaded goals data');
    
    // 3. Load roadmap data
    const roadmapData = await loadRoadmapData();
    if (roadmapData) {
      saveRoadmapDataLocal(roadmapData);
      console.log('✓ Loaded roadmap data');
    }
    
    // 4. Load kanban data
    const kanbanData = await loadKanbanFromSupabase('echo');
    if (kanbanData) {
      localStorage.setItem('noctisium-kanban', JSON.stringify(kanbanData));
      console.log('✓ Loaded kanban data');
    }
    
    return { 
      success: true, 
      message: 'All data successfully loaded from Supabase!' 
    };
  } catch (error) {
    console.error('Failed to load all data:', error);
    return { 
      success: false, 
      message: `Load failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Sync sprint data
export async function syncSprintData(): Promise<void> {
  try {
    // Sprint table removed; keep function no-op to avoid runtime errors
    return;
  } catch (err) {
    console.error('Error syncing sprint data:', err);
    throw err;
  }
}

// Helper functions for roadmap data
function loadRoadmapDataLocal(): RoadmapData | null {
  try {
    const stored = localStorage.getItem('noctisium-roadmaps');
    if (!stored) return null;
    
    const rawData = JSON.parse(stored);
    // Convert old format if needed
    if (Array.isArray(rawData)) {
      return {
        yearlyGoals: [],
        monthlyTargets: []
      };
    }
    return rawData as RoadmapData;
  } catch (error) {
    console.error('Failed to load roadmap data:', error);
    return null;
  }
}

function saveRoadmapDataLocal(data: RoadmapData): void {
  try {
    localStorage.setItem('noctisium-roadmaps', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save roadmap data locally:', error);
  }
}

// Fix financial metrics loading with better error handling
export async function loadFinancialMetrics(): Promise<{ mrr: number; netWorth: number }> {
  try {
    const { data, error } = await supabase
      .from('financial_metrics')
      .select('mrr, net_worth')
      .eq('user_id', getCurrentUserId())
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data
    
    if (error) {
      console.error('Error loading financial metrics:', error);
      return { mrr: 0, netWorth: 0 };
    }
    
    if (data) {
      return { mrr: data.mrr || 0, netWorth: data.net_worth || 0 };
    }
    
    // No data found, return defaults
    return { mrr: 0, netWorth: 0 };
  } catch (err) {
    console.error('Failed to load financial metrics:', err);
    return { mrr: 0, netWorth: 0 };
  }
}

// Save financial metrics with proper error handling
export async function saveFinancialMetrics(mrr: number, netWorth: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('financial_metrics')
      .upsert([{
        user_id: getCurrentUserId(),
        mrr: mrr,
        net_worth: netWorth
      }], { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      throw new Error(`Failed to save financial metrics: ${error.message}`);
    }
    
    // Also save to localStorage as backup
    localStorage.setItem('noctisium-financial-data', JSON.stringify({ mrr, netWorth }));
  } catch (err) {
    console.error('Error saving financial metrics:', err);
    throw err;
  }
}

// New function to sync roadmap data to a separate table
export async function saveRoadmapDataToSupabase(roadmapData: RoadmapData): Promise<void> {
  try {
    console.log('🗺️ Syncing roadmap data to Supabase...');
    
    // Check if the table exists
    const { data: existingData, error: readError } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .limit(1);
    
    if (readError) {
      console.error('❌ Cannot read roadmaps table:', readError);
      throw new Error(`Roadmaps table access error: ${readError.message}`);
    }
    
    // Store the entire roadmap data as JSON - let database defaults handle timestamps
    const { data, error } = await supabase
      .from('roadmaps')
      .upsert([{
        user_id: getCurrentUserId(),
        roadmap_id: 'main',
        data: roadmapData
      }], { onConflict: 'user_id,roadmap_id' });
    
    if (error) {
      throw new Error(`Failed to save roadmap data: ${error.message}`);
    }
    
    console.log('✅ Roadmap data saved successfully');
  } catch (e) {
    console.error('💥 Failed to save roadmap data:', e);
    throw e;
  }
}

// Test and initialize Supabase tables
interface TableTestResult {
  status: 'ok' | 'error';
  count?: number;
  error?: string;
}

interface SupabaseTestResults {
  [tableName: string]: TableTestResult;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details: SupabaseTestResults }> {
  try {
    console.log('🔍 Testing Supabase connection and tables...');
    
    const results: SupabaseTestResults = {};
    
    // Test each table
    const tables = ['financial_metrics', 'goals', 'metrics', 'roadmaps', 'kanban_boards', 'kanban_columns', 'kanban_tasks'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', getCurrentUserId())
          .limit(1);

  if (error) {
          results[table] = { status: 'error', error: error.message };
        } else {
          results[table] = { status: 'ok', count: count || 0 };
        }
      } catch (err) {
        results[table] = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
      }
    }
    
    console.log('📊 Table test results:', results);
    
    const failedTables = Object.entries(results).filter(([_, result]) => result.status === 'error');
    
    if (failedTables.length > 0) {
      return {
        success: false,
        message: `${failedTables.length} tables not accessible: ${failedTables.map(([table]) => table).join(', ')}`,
        details: results
      };
    }
    
    return {
      success: true,
      message: 'All tables accessible',
      details: results
    };
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    };
  }
}

// Enhanced sync function that tests connection first
export async function syncAllDataToSupabaseWithTest(): Promise<{ success: boolean; message: string }> {
  try {
    // First test the connection and tables
    const testResult = await testSupabaseConnection();
    
    if (!testResult.success) {
      return {
        success: false,
        message: `Database not ready: ${testResult.message}`
      };
    }
    
    console.log('✅ Database connection verified, proceeding with sync...');
    
    // Proceed with normal sync
    return await syncAllDataToSupabase();
  } catch (error) {
    console.error('❌ Sync with test failed:', error);
    return {
      success: false,
      message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Kanban interfaces and functions
export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  labels: string[];
  timeSpent: number; // in hours
  isDeleted?: boolean; // soft delete flag
  deletedAt?: string; // when the task was deleted
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  taskIds: string[];
  color: string;
}

export interface KanbanData {
  tasks: { [key: string]: KanbanTask };
  columns: { [key: string]: KanbanColumn };
  columnOrder: string[];
}

// --------------------
// Content types & APIs
// --------------------

export async function areContentTablesReady(): Promise<boolean> {
  try {
    const { error: itemsErr } = await supabase
      .from('content_items')
      .select('id')
      .limit(1);
    if (itemsErr) {
      const msg = (itemsErr as any)?.message?.toLowerCase?.() || '';
      const code = (itemsErr as any)?.code || '';
      if (msg.includes('does not exist') || msg.includes('not found') || code === '42P01' || String(code).startsWith('PGRST')) {
        return false;
      }
    }
    const { error: metricsErr } = await supabase
      .from('content_metrics')
      .select('id')
      .limit(1);
    if (metricsErr) {
      const msg = (metricsErr as any)?.message?.toLowerCase?.() || '';
      const code = (metricsErr as any)?.code || '';
      if (msg.includes('does not exist') || msg.includes('not found') || code === '42P01' || String(code).startsWith('PGRST')) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export interface ContentItemInput {
  platform: 'youtube' | 'tiktok' | 'instagram';
  format: 'long_form' | 'short';
  account_handle?: string;
  title: string;
  caption?: string;
  script?: string;
  primary_hook?: string;
  published_at: string; // ISO date
  video_length_seconds?: number;
  url?: string;
  platform_video_id?: string;
  roadmap_id?: string;
  kanban_task_id?: string;
  tags?: string[];
}

export interface ContentMetricsInput {
  views?: number;
  shares?: number;
  saves?: number;
  follows?: number;
  average_watch_time_seconds?: number;
  retention_ratio?: number;
  shares_per_view?: number;
  saves_per_view?: number;
  followers_per_reach?: number;
  non_follower_reach_ratio?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  extra?: any;
}

export async function saveContentItemWithMetrics(
  item: ContentItemInput,
  metrics?: ContentMetricsInput
): Promise<{ contentId: string }> {
  // If tables aren't ready, bail with a clear error so UI can handle gracefully
  const ready = await areContentTablesReady();
  if (!ready) {
    throw new Error('Content tables are not ready. Run migration 013_content_tables.sql.');
  }
  // Insert content item
  const { data: insertedItem, error: itemError } = await supabase
    .from('content_items')
    .insert([
      {
        user_id: getCurrentUserId(),
        ...item
      }
    ])
    .select('id')
    .single();

  if (itemError) {
    const details = (itemError as any)?.message || (itemError as any)?.details || JSON.stringify(itemError);
    throw new Error(`Failed to save content item: ${details}`);
  }

  const contentId = insertedItem.id as string;

  // Optionally insert metrics snapshot (with computed ratios if needed)
  if (metrics) {
    const m = { ...metrics } as any;
    if (
      (m.retention_ratio == null || isNaN(m.retention_ratio)) &&
      typeof metrics.average_watch_time_seconds === 'number' &&
      typeof item.video_length_seconds === 'number' &&
      item.video_length_seconds! > 0
    ) {
      m.retention_ratio = Math.max(
        0,
        Math.min(1, Number(metrics.average_watch_time_seconds) / Number(item.video_length_seconds))
      );
    }

    if (m.shares_per_view == null && typeof metrics.shares === 'number' && typeof metrics.views === 'number' && metrics.views! > 0) {
      m.shares_per_view = Number(metrics.shares) / Number(metrics.views);
    }
    if (m.saves_per_view == null && typeof metrics.saves === 'number' && typeof metrics.views === 'number' && metrics.views! > 0) {
      m.saves_per_view = Number(metrics.saves) / Number(metrics.views);
    }

    const { error: metricsError } = await supabase
      .from('content_metrics')
      .insert([
        {
          user_id: getCurrentUserId(),
          content_id: contentId,
          ...m
        }
      ]);

    if (metricsError) {
      const mDetails = (metricsError as any)?.message || (metricsError as any)?.details || JSON.stringify(metricsError);
      throw new Error(`Failed to save content metrics: ${mDetails}`);
    }
  }

  return { contentId };
}

export async function updateContentItemWithMetrics(
  contentId: string,
  item: Partial<ContentItemInput>,
  metrics?: Partial<ContentMetricsInput>
): Promise<void> {
  const ready = await areContentTablesReady();
  if (!ready) {
    throw new Error('Content tables are not ready. Run migration 013_content_tables.sql.');
  }

  // Update content item if provided
  if (item && Object.keys(item).length > 0) {
    const { error: itemError } = await supabase
      .from('content_items')
      .update({
        ...item,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId)
      .eq('user_id', getCurrentUserId());

    if (itemError) {
      throw new Error(`Failed to update content item: ${itemError.message}`);
    }
  }

  // Update metrics if provided
  if (metrics && Object.keys(metrics).length > 0) {
    const today = new Date().toISOString().slice(0, 10);

    // Check if metrics exist for today
    const { data: existingMetrics } = await supabase
      .from('content_metrics')
      .select('id')
      .eq('content_id', contentId)
      .eq('user_id', getCurrentUserId())
      .eq('snapshot_date', today)
      .single();

    if (existingMetrics) {
      // Update existing metrics
      const { error: updateError } = await supabase
        .from('content_metrics')
        .update(metrics)
        .eq('id', existingMetrics.id);

      if (updateError) {
        throw new Error(`Failed to update content metrics: ${updateError.message}`);
      }
    } else {
      // Insert new metrics
      const { error: insertError } = await supabase
        .from('content_metrics')
        .insert({
          user_id: getCurrentUserId(),
          content_id: contentId,
          snapshot_date: today,
          ...metrics
        });

      if (insertError) {
        throw new Error(`Failed to insert new content metrics: ${insertError.message}`);
      }
    }
  }
}

export async function deleteContentItem(contentId: string): Promise<void> {
  const ready = await areContentTablesReady();
  if (!ready) {
    throw new Error('Content tables are not ready. Run migration 013_content_tables.sql.');
  }

  // Delete content item (metrics will cascade delete due to foreign key)
  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', contentId)
    .eq('user_id', getCurrentUserId());

  if (error) {
    throw new Error(`Failed to delete content item: ${error.message}`);
  }

  // Notify other components that content was updated
  window.dispatchEvent(new Event('contentUpdated'));
  console.log('📢 Content deleted, notified listeners');
}

export async function loadContentItemDetail(contentId: string): Promise<{
  item: ContentItemInput & { id: string };
  metrics: ContentMetricsInput | null;
} | null> {
  const ready = await areContentTablesReady();
  if (!ready) return null;

  // Load content item
  const { data: itemData, error: itemError } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', contentId)
    .eq('user_id', getCurrentUserId())
    .single();

  if (itemError || !itemData) return null;

  // Load latest metrics
  const { data: metricsData } = await supabase
    .from('content_metrics')
    .select('*')
    .eq('content_id', contentId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  return {
    item: itemData,
    metrics: metricsData || null
  };
}

export interface ContentListItem {
  id: string;
  platform: string;
  format: string;
  account_handle: string | null;
  title: string;
  published_at: string;
  tags: string[] | null;
  url?: string;
  views?: number;
  follows?: number;
  retention_ratio?: number;
}

export async function loadRecentContent(limit: number = 20): Promise<ContentListItem[]> {
  // Short-circuit if tables are missing
  try {
    const ready = await areContentTablesReady();
    if (!ready) {
      console.log('⚠️ Content tables not ready');
      return [];
    }
  } catch (e) {
    console.log('⚠️ Error checking content tables:', e);
    return [];
  }

  const userId = getCurrentUserId();
  console.log('🔍 Loading recent content for user ID:', userId);

  if (!userId) {
    console.warn('⚠️ No user ID available for loading content');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('content_items')
      .select('id, platform, format, account_handle, title, published_at, tags, url')
      .eq('user_id', userId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || '';
      if (msg.includes('does not exist') || msg.includes('not found')) {
        console.log('⚠️ Content tables do not exist');
        return [];
      }
      console.error('❌ Failed to load content:', error);
      throw new Error(`Failed to load content: ${error.message}`);
    }

    const items = data || [];
    console.log('✅ Loaded content items:', items.length, 'items');

    if (items.length === 0) {
      console.log('💡 No content found. Make sure content_items have user_id = ' + userId);
    }

    // Attach latest metrics per item
    const ids = items.map((r: any) => r.id);
    if (ids.length === 0) return [];

    const { data: metricsData, error: metricsErr } = await supabase
      .from('content_metrics')
      .select('content_id, views, follows, retention_ratio, snapshot_date')
      .in('content_id', ids)
      .order('snapshot_date', { ascending: false });

    if (metricsErr) {
      const msg = (metricsErr as any)?.message?.toLowerCase?.() || '';
      if (msg.includes('does not exist') || msg.includes('not found')) return items;
      throw new Error(`Failed to load content metrics: ${metricsErr.message}`);
    }

    const latestById = new Map<string, any>();
    (metricsData || []).forEach((m: any) => {
      if (!latestById.has(m.content_id)) latestById.set(m.content_id, m);
    });

    return items.map((r: any) => {
      const m = latestById.get(r.id);
      return {
        id: r.id,
        platform: r.platform,
        format: r.format,
        account_handle: r.account_handle,
        title: r.title,
        published_at: r.published_at,
        tags: r.tags,
        url: r.url,
        views: m?.views,
        follows: m?.follows,
        retention_ratio: m?.retention_ratio
      } as ContentListItem;
    });
  } catch (error) {
    console.error('❌ Unexpected error loading content:', error);
    return [];
  }
}

export interface WeeklyContentSummary {
  weekKey: string;
  videos_published: number;
  total_views: number;
  followers_gained: number;
  avg_retention: number | null;
}

export interface WeeklyContentDetail {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  summary: WeeklyContentSummary;
  items: ContentListItem[];
}

export async function loadWeeklyContentDetail(weekKey: string): Promise<WeeklyContentDetail> {
  // Use fiscal week utilities to derive start/end from weekKey (Sep 1 anchor)
  const { getWeekDates } = await import('./weeklyKpi');
  const { start: wkStart, end: wkEnd } = getWeekDates(weekKey);
  const startStr = wkStart.toISOString().slice(0, 10);
  const endStr = wkEnd.toISOString().slice(0, 10);

  // Load content items for this week
  const { data: items, error: itemsErr } = await supabase
    .from('content_items')
    .select('id, platform, format, account_handle, title, published_at, url')
    .eq('user_id', getCurrentUserId())
    .gte('published_at', startStr)
    .lte('published_at', endStr)
    .order('published_at', { ascending: false });

  if (itemsErr) throw new Error(`Failed to load weekly content: ${itemsErr.message}`);

  const contentItems = items || [];
  const ids = contentItems.map(r => r.id);

  // Load metrics for these items
  const { data: metrics, error: metricsErr } = await supabase
    .from('content_metrics')
    .select('content_id, views, follows, retention_ratio, snapshot_date')
    .in('content_id', ids)
    .order('snapshot_date', { ascending: false });

  if (metricsErr) throw new Error(`Failed to load weekly metrics: ${metricsErr.message}`);

  // Get latest metrics for each content item
  const latestMetrics = new Map<string, any>();
  (metrics || []).forEach(m => {
    if (!latestMetrics.has(m.content_id)) latestMetrics.set(m.content_id, m);
  });

  // Combine items with metrics
  const itemsWithMetrics: ContentListItem[] = contentItems.map(item => {
    const m = latestMetrics.get(item.id);
    return {
      ...item,
      views: m?.views,
      follows: m?.follows,
      retention_ratio: m?.retention_ratio
    };
  });

  // Calculate summary
  const totalViews = itemsWithMetrics.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalFollows = itemsWithMetrics.reduce((sum, item) => sum + (item.follows || 0), 0);
  const retentionValues = itemsWithMetrics
    .map(item => item.retention_ratio)
    .filter(r => r !== null && r !== undefined) as number[];

  const avgRetention = retentionValues.length > 0
    ? retentionValues.reduce((sum, r) => sum + r, 0) / retentionValues.length
    : null;

  return {
    weekKey,
    weekStart: startStr,
    weekEnd: endStr,
    summary: {
      weekKey,
      videos_published: itemsWithMetrics.length,
      total_views: totalViews,
      followers_gained: totalFollows,
      avg_retention: avgRetention
    },
    items: itemsWithMetrics
  };
}

export async function loadWeeklyContentSummary(weeks: string[]): Promise<WeeklyContentSummary[]> {
  if (weeks.length === 0) return [];
  // naive client aggregation; can be moved to SQL views later
  const start = weeks[weeks.length - 1];
  const end = weeks[0];
  const { getWeekKey } = await import('./weeklyKpi');
  // Load items over a wide date window
  const { data: items, error: itemsErr } = await supabase
    .from('content_items')
    .select('id, published_at')
    .eq('user_id', getCurrentUserId())
    .order('published_at', { ascending: false })
    .limit(1000);
  if (itemsErr) throw new Error(itemsErr.message);

  const ids = (items || []).map((r: any) => r.id);
  const { data: metrics, error: metricsErr } = await supabase
    .from('content_metrics')
    .select('content_id, views, follows, retention_ratio, snapshot_date')
    .in('content_id', ids)
    .order('snapshot_date', { ascending: false });
  if (metricsErr) throw new Error(metricsErr.message);

  const resultMap = new Map<string, WeeklyContentSummary>();
  weeks.forEach(w => resultMap.set(w, { weekKey: w, videos_published: 0, total_views: 0, followers_gained: 0, avg_retention: null }));

  const weekOf = (d: string) => {
    // Map date to fiscal week key with Sep 1 anchor
    const date = new Date(d + 'T00:00:00');
    return getWeekKey(date);
  };

  const metricsByContent = new Map<string, any>();
  (metrics || []).forEach((m: any) => {
    if (!metricsByContent.has(m.content_id)) metricsByContent.set(m.content_id, m);
  });

  (items || []).forEach((it: any) => {
    const wk = weekOf(it.published_at);
    if (!resultMap.has(wk)) return;
    const current = resultMap.get(wk)!;
    current.videos_published += 1;
    const m = metricsByContent.get(it.id);
    if (m) {
      current.total_views += Number(m.views || 0);
      current.followers_gained += Number(m.follows || 0);
      const r = Number(m.retention_ratio);
      if (!isNaN(r)) {
        if (current.avg_retention == null) current.avg_retention = 0;
        current.avg_retention = Number(((current.avg_retention || 0) + r) as any);
      }
    }
  });

  // finalize avg
  weeks.forEach(w => {
    const cur = resultMap.get(w)!;
    if (cur.avg_retention != null && cur.videos_published > 0) {
      cur.avg_retention = Number((cur.avg_retention / cur.videos_published).toFixed(3));
    }
  });

  return weeks.map(w => resultMap.get(w)!).filter(Boolean);
}

/**
 * Load Kanban data from Supabase
 */
export async function loadKanbanFromSupabase(boardId: string = 'echo'): Promise<KanbanData | null> {
  try {
    console.log('📋 Loading Kanban data from Supabase...');
    
    // Load columns
    const { data: columnsData, error: columnsError } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .eq('board_id', boardId)
      .order('position', { ascending: true });
    
    if (columnsError) {
      console.error('Error loading kanban columns:', columnsError);
      return null;
    }
    
    // Load tasks (only non-deleted ones, if soft delete columns exist)
    const { data: tasksData, error: tasksError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .eq('board_id', boardId)
      .order('position', { ascending: true });
    
    if (tasksError) {
      console.error('Error loading kanban tasks:', tasksError);
      return null;
    }
    
    if (!columnsData || !tasksData) {
      console.log('No kanban data found in Supabase');
      return null;
    }
    
    // Transform Supabase data to KanbanData format
    const columns: { [key: string]: KanbanColumn } = {};
    const columnOrder: string[] = [];
    
    columnsData.forEach(col => {
      columns[col.column_id] = {
        id: col.column_id,
        title: col.title,
        color: col.color,
        taskIds: []
      };
      columnOrder.push(col.column_id);
    });
    
    const tasks: { [key: string]: KanbanTask } = {};
    
    tasksData.forEach(task => {
      // Handle soft delete fields (may not exist in older schemas)
      const isDeleted = task.is_deleted !== undefined ? task.is_deleted : false;
      const deletedAt = task.deleted_at !== undefined ? task.deleted_at : undefined;
      
      // Skip deleted tasks if soft delete is enabled
      if (isDeleted) {
        return;
      }
      
      const kanbanTask: KanbanTask = {
        id: task.task_id,
        title: task.title,
        description: task.description || undefined,
        assignee: task.assignee || undefined,
        priority: task.priority,
        dueDate: task.due_date || undefined,
        labels: Array.isArray(task.labels) ? task.labels : [],
        timeSpent: task.time_spent || 0,
        isDeleted: isDeleted,
        deletedAt: deletedAt,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      };
      
      tasks[task.task_id] = kanbanTask;
      
      // Add task to appropriate column (only if not deleted)
      if (columns[task.column_id] && !kanbanTask.isDeleted) {
        columns[task.column_id].taskIds.push(task.task_id);
      }
    });
    
    const kanbanData: KanbanData = {
      tasks,
      columns,
      columnOrder
    };
    
    console.log('✅ Kanban data loaded successfully');
    return kanbanData;
  } catch (error) {
    console.error('Failed to load kanban data:', error);
    return null;
  }
}

/**
 * Save Kanban data to Supabase
 */
export async function saveKanbanToSupabase(kanbanData: KanbanData, boardId: string = 'echo'): Promise<void> {
  try {
    console.log('📋 Saving Kanban data to Supabase...');
    console.log('📊 Data to save:', {
      tasks: Object.keys(kanbanData.tasks).length,
      columns: Object.keys(kanbanData.columns).length,
      columnOrder: kanbanData.columnOrder
    });
    
    // Ensure board exists
    const { error: boardError } = await supabase
      .from('kanban_boards')
      .upsert({
        user_id: getCurrentUserId(),
        board_id: boardId,
        name: 'Echo Kanban Board',
        description: 'Track Echo development tasks and progress'
      }, {
        onConflict: 'user_id,board_id'
      });
    
    if (boardError) {
      console.error('❌ Board save error:', boardError);
      throw new Error(`Failed to save board: ${boardError.message}`);
    }
    console.log('✓ Board saved successfully');
    
    // Save columns
    const columnsPayload = kanbanData.columnOrder.map((columnId, index) => {
      const column = kanbanData.columns[columnId];
      return {
        user_id: getCurrentUserId(),
        board_id: boardId,
        column_id: columnId,
        title: column.title,
        color: column.color,
        position: index + 1
      };
    });
    
    console.log('📤 Columns payload:', columnsPayload);
    
    const { error: columnsError } = await supabase
      .from('kanban_columns')
      .upsert(columnsPayload, {
        onConflict: 'user_id,board_id,column_id'
      });
    
    if (columnsError) {
      console.error('❌ Columns save error:', columnsError);
      throw new Error(`Failed to save columns: ${columnsError.message}`);
    }
    console.log('✓ Columns saved successfully');
    
    // Save tasks
    const tasksPayload = Object.values(kanbanData.tasks).map((task, index) => {
      // Find which column this task is in
      let columnId = 'backlog'; // default
      for (const [colId, column] of Object.entries(kanbanData.columns)) {
        if (column.taskIds.includes(task.id)) {
          columnId = colId;
          break;
        }
      }
      
      const basePayload = {
        user_id: getCurrentUserId(),
        board_id: boardId,
        task_id: task.id,
        column_id: columnId,
        title: task.title,
        description: task.description || null,
        assignee: task.assignee || null,
        priority: task.priority,
        due_date: task.dueDate || null,
        labels: task.labels || [],
        time_spent: task.timeSpent || 0,
        position: index + 1,
        // Always include is_deleted and deleted_at, with defaults
        is_deleted: task.isDeleted === undefined ? false : task.isDeleted,
        deleted_at: task.deletedAt === undefined ? null : task.deletedAt
      };
      
      // The conditional logic for backward compatibility is no longer needed here
      // as is_deleted and deleted_at are now part of basePayload with defaults.
      return basePayload;
    });
    
    console.log('📤 Tasks payload:', tasksPayload.length, 'tasks');
    console.log('📋 Sample task:', tasksPayload[0]);
    
    if (tasksPayload.length > 0) {
      const { error: tasksError } = await supabase
        .from('kanban_tasks')
        .upsert(tasksPayload, {
          onConflict: 'user_id,board_id,task_id'
        });
      
      if (tasksError) {
        console.error('❌ Tasks save error:', tasksError);
        throw new Error(`Failed to save tasks: ${tasksError.message}`);
      }
      console.log('✓ Tasks saved successfully');
    } else {
      console.log('ℹ️ No tasks to save');
    }
    
    // Clean up orphaned tasks (tasks that no longer exist in the data)
    // Note: We don't clean up soft-deleted tasks, only truly orphaned ones
    try {
      // First, get all existing tasks for this board (skip soft delete filter if columns don't exist)
      const { data: existingTasks, error: fetchError } = await supabase
        .from('kanban_tasks')
        .select('task_id')
        .eq('user_id', getCurrentUserId())
        .eq('board_id', boardId);
      
      if (fetchError) {
        console.warn('⚠️ Warning: Failed to fetch existing tasks for cleanup:', fetchError);
      } else if (existingTasks && existingTasks.length > 0) {
        const currentTaskIds = Object.keys(kanbanData.tasks).filter(taskId => !kanbanData.tasks[taskId].isDeleted);
        const tasksToDelete = existingTasks
          .map(t => t.task_id)
          .filter(taskId => !currentTaskIds.includes(taskId));
        
        if (tasksToDelete.length > 0) {
          console.log('🗑️ Cleaning up orphaned tasks:', tasksToDelete);
          
          // Try soft delete first, fall back to hard delete if columns don't exist
          for (const taskId of tasksToDelete) {
            try {
              const { error: deleteError } = await supabase
                .from('kanban_tasks')
                .update({ 
                  is_deleted: true, 
                  deleted_at: new Date().toISOString() 
                })
                .eq('user_id', getCurrentUserId())
                .eq('board_id', boardId)
                .eq('task_id', taskId);
              
              if (deleteError) {
                // If soft delete fails (columns don't exist), try hard delete
                console.warn(`⚠️ Soft delete failed for ${taskId}, trying hard delete:`, deleteError);
                const { error: hardDeleteError } = await supabase
                  .from('kanban_tasks')
                  .delete()
                  .eq('user_id', getCurrentUserId())
                  .eq('board_id', boardId)
                  .eq('task_id', taskId);
                
                if (hardDeleteError) {
                  console.warn(`⚠️ Failed to delete orphaned task ${taskId}:`, hardDeleteError);
                }
              }
            } catch (err) {
              console.warn(`⚠️ Failed to clean up task ${taskId}:`, err);
            }
          }
          console.log('✓ Orphaned tasks cleaned up');
        } else {
          console.log('ℹ️ No orphaned tasks to clean up');
        }
      }
    } catch (cleanupError) {
      console.warn('⚠️ Warning: Task cleanup failed:', cleanupError);
    }
    
    console.log('✅ Kanban data saved successfully');
  } catch (error) {
    console.error('💥 Failed to save kanban data:', error);
    throw error;
  }
}

/**
 * Soft delete a task from Supabase (marks as deleted instead of removing)
 * Falls back to hard delete if soft delete columns don't exist
 */
export async function deleteKanbanTaskFromSupabase(taskId: string, boardId: string = 'echo'): Promise<void> {
  try {
    // Try soft delete first
    const { error: softDeleteError } = await supabase
      .from('kanban_tasks')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString() 
      })
      .eq('user_id', getCurrentUserId())
      .eq('board_id', boardId)
      .eq('task_id', taskId);
    
    if (softDeleteError) {
      // If soft delete fails (columns don't exist), fall back to hard delete
      console.warn(`Soft delete failed for ${taskId}, trying hard delete:`, softDeleteError);
      
      const { error: hardDeleteError } = await supabase
        .from('kanban_tasks')
        .delete()
        .eq('user_id', getCurrentUserId())
        .eq('board_id', boardId)
        .eq('task_id', taskId);
      
      if (hardDeleteError) {
        throw new Error(`Failed to delete task: ${hardDeleteError.message}`);
      }
      
      console.log(`✓ Task ${taskId} hard deleted successfully`);
    } else {
      console.log(`✓ Task ${taskId} soft deleted successfully`);
    }
  } catch (error) {
    console.error('Failed to delete kanban task:', error);
    throw error;
  }
}

/**
 * Move task between columns in Supabase
 */
export async function moveKanbanTaskInSupabase(taskId: string, newColumnId: string, boardId: string = 'echo'): Promise<void> {
  try {
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ column_id: newColumnId })
      .eq('user_id', getCurrentUserId())
      .eq('board_id', boardId)
      .eq('task_id', taskId);
    
    if (error) {
      throw new Error(`Failed to move task: ${error.message}`);
    }
  } catch (error) {
    console.error('Failed to move kanban task:', error);
    throw error;
  }
}

/**
 * Restore a soft-deleted task from Supabase
 */
export async function restoreKanbanTaskFromSupabase(taskId: string, boardId: string = 'echo'): Promise<void> {
  try {
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ 
        is_deleted: false, 
        deleted_at: null 
      })
      .eq('user_id', getCurrentUserId())
      .eq('board_id', boardId)
      .eq('task_id', taskId);
    
    if (error) {
      throw new Error(`Failed to restore task: ${error.message}`);
    }
    
    console.log(`✓ Task ${taskId} restored successfully`);
  } catch (error) {
    console.error('Failed to restore kanban task:', error);
    throw error;
  }
}

/**
 * Get all deleted tasks for a board (for potential restoration)
 */
export async function getDeletedKanbanTasks(boardId: string = 'echo'): Promise<KanbanTask[]> {
  try {
    const { data: tasksData, error: tasksError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('user_id', getCurrentUserId())
      .eq('board_id', boardId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });
    
    if (tasksError) {
      console.error('Error loading deleted kanban tasks:', tasksError);
      return [];
    }
    
    if (!tasksData) {
      return [];
    }
    
    return tasksData.map(task => ({
      id: task.task_id,
      title: task.title,
      description: task.description || undefined,
      assignee: task.assignee || undefined,
      priority: task.priority,
      dueDate: task.due_date || undefined,
      labels: Array.isArray(task.labels) ? task.labels : [],
      timeSpent: task.time_spent || 0,
      isDeleted: task.is_deleted || false,
      deletedAt: task.deleted_at || undefined,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));
  } catch (error) {
    console.error('Failed to load deleted kanban tasks:', error);
    return [];
  }
}

// Interfaces for sync verification
interface VerificationResults {
  backup: {
    metricsCount: number;
    goalsCount: number;
    kanbanTasks: number;
    hasFinancial: boolean;
    hasSprints: boolean;
  };
  upload: { success: boolean; message: string };
  download: { success: boolean; message: string };
  validation: {
    errors: string[];
    downloadedData: {
      metricsCount: number;
      goalsCount: number;
      kanbanTasks: number;
      hasFinancial: boolean;
      hasSprints: boolean;
    };
  };
  restore: { completed: boolean };
}

interface MigrationResults {
  localData: {
    metricsCount: number;
    metricsTypes: string[];
    goalsCount: number;
    goalTypes: string[];
    kanbanTasks: number;
    hasFinancial: boolean;
  };
  supabaseData: SupabaseTestResults;
  comparison: {
    syncSuccess: boolean;
    syncMessage: string;
  };
}

/**
 * Comprehensive sync verification - tests complete upload/download cycle
 * This function validates that all data types can be synced correctly
 */
export async function verifySyncFunctionality(): Promise<{ success: boolean; message: string; details: VerificationResults }> {
  try {
    console.log('🔍 Starting comprehensive sync verification...');
    
    const verificationResults: VerificationResults = {
      backup: {
        metricsCount: 0,
        goalsCount: 0,
        kanbanTasks: 0,
        hasFinancial: false,
        hasSprints: false
      },
      upload: { success: false, message: '' },
      download: { success: false, message: '' },
      validation: {
        errors: [],
        downloadedData: {
          metricsCount: 0,
          goalsCount: 0,
          kanbanTasks: 0,
          hasFinancial: false,
          hasSprints: false
        }
      },
      restore: { completed: false }
    };
    
    // Step 1: Backup current localStorage data
    console.log('📦 Step 1: Backing up current data...');
    const originalData = {
      metrics: loadData(),
      goals: loadGoalsData(),
      financial: {
        mrr: 0,
        netWorth: 0,
        ...JSON.parse(localStorage.getItem('noctisium-financial-data') || '{}')
      },
      kanban: localStorage.getItem('noctisium-kanban') ? JSON.parse(localStorage.getItem('noctisium-kanban')!) : null,
      sprints: localStorage.getItem('noctisium-sprint-start-date'),
      roadmaps: localStorage.getItem('noctisium-roadmaps') ? JSON.parse(localStorage.getItem('noctisium-roadmaps')!) : null
    };
    
    verificationResults.backup = {
      metricsCount: originalData.metrics.dates.length,
      goalsCount: originalData.goals.goals.length,
      kanbanTasks: originalData.kanban ? Object.keys(originalData.kanban.tasks).length : 0,
      hasFinancial: !!originalData.financial,
      hasSprints: !!originalData.sprints
    };
    
    // Step 2: Test upload functionality
    console.log('⬆️ Step 2: Testing upload to Supabase...');
    const uploadResult = await syncAllDataToSupabaseWithTest();
    verificationResults.upload = uploadResult;
    
    if (!uploadResult.success) {
      return {
        success: false,
        message: 'Upload verification failed: ' + uploadResult.message,
        details: verificationResults
      };
    }
    
    // Step 3: Clear localStorage (simulate fresh device)
    console.log('🗑️ Step 3: Clearing localStorage to simulate fresh device...');
    const keysToBackup = [
      'noctisium-tracker-data',
      'noctisium-goals-data', 
      'noctisium-financial-data',
      'noctisium-kanban',
      'noctisium-sprint-start-date',
      'noctisium-roadmaps'
    ];
    
    const backupValues: Record<string, string | null> = {};
    keysToBackup.forEach(key => {
      backupValues[key] = localStorage.getItem(key);
      localStorage.removeItem(key);
    });
    
    // Step 4: Test download functionality
    console.log('⬇️ Step 4: Testing download from Supabase...');
    const downloadResult = await loadAllDataFromSupabase();
    verificationResults.download = downloadResult;
    
    if (!downloadResult.success) {
      // Restore backup before returning
      Object.entries(backupValues).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });
      
      return {
        success: false,
        message: 'Download verification failed: ' + downloadResult.message,
        details: verificationResults
      };
    }
    
    // Step 5: Validate downloaded data matches original
    console.log('✅ Step 5: Validating data integrity...');
    const downloadedData = {
      metrics: loadData(),
      goals: loadGoalsData(),
      financial: {
        mrr: 0,
        netWorth: 0,
        ...JSON.parse(localStorage.getItem('noctisium-financial-data') || '{}')
      },
      kanban: localStorage.getItem('noctisium-kanban') ? JSON.parse(localStorage.getItem('noctisium-kanban')!) : null,
      sprints: localStorage.getItem('noctisium-sprint-start-date'),
      roadmaps: localStorage.getItem('noctisium-roadmaps') ? JSON.parse(localStorage.getItem('noctisium-roadmaps')!) : null
    };
    
    const validationErrors: string[] = [];
    
    // Validate metrics
    if (downloadedData.metrics.dates.length !== originalData.metrics.dates.length) {
      validationErrors.push(`Metrics dates mismatch: ${downloadedData.metrics.dates.length} vs ${originalData.metrics.dates.length}`);
    }
    
    if (downloadedData.metrics.metrics.length !== originalData.metrics.metrics.length) {
      validationErrors.push(`Metrics count mismatch: ${downloadedData.metrics.metrics.length} vs ${originalData.metrics.metrics.length}`);
    }
    
    // Validate goals
    if (downloadedData.goals.goals.length !== originalData.goals.goals.length) {
      validationErrors.push(`Goals count mismatch: ${downloadedData.goals.goals.length} vs ${originalData.goals.goals.length}`);
    }
    
    // Validate kanban
    const originalKanbanTasks = originalData.kanban ? Object.keys(originalData.kanban.tasks).length : 0;
    const downloadedKanbanTasks = downloadedData.kanban ? Object.keys(downloadedData.kanban.tasks).length : 0;
    if (downloadedKanbanTasks !== originalKanbanTasks) {
      validationErrors.push(`Kanban tasks mismatch: ${downloadedKanbanTasks} vs ${originalKanbanTasks}`);
    }
    
    verificationResults.validation = {
      errors: validationErrors,
      downloadedData: {
        metricsCount: downloadedData.metrics.dates.length,
        goalsCount: downloadedData.goals.goals.length,
        kanbanTasks: downloadedKanbanTasks,
        hasFinancial: !!downloadedData.financial,
        hasSprints: !!downloadedData.sprints
      }
    };
    
    // Step 6: Restore original data
    console.log('🔄 Step 6: Restoring original data...');
    Object.entries(backupValues).forEach(([key, value]) => {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    });
    
    verificationResults.restore = { completed: true };
    
    if (validationErrors.length > 0) {
      return {
        success: false,
        message: `Data validation failed: ${validationErrors.join(', ')}`,
        details: verificationResults
      };
    }
    
    return {
      success: true,
      message: 'Complete sync verification successful! All data types synced correctly.',
      details: verificationResults
    };
    
  } catch (error) {
    console.error('❌ Sync verification failed:', error);
    return {
      success: false,
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        backup: { metricsCount: 0, goalsCount: 0, kanbanTasks: 0, hasFinancial: false, hasSprints: false },
        upload: { success: false, message: '' },
        download: { success: false, message: '' },
        validation: { 
          errors: [], 
          downloadedData: { metricsCount: 0, goalsCount: 0, kanbanTasks: 0, hasFinancial: false, hasSprints: false }
        },
        restore: { completed: false }
      }
    };
  }
}

/**
 * Data migration validation - ensures all existing localStorage data syncs correctly
 */
export async function validateDataMigration(): Promise<{ success: boolean; message: string; details: MigrationResults }> {
  try {
    console.log('🔍 Validating data migration...');
    
    const migrationResults: MigrationResults = {
      localData: {
        metricsCount: 0,
        metricsTypes: [],
        goalsCount: 0,
        goalTypes: [],
        kanbanTasks: 0,
        hasFinancial: false
      },
      supabaseData: {},
      comparison: {
        syncSuccess: false,
        syncMessage: ''
      }
    };
    
    // Check what data exists locally
    const localMetrics = loadData();
    const localGoals = loadGoalsData();
    const localFinancial = JSON.parse(localStorage.getItem('noctisium-financial-data') || '{}');
    const localKanban = localStorage.getItem('noctisium-kanban') ? JSON.parse(localStorage.getItem('noctisium-kanban')!) : null;
    
    migrationResults.localData = {
      metricsCount: localMetrics.dates.length,
      metricsTypes: localMetrics.metrics.map(m => m.id),
      goalsCount: localGoals.goals.length,
      goalTypes: localGoals.goals.map(g => g.id),
      kanbanTasks: localKanban ? Object.keys(localKanban.tasks).length : 0,
      hasFinancial: Object.keys(localFinancial).length > 0
    };
    
    // Check what data exists in Supabase
    const testResult = await testSupabaseConnection();
    if (!testResult.success) {
      return {
        success: false,
        message: 'Cannot connect to Supabase: ' + testResult.message,
        details: migrationResults
      };
    }
    
    migrationResults.supabaseData = testResult.details;
    
    // Perform migration test
    const syncResult = await syncAllDataToSupabaseWithTest();
    migrationResults.comparison = {
      syncSuccess: syncResult.success,
      syncMessage: syncResult.message
    };
    
    if (!syncResult.success) {
      return {
        success: false,
        message: 'Migration sync failed: ' + syncResult.message,
        details: migrationResults
      };
    }
    
    return {
      success: true,
      message: 'Data migration validation successful!',
      details: migrationResults
    };
    
  } catch (error) {
    console.error('❌ Migration validation failed:', error);
    return {
      success: false,
      message: `Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        localData: {
          metricsCount: 0,
          metricsTypes: [],
          goalsCount: 0,
          goalTypes: [],
          kanbanTasks: 0,
          hasFinancial: false
        },
        supabaseData: {},
        comparison: {
          syncSuccess: false,
          syncMessage: ''
        }
      }
    };
  }
}

// ================================
// NOCTISIUM CORE FUNCTIONALITY
// ================================

const NOCTISIUM_STORAGE_KEY = 'noctisium-data';
const DEFAULT_NOCTISIUM_DATA: NoctisiumData = {
  events: [],
  ships: [],
  deepWorkSessions: [],
  workSlices: [],
  weeklyConstraints: [],
  runwayData: [],
  socialMediaPosts: [],
  alerts: [],
  currentPriority: '',
  avoidanceItems: [],
  lastUpdated: new Date().toISOString()
};

/**
 * Load Noctisium data from localStorage
 */
export function loadNoctisiumData(): NoctisiumData {
  try {
    const stored = localStorage.getItem(NOCTISIUM_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_NOCTISIUM_DATA, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load Noctisium data from localStorage:', error);
  }
  return { ...DEFAULT_NOCTISIUM_DATA };
}

/**
 * Save Noctisium data to localStorage
 */
export function saveNoctisiumData(data: NoctisiumData): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(NOCTISIUM_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save Noctisium data to localStorage:', error);
  }
}

/**
 * Add a new avoidance item
 */
export function addAvoidanceItem(text: string): AvoidanceItem {
  const data = loadNoctisiumData();
  const item: AvoidanceItem = {
    id: `avoid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: text.trim(),
    isCompleted: false,
    createdAt: new Date().toISOString()
  };
  
  data.avoidanceItems.push(item);
  saveNoctisiumData(data);
  return item;
}

/**
 * Toggle completion status of an avoidance item
 */
export function toggleAvoidanceItem(itemId: string): void {
  const data = loadNoctisiumData();
  const item = data.avoidanceItems.find(item => item.id === itemId);
  if (item) {
    item.isCompleted = !item.isCompleted;
    saveNoctisiumData(data);
  }
}

/**
 * Delete an avoidance item
 */
export function deleteAvoidanceItem(itemId: string): void {
  const data = loadNoctisiumData();
  data.avoidanceItems = data.avoidanceItems.filter(item => item.id !== itemId);
  saveNoctisiumData(data);
}

/**
 * Get all avoidance items
 */
export function getAvoidanceItems(): AvoidanceItem[] {
  const data = loadNoctisiumData();
  return data.avoidanceItems || [];
}

/**
 * Start a deep work session
 */
export function startDeepWorkSession(priority: string): DeepWorkSession {
  const data = loadNoctisiumData();
  const now = new Date().toISOString();

  // End any active session first
  data.deepWorkSessions.forEach(session => {
    if (session.isActive) {
      session.endTime = now;
      session.durationMinutes = Math.round((Date.now() - new Date(session.startTime).getTime()) / 60000);
      session.isActive = false;
    }
  });

  // Create new session
  const session: DeepWorkSession = {
    id: `dw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: now,
    priority,
    isActive: true,
    sliceId: data.currentSliceId
  };

  // Create or update work slice
  if (!data.currentSliceId || !data.workSlices.find(s => s.id === data.currentSliceId && s.isActive)) {
    const slice: WorkSlice = {
      id: `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority,
      startedAt: now,
      description: priority,
      firstDeepWorkStart: now,
      isActive: true
    };
    data.workSlices.push(slice);
    data.currentSliceId = slice.id;
    session.sliceId = slice.id;
  } else {
    // Update existing slice if needed
    const slice = data.workSlices.find(s => s.id === data.currentSliceId);
    if (slice && !slice.firstDeepWorkStart) {
      slice.firstDeepWorkStart = now;
    }
  }

  // Create event
  const event: NoctisiumEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'deep_work_start',
    timestamp: now,
    sliceId: session.sliceId,
    description: priority
  };

  data.events.push(event);
  data.deepWorkSessions.push(session);
  data.currentPriority = priority;

  saveNoctisiumData(data);
  return session;
}

/**
 * Stop the current deep work session
 */
export function stopDeepWorkSession(): DeepWorkSession | null {
  const data = loadNoctisiumData();
  const now = new Date().toISOString();

  const activeSession = data.deepWorkSessions.find(s => s.isActive);
  if (!activeSession) return null;

  activeSession.endTime = now;
  activeSession.durationMinutes = Math.round((Date.now() - new Date(activeSession.startTime).getTime()) / 60000);
  activeSession.isActive = false;

  // Create stop event
  const event: NoctisiumEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'deep_work_stop',
    timestamp: now,
    sliceId: activeSession.sliceId,
    description: `Session ended (${activeSession.durationMinutes} min)`
  };

  data.events.push(event);
  saveNoctisiumData(data);
  return activeSession;
}

/**
 * Handle content creation: update KPI and log ship entry
 */
export async function handleContentCreation(title: string, publishedAt: string, url?: string, platform?: string): Promise<void> {
  try {
    // Import here to avoid circular dependency
    const { incrementContentShippedKPI } = await import('./weeklyKpi');
    
    // Update the contentShipped KPI for the published date
    await incrementContentShippedKPI(publishedAt);
    
    // Log ship entry (prefer YouTube URL if available)
    const shipUrl = getYouTubeUrl(url, platform);
    logContentShip(title, shipUrl, platform);
    
    console.log(`📱 Content ship created: ${title} (${platform || 'unknown platform'})`);
  } catch (error) {
    console.error('Failed to handle content creation:', error);
  }
}

/**
 * Extract YouTube URL if available, otherwise use provided URL
 */
function getYouTubeUrl(url?: string, platform?: string): string | undefined {
  if (!url) return undefined;
  
  // If it's already a YouTube URL, return it
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return url;
  }
  
  // For now, just return the provided URL
  // In the future, we could implement platform-specific URL extraction
  return url;
}

/**
 * Log a content ship automatically when content is created
 */
export function logContentShip(title: string, url?: string, platform?: string): ShipRecord {
  const description = platform 
    ? `📱 ${title} (${platform})`
    : `📱 ${title}`;
    
  return logShip(description, url, 'content_input');
}

/**
 * Log a ship (user-visible value delivery)
 */
export function logShip(description: string, proofUrl?: string, source: ShipRecord['source'] = 'manual'): ShipRecord {
  const data = loadNoctisiumData();
  const now = new Date().toISOString();
  const sliceId = data.currentSliceId || `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate cycle time if we have an active slice
  let cycleTimeMinutes: number | undefined;
  let firstWorkStartTime: string | undefined;

  const slice = data.workSlices.find(s => s.id === sliceId);
  if (slice?.firstDeepWorkStart) {
    cycleTimeMinutes = Math.round((Date.now() - new Date(slice.firstDeepWorkStart).getTime()) / 60000);
    firstWorkStartTime = slice.firstDeepWorkStart;

    // Complete the slice
    slice.shippedAt = now;
    slice.cycleTimeMinutes = cycleTimeMinutes;
    slice.isActive = false;
  }

  // Create ship record
  const ship: ShipRecord = {
    id: `ship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sliceId,
    timestamp: now,
    description,
    proofUrl,
    source,
    cycleTimeMinutes,
    firstWorkStartTime
  };

  // Create event
  const event: NoctisiumEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'ship',
    timestamp: now,
    sliceId,
    proofUrl,
    description
  };

  data.ships.push(ship);
  data.events.push(event);

  // Clear current slice after shipping
  data.currentSliceId = undefined;
  data.currentPriority = '';

  // Clear any no-ship alerts
  data.alerts = data.alerts.filter(alert => alert.type !== 'no_ship' || !alert.isActive);

  saveNoctisiumData(data);
  return ship;
}

/**
 * Get time since last ship in hours
 */
export function getTimeSinceLastShip(): number {
  const data = loadNoctisiumData();
  if (data.ships.length === 0) return 0;
  
  const lastShip = data.ships.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return (Date.now() - new Date(lastShip.timestamp).getTime()) / (1000 * 60 * 60);
}

// Removed duplicate function - using existing handleContentCreation system

/**
 * Get current deep work session if active
 */
export function getCurrentDeepWorkSession(): DeepWorkSession | null {
  const data = loadNoctisiumData();
  return data.deepWorkSessions.find(s => s.isActive) || null;
}

/**
 * Get current work slice if active
 */
export function getCurrentWorkSlice(): WorkSlice | null {
  const data = loadNoctisiumData();
  if (!data.currentSliceId) return null;
  return data.workSlices.find(s => s.id === data.currentSliceId && s.isActive) || null;
}

/**
 * Set weekly constraint
 */
export function setWeeklyConstraint(constraint: string, reason?: string): WeeklyConstraint {
  const data = loadNoctisiumData();
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().split('T')[0];

  // Deactivate any existing constraint for this week
  data.weeklyConstraints.forEach(c => {
    if (c.weekStart === weekStart) {
      c.isActive = false;
    }
  });

  const newConstraint: WeeklyConstraint = {
    id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    weekStart,
    constraint,
    reason,
    isActive: true
  };

  data.weeklyConstraints.push(newConstraint);
  saveNoctisiumData(data);
  return newConstraint;
}

/**
 * Get current weekly constraint
 */
export function getCurrentWeeklyConstraint(): WeeklyConstraint | null {
  const data = loadNoctisiumData();
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().split('T')[0];

  return data.weeklyConstraints.find(c => c.weekStart === weekStart && c.isActive) || null;
}

/**
 * Update runway data
 */
export function updateRunwayData(totalBalance: number, monthlyBurn: number): RunwayData {
  const data = loadNoctisiumData();
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const monthsRemaining = monthlyBurn > 0 ? Math.floor(totalBalance / monthlyBurn) : 999;

  // Remove existing data for this month
  data.runwayData = data.runwayData.filter(r => r.monthYear !== monthYear);

  const runway: RunwayData = {
    id: `runway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    monthYear,
    totalBalance,
    monthlyBurn,
    monthsRemaining,
    lastUpdated: new Date().toISOString(),
    suggestedCuts: monthsRemaining < 12 ? ['Reduce subscription services', 'Cut dining out', 'Pause gym membership'] : undefined,
    suggestedIncomeTargets: monthsRemaining < 12 ? ['Freelance consulting', 'Sell unused equipment', 'Side project revenue'] : undefined
  };

  data.runwayData.push(runway);

  // Create/update low runway alert
  const existingAlert = data.alerts.find(a => a.type === 'low_runway' && a.isActive);
  if (monthsRemaining < 12) {
    if (!existingAlert) {
      data.alerts.push({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'low_runway',
        isActive: true,
        createdAt: new Date().toISOString(),
        suggestedActions: runway.suggestedCuts?.concat(runway.suggestedIncomeTargets || []) || [],
        metadata: { monthsRemaining, totalBalance, monthlyBurn }
      });
    }
  } else if (existingAlert) {
    existingAlert.isActive = false;
  }

  saveNoctisiumData(data);
  return runway;
}

/**
 * Check and create alerts
 */
export function checkAndCreateAlerts(): NoctisiumAlert[] {
  const data = loadNoctisiumData();
  const now = Date.now();
  const createdAlerts: NoctisiumAlert[] = [];

  // Check for no-ship alert (48-72 hours)
  const timeSinceLastShip = getTimeSinceLastShip();
  const existingNoShipAlert = data.alerts.find(a => a.type === 'no_ship' && a.isActive);

  if (timeSinceLastShip > 48 && !existingNoShipAlert) {
    const alert: NoctisiumAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'no_ship',
      isActive: true,
      createdAt: new Date().toISOString(),
      suggestedActions: [
        'Create minimum viable feature',
        'Write documentation update',
        'Fix small bug or improvement',
        'Create tutorial or example'
      ],
      metadata: { timeSinceLastShip }
    };

    data.alerts.push(alert);
    createdAlerts.push(alert);
  }

  saveNoctisiumData(data);
  return createdAlerts;
}
