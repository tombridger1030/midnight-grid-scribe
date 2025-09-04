import { supabase } from './supabase';

export const FIXED_USER_ID = 'echo';

// Weekly KPI targets and definitions
export interface WeeklyKPIDefinition {
  id: string;
  name: string;
  target: number;
  minTarget?: number; // For ranges like 3-4 strength sessions
  unit: string;
  category: 'fitness' | 'health' | 'productivity' | 'social' | 'learning';
  color: string;
}

export const WEEKLY_KPI_DEFINITIONS: WeeklyKPIDefinition[] = [
  {
    id: 'strengthSessions',
    name: 'Strength Sessions',
    target: 3,
    minTarget: 2,
    unit: 'sessions',
    category: 'fitness',
    color: '#FF6B00'  // Orange for fitness
  },
  {
    id: 'matHours',
    name: 'Mat Hours',
    target: 6,
    minTarget: 3,
    unit: 'hours',
    category: 'fitness',
    color: '#FF6B00'  // Orange for fitness
  },
  {
    id: 'coldPlunges',
    name: 'Cold Plunges',
    target: 5,
    unit: 'sessions',
    category: 'health',
    color: '#53B4FF'  // Blue for health
  },
  {
    id: 'sleepAverage',
    name: 'Sleep Average',
    target: 6,
    unit: 'hours',
    category: 'health',
    color: '#53B4FF'  // Blue for health
  },
  {
    id: 'deepWorkBlocks',
    name: 'Deep Work Blocks',
    target: 10,
    unit: 'blocks',
    category: 'productivity',
    color: '#5FE3B3'  // Green for productivity
  },
  {
    id: 'gitCommits',
    name: 'Git Commits',
    target: 25,
    unit: 'commits',
    category: 'productivity',
    color: '#5FE3B3'  // Green for productivity
  },
  {
    id: 'twitterDMs',
    name: 'Twitter DMs',
    target: 3,
    unit: 'messages',
    category: 'social',
    color: '#FFD700'  // Yellow for social
  },
  {
    id: 'linkedinMessages',
    name: 'LinkedIn Messages',
    target: 5,
    unit: 'messages',
    category: 'social',
    color: '#FFD700'  // Yellow for social
  },
  {
    id: 'readingPages',
    name: 'Reading',
    target: 300,
    unit: 'pages',
    category: 'learning',
    color: '#FF6B6B'  // Red for learning
  }
];

// Weekly KPI actual values
export interface WeeklyKPIValues {
  [kpiId: string]: number;
}

// Complete weekly KPI record
export interface WeeklyKPIRecord {
  weekKey: string; // Format: "2025-W03" (ISO week)
  values: WeeklyKPIValues;
  createdAt: string;
  updatedAt: string;
  // Optional per-day breakdown for each KPI (7 entries for Mon-Sun)
  daily?: Record<string, number[]>;
  // Map of ISO date (YYYY-MM-DD) -> { [kpiId]: number } for exact-date tracking
  dailyByDate?: Record<string, Record<string, number>>;
}

// Storage data structure
export interface WeeklyKPIData {
  records: WeeklyKPIRecord[];
}

// Helper functions for week calculations
export const getCurrentWeek = (): string => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

export const getWeekKey = (date: Date): string => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

export const getWeekDates = (weekKey: string): { start: Date; end: Date } => {
  const [year, week] = weekKey.split('-W').map(Number);
  const startOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7 - startOfYear.getDay() + 1;
  
  const start = new Date(startOfYear);
  start.setDate(startOfYear.getDate() + daysToAdd);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return { start, end };
};

// Get the 7 dates for a week key (start..start+6)
export const getWeekDayDates = (weekKey: string): Date[] => {
  const { start } = getWeekDates(weekKey);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
};

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatWeekKey = (weekKey: string): string => {
  const { start, end } = getWeekDates(weekKey);
  const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
};

// Storage functions (localStorage + Supabase hybrid)
export const loadWeeklyKPIs = (): WeeklyKPIData => {
  try {
    const stored = localStorage.getItem('noctisium-weekly-kpis');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load weekly KPIs from localStorage:', error);
  }
  
  return { records: [] };
};

export const saveWeeklyKPIs = async (data: WeeklyKPIData): Promise<void> => {
  try {
    // Save to localStorage immediately
    localStorage.setItem('noctisium-weekly-kpis', JSON.stringify(data));
    
    // Also save to Supabase
    await saveWeeklyKPIsToSupabase(data);
  } catch (error) {
    console.error('Failed to save weekly KPIs:', error);
  }
};

export const getWeeklyKPIRecord = (weekKey: string): WeeklyKPIRecord | null => {
  const data = loadWeeklyKPIs();
  return data.records.find(record => record.weekKey === weekKey) || null;
};

export const updateWeeklyKPIRecord = async (weekKey: string, values: Partial<WeeklyKPIValues>): Promise<void> => {
  const data = loadWeeklyKPIs();
  const existingRecordIndex = data.records.findIndex(record => record.weekKey === weekKey);
  
  const now = new Date().toISOString();
  
  if (existingRecordIndex >= 0) {
    // Update existing record
    data.records[existingRecordIndex] = {
      ...data.records[existingRecordIndex],
      values: {
        ...data.records[existingRecordIndex].values,
        ...values
      },
      updatedAt: now
    };
  } else {
    // Create new record
    const newRecord: WeeklyKPIRecord = {
      weekKey,
      values: { ...values },
      createdAt: now,
      updatedAt: now
    };
    data.records.push(newRecord);
  }
  
  // Save to both localStorage and Supabase
  await saveWeeklyKPIs(data);
};

// Read daily values for a KPI in a given week (always length 7)
export const getWeeklyDailyValues = (weekKey: string, kpiId: string): number[] => {
  const record = getWeeklyKPIRecord(weekKey);
  const dates = getWeekDayDates(weekKey).map(toISODate);

  if (record && record.dailyByDate) {
    return dates.map(date => {
      const dayMap = record!.dailyByDate![date];
      if (!dayMap) return 0;
      const v = dayMap[kpiId];
      return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    });
  }

  // Fallback to old daily array if exists
  if (record && record.daily && record.daily[kpiId]) {
    const arr = record.daily[kpiId];
    const normalized = (Array.isArray(arr) ? arr : []).map(v => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
    while (normalized.length < 7) normalized.push(0);
    return normalized.slice(0, 7);
  }

  return new Array(7).fill(0);
};

// Update a single day's value for a KPI (0/1) and keep weekly total in sync
export const updateWeeklyDailyValue = async (
  weekKey: string,
  kpiId: string,
  dayIndex: number,
  value: number
): Promise<void> => {
  const data = loadWeeklyKPIs();
  const now = new Date().toISOString();
  let record = data.records.find(r => r.weekKey === weekKey);
  if (!record) {
    record = {
      weekKey,
      values: {},
      createdAt: now,
      updatedAt: now,
      daily: {},
      dailyByDate: {}
    };
    data.records.push(record);
  }

  // Keep compatibility array as well as date-keyed map
  if (!record.daily) record.daily = {};
  if (!record.daily[kpiId]) record.daily[kpiId] = new Array(7).fill(0);
  const arr = record.daily[kpiId].slice();
  if (dayIndex < 0 || dayIndex > 6) return; // ignore invalid
  arr[dayIndex] = Math.max(0, Number(value) || 0);
  record.daily[kpiId] = arr;

  if (!record.dailyByDate) record.dailyByDate = {};
  const weekDates = getWeekDayDates(weekKey);
  const dateKey = toISODate(weekDates[dayIndex]);
  if (!record.dailyByDate[dateKey]) record.dailyByDate[dateKey] = {};
  record.dailyByDate[dateKey][kpiId] = Math.max(0, Number(value) || 0);

  // Keep weekly total aligned with sum of daily values (counts or quantities)
  const sum = arr.reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
  record.values[kpiId] = sum;
  record.updatedAt = now;

  await saveWeeklyKPIs(data);

  // Persist a per-date entry row for analytics/reporting
  try {
    const { error } = await supabase
      .from('weekly_kpi_entries')
      .upsert({
        user_id: FIXED_USER_ID,
        date: dateKey,
        week_key: weekKey,
        kpi_id: kpiId,
        value: Math.max(0, Number(value) || 0)
      }, {
        onConflict: 'user_id,date,kpi_id'
      });
    if (error) console.error('Failed to upsert weekly_kpi_entries:', error);
  } catch (e) {
    console.error('Failed to save weekly_kpi_entries:', e);
  }
};

// Overwrite the entire week's daily values for a KPI (length 7), and sync weekly total
export const setWeeklyDailyValues = async (
  weekKey: string,
  kpiId: string,
  values: number[]
): Promise<void> => {
  const data = loadWeeklyKPIs();
  const now = new Date().toISOString();
  let record = data.records.find(r => r.weekKey === weekKey);
  if (!record) {
    record = {
      weekKey,
      values: {},
      createdAt: now,
      updatedAt: now,
      daily: {},
      dailyByDate: {}
    };
    data.records.push(record);
  }

  if (!record.daily) record.daily = {};
  const arr = (Array.isArray(values) ? values.slice(0, 7) : []).map(v => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0));
  while (arr.length < 7) arr.push(0);
  record.daily[kpiId] = arr;

  // Also set date-keyed map
  if (!record.dailyByDate) record.dailyByDate = {};
  const weekDates = getWeekDayDates(weekKey);
  arr.forEach((val, idx) => {
    const dateKey = toISODate(weekDates[idx]);
    if (!record!.dailyByDate![dateKey]) record!.dailyByDate![dateKey] = {};
    record!.dailyByDate![dateKey][kpiId] = val;
  });

  const sum = arr.reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
  record.values[kpiId] = sum;
  record.updatedAt = now;

  await saveWeeklyKPIs(data);
};

// Load weekly KPIs with Supabase sync
export const loadWeeklyKPIsWithSync = async (): Promise<WeeklyKPIData> => {
  try {
    // Try to load from Supabase first
    const supabaseData = await loadWeeklyKPIsFromSupabase();
    
    if (supabaseData) {
      // Save to localStorage for offline access
      localStorage.setItem('noctisium-weekly-kpis', JSON.stringify(supabaseData));
      return supabaseData;
    } else {
      // Fall back to localStorage
      return loadWeeklyKPIs();
    }
  } catch (error) {
    console.error('Failed to sync weekly KPIs from Supabase, using localStorage:', error);
    return loadWeeklyKPIs();
  }
};

// Calculate KPI progress percentage
export const calculateKPIProgress = (kpiId: string, actualValue: number): number => {
  const definition = WEEKLY_KPI_DEFINITIONS.find(kpi => kpi.id === kpiId);
  if (!definition) return 0;
  
  const target = definition.target;
  return Math.min(100, (actualValue / target) * 100);
};

// Get KPI status based on progress
export const getKPIStatus = (kpiId: string, actualValue: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  const progress = calculateKPIProgress(kpiId, actualValue);
  
  if (progress >= 100) return 'excellent';
  if (progress >= 80) return 'good';
  if (progress >= 50) return 'fair';
  return 'poor';
};

// Calculate overall week completion percentage
export const calculateWeekCompletion = (values: WeeklyKPIValues): number => {
  const totalKPIs = WEEKLY_KPI_DEFINITIONS.length;
  const totalProgress = WEEKLY_KPI_DEFINITIONS.reduce((sum, kpi) => {
    const value = values[kpi.id] || 0;
    return sum + calculateKPIProgress(kpi.id, value);
  }, 0);
  
  return Math.round(totalProgress / totalKPIs);
};

// Supabase integration functions
export const loadWeeklyKPIsFromSupabase = async (userId: string = FIXED_USER_ID): Promise<WeeklyKPIData | null> => {
  try {
    const { data, error } = await supabase
      .from('weekly_kpis')
      .select('*')
      .eq('user_id', userId)
      .order('week_key', { ascending: true });
    
    if (error) {
      console.error('Error loading weekly KPIs from Supabase:', error);
      return null;
    }
    
    const records: WeeklyKPIRecord[] = (data || []).map(row => ({
      weekKey: row.week_key,
      values: (row.data && typeof row.data === 'object' && !Array.isArray(row.data) && row.data.values) ? row.data.values : (row.data || {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      daily: (row.data && row.data.__daily) ? row.data.__daily : undefined,
      dailyByDate: (row.data && row.data.__dailyByDate) ? row.data.__dailyByDate : undefined
    }));
    
    return { records };
  } catch (error) {
    console.error('Failed to load weekly KPIs from Supabase:', error);
    return null;
  }
};

export const saveWeeklyKPIsToSupabase = async (data: WeeklyKPIData, userId: string = FIXED_USER_ID): Promise<void> => {
  try {
    // Prepare records for upsert
    const upsertData = data.records.map(record => ({
      user_id: userId,
      week_key: record.weekKey,
      // Store values and embed daily breakdowns for compatibility and exact dates
      data: { values: record.values, __daily: record.daily || {}, __dailyByDate: record.dailyByDate || {} },
      created_at: record.createdAt,
      updated_at: record.updatedAt
    }));
    
    const { error } = await supabase
      .from('weekly_kpis')
      .upsert(upsertData, {
        onConflict: 'user_id,week_key'
      });
    
    if (error) {
      console.error('Error saving weekly KPIs to Supabase:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to save weekly KPIs to Supabase:', error);
    throw error;
  }
};

// Get recent weeks for trend analysis
export const getRecentWeeks = (count: number = 6): string[] => {
  const weeks: string[] = [];
  const currentDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - (i * 7));
    weeks.push(getWeekKey(date));
  }
  
  return weeks.reverse(); // Return in chronological order
};

// Types are already exported above 

// Load per-date entries for a week and merge into local weekly record
export const loadWeeklyEntriesForWeek = async (weekKey: string, userId: string = FIXED_USER_ID): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('weekly_kpi_entries')
      .select('date,kpi_id,value')
      .eq('user_id', userId)
      .eq('week_key', weekKey);

    if (error) {
      console.error('Failed to load weekly_kpi_entries:', error);
      return;
    }

    const store = loadWeeklyKPIs();
    const now = new Date().toISOString();
    let record = store.records.find(r => r.weekKey === weekKey);
    if (!record) {
      record = { weekKey, values: {}, createdAt: now, updatedAt: now, dailyByDate: {}, daily: {} };
      store.records.push(record);
    }
    if (!record.dailyByDate) record.dailyByDate = {};

    // Merge entries
    for (const row of data || []) {
      const dateKey: string = row.date;
      const kpiId: string = row.kpi_id;
      const value: number = Number(row.value) || 0;
      if (!record.dailyByDate[dateKey]) record.dailyByDate[dateKey] = {};
      record.dailyByDate[dateKey][kpiId] = Math.max(0, value);
    }

    // Recompute 7-day arrays and weekly totals from dailyByDate
    const weekDates = getWeekDayDates(weekKey).map(toISODate);
    const allKpiIds = new Set<string>();
    // Collect all kpi ids present
    Object.values(record.dailyByDate).forEach(map => {
      Object.keys(map || {}).forEach(k => allKpiIds.add(k));
    });

    if (!record.daily) record.daily = {};
    for (const kpiId of allKpiIds) {
      const arr = weekDates.map(d => {
        const dayMap = record!.dailyByDate![d];
        return dayMap && Number.isFinite(Number(dayMap[kpiId])) ? Math.max(0, Number(dayMap[kpiId])) : 0;
      });
      record.daily[kpiId] = arr;
      const sum = arr.reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
      record.values[kpiId] = sum;
    }

    record.updatedAt = now;
    await saveWeeklyKPIs(store);
  } catch (err) {
    console.error('Error merging weekly entries:', err);
  }
};