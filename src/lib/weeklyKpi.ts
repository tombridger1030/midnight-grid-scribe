import { supabase } from "./supabase";
import { userStorage } from "./userStorage";

// Cache for KPI configurations to avoid repeated lookups
let kpiConfigCache: Map<string, { isAverage: boolean }> | null = null;

// Helper to check if a KPI is an average type
async function isAverageKPI(kpiId: string): Promise<boolean> {
  // Hard-coded check for known average KPIs
  if (kpiId === "sleepAverage") return true;

  // Try to load from user's KPI configuration
  try {
    if (!kpiConfigCache) {
      kpiConfigCache = new Map();
      const { kpiManager } = await import("./configurableKpis");
      const userKPIs = await kpiManager.getUserKPIs();
      userKPIs.forEach((kpi) => {
        kpiConfigCache!.set(kpi.kpi_id, { isAverage: kpi.is_average || false });
      });
    }
    const config = kpiConfigCache.get(kpiId);
    return config?.isAverage || false;
  } catch (error) {
    console.warn("Failed to check KPI configuration:", error);
    return false;
  }
}

// Clear the cache when KPIs are updated
export function clearKPIConfigCache() {
  kpiConfigCache = null;
}

// Helper function to calculate weekly value from daily array based on KPI type
async function calculateWeeklyValueFromDaily(
  kpiId: string,
  dailyArray: number[],
): Promise<number> {
  const arr = dailyArray.map((v) =>
    Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0,
  );
  const sum = arr.reduce((s, n) => s + n, 0);
  const isAvgKPI = await isAverageKPI(kpiId);

  if (isAvgKPI) {
    // Store the average per day (only for days with data)
    const daysWithData = arr.filter((v) => v > 0).length;
    return daysWithData > 0 ? sum / daysWithData : 0;
  } else if (kpiId === "noCompromises") {
    // Store longest streak within this week (consecutive 1s)
    let best = 0,
      cur = 0;
    for (const v of arr) {
      if (Number(v) > 0) {
        cur += 1;
        best = Math.max(best, cur);
      } else {
        cur = 0;
      }
    }
    return best;
  } else {
    // Default: weekly total
    return sum;
  }
}

// Weekly KPI targets and definitions
export interface WeeklyKPIDefinition {
  id: string;
  name: string;
  target: number;
  minTarget?: number; // For ranges like 3-4 strength sessions
  unit: string;
  category:
    | "fitness"
    | "health"
    | "productivity"
    | "social"
    | "learning"
    | "discipline"
    | "engineering";
  color: string;
}

export const WEEKLY_KPI_DEFINITIONS: WeeklyKPIDefinition[] = [
  {
    id: "strengthSessions",
    name: "Strength Sessions",
    target: 3,
    minTarget: 2,
    unit: "sessions",
    category: "fitness",
    color: "#FF073A", // Neon red for fitness
  },
  {
    id: "bjjSessions",
    name: "BJJ Sessions",
    target: 3,
    unit: "sessions",
    category: "fitness",
    color: "#53B4FF", // Blue for BJJ
  },
  {
    id: "deepWorkHours",
    name: "Deep Work Hours",
    target: 100,
    minTarget: 80,
    unit: "hours",
    category: "discipline",
    color: "#5FE3B3", // Green for discipline
  },
  {
    id: "recoverySessions",
    name: "Recovery Sessions",
    target: 2,
    // No minTarget for recovery; aim for 2/week
    unit: "sessions",
    category: "fitness",
    color: "#FFD700", // Gold for recovery
  },
  {
    id: "sleepAverage",
    name: "Sleep Average",
    target: 7,
    minTarget: 6,
    unit: "hours",
    category: "discipline",
    color: "#9D4EDD", // Purple for sleep
  },
  {
    id: "prRequests",
    name: "PR Requests",
    target: 2,
    unit: "requests",
    category: "engineering",
    color: "#4A90E2", // Slightly different blue for PRs
  },
  {
    id: "bugsClosed",
    name: "Bugs Closed",
    target: 10,
    unit: "bugs",
    category: "engineering",
    color: "#FF6B6B", // Red for bug fixes
  },
  {
    id: "contentShipped",
    name: "Content Shipped",
    target: 7,
    unit: "items",
    category: "engineering",
    color: "#00CED1", // Turquoise for content
  },
  {
    id: "readingPages",
    name: "Pages Read",
    target: 100,
    unit: "pages",
    category: "learning",
    color: "#FFA500", // Dark orange for reading
  },
  {
    id: "audiobookPercent",
    name: "% Audiobook Listened",
    target: 100,
    unit: "%",
    category: "learning",
    color: "#DA70D6", // Orchid for audiobooks
  },
  {
    id: "noCompromises",
    name: "No Compromises",
    target: 7,
    unit: "days",
    category: "discipline",
    color: "#32CD32", // Lime green for discipline
  },
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

// Helper functions for fiscal-week calculations (Week 1 = Sep 1–Sep 7)
const FISCAL_START_MONTH = 8; // 0-based (8 = September)
const FISCAL_START_DAY = 1;

function toMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getFiscalYearStart(date: Date): Date {
  const y = date.getFullYear();
  const sepFirstThisYear = new Date(y, FISCAL_START_MONTH, FISCAL_START_DAY);
  return toMidnight(
    date >= sepFirstThisYear
      ? sepFirstThisYear
      : new Date(y - 1, FISCAL_START_MONTH, FISCAL_START_DAY),
  );
}

function getFiscalYearLabel(date: Date): number {
  const y = date.getFullYear();
  const sepFirstThisYear = new Date(y, FISCAL_START_MONTH, FISCAL_START_DAY);
  return date >= sepFirstThisYear ? y : y - 1;
}

export const getCurrentWeek = (): string => {
  return getWeekKey(new Date());
};

export const getPreviousWeek = (): string => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return getWeekKey(oneWeekAgo);
};

export const getWeekKey = (date: Date): string => {
  const midnight = toMidnight(date);
  const fiscalStart = getFiscalYearStart(midnight);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayIndex = Math.floor(
    (midnight.getTime() - fiscalStart.getTime()) / msPerDay,
  );
  const weekNumber = Math.floor(dayIndex / 7) + 1; // Week 1 = Sep 1–Sep 7
  const yearLabel = getFiscalYearLabel(midnight);
  return `${yearLabel}-W${weekNumber.toString().padStart(2, "0")}`;
};

export const getWeekDates = (weekKey: string): { start: Date; end: Date } => {
  const [year, week] = weekKey.split("-W").map(Number);
  const fiscalStart = new Date(year, FISCAL_START_MONTH, FISCAL_START_DAY);
  const start = new Date(fiscalStart);
  start.setDate(fiscalStart.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toMidnight(start), end: toMidnight(end) };
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
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const formatWeekKey = (weekKey: string): string => {
  const { start, end } = getWeekDates(weekKey);
  const startStr = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${startStr} - ${endStr}`;
};

// -------- Week-specific target resolution --------
type TargetTuple = { target: number; minTarget?: number };
const weeklyTargetCache: Map<string, Map<string, TargetTuple>> = new Map(); // weekKey -> (kpiId -> targets)
const weeklyNameCache: Map<string, Map<string, string>> = new Map(); // weekKey -> (kpiId -> nameOverride)

export async function getEffectiveTargetsForWeek(
  weekKey: string,
): Promise<Map<string, TargetTuple>> {
  // Return cached if present
  if (weeklyTargetCache.has(weekKey)) {
    return weeklyTargetCache.get(weekKey)!;
  }

  const map = new Map<string, TargetTuple>();

  try {
    // 1) Load user KPI globals
    const { kpiManager } = await import("./configurableKpis");
    const userKPIs = await kpiManager.getUserKPIs();
    userKPIs.forEach((k) => {
      map.set(k.kpi_id, {
        target: Number(k.target) || 0,
        minTarget:
          typeof k.min_target === "number" ? Number(k.min_target) : undefined,
      });
    });

    // 2) Apply per-week overrides
    const overrides = await userStorage.getWeeklyTargetOverrides(weekKey);
    const nameMap = new Map<string, string>();
    overrides.forEach((o) => {
      map.set(o.kpi_id, {
        target: Number(o.target_value) || 0,
        minTarget:
          o.min_target_value !== null && o.min_target_value !== undefined
            ? Number(o.min_target_value)
            : map.get(o.kpi_id)?.minTarget,
      });
      if (o.name_override) nameMap.set(o.kpi_id, o.name_override);
    });
    if (nameMap.size > 0) weeklyNameCache.set(weekKey, nameMap);
  } catch (e) {
    console.warn(
      "Failed loading effective targets; falling back to definitions",
      e,
    );
    // Fallback to built-in definitions
    WEEKLY_KPI_DEFINITIONS.forEach((def) => {
      map.set(def.id, { target: def.target, minTarget: def.minTarget });
    });
  }

  weeklyTargetCache.set(weekKey, map);
  return map;
}

export function clearWeeklyTargetCache(weekKey?: string) {
  if (weekKey) weeklyTargetCache.delete(weekKey);
  else weeklyTargetCache.clear();
}

// Resolve effective KPI name for a week (override -> global)
export async function getEffectiveKPIName(
  weekKey: string,
  kpiId: string,
): Promise<string> {
  // Check cached name override first
  const nameMap = weeklyNameCache.get(weekKey);
  if (nameMap && nameMap.has(kpiId)) return nameMap.get(kpiId)!;

  // Ensure caches are hydrated
  await getEffectiveTargetsForWeek(weekKey);
  const nameMap2 = weeklyNameCache.get(weekKey);
  if (nameMap2 && nameMap2.has(kpiId)) return nameMap2.get(kpiId)!;

  // Fallback to global KPI name
  try {
    const { kpiManager } = await import("./configurableKpis");
    const all = await kpiManager.getUserKPIs();
    const k = all.find((x) => x.kpi_id === kpiId);
    return k?.name || kpiId;
  } catch {
    return kpiId;
  }
}

// Storage functions (localStorage + Supabase hybrid)
export const loadWeeklyKPIs = (): WeeklyKPIData => {
  try {
    const stored = localStorage.getItem("noctisium-weekly-kpis");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load weekly KPIs from localStorage:", error);
  }

  return { records: [] };
};

/**
 * Sync localStorage with Supabase on app startup
 * Loads from Supabase (source of truth) and updates localStorage cache
 * Should be called once when user logs in
 */
export const syncWeeklyKPIsWithSupabase = async (): Promise<WeeklyKPIData> => {
  const userId = userStorage.getCurrentUserId();
  if (!userId) {
    return loadWeeklyKPIs();
  }

  try {
    // Load from Supabase (the actual function is defined below)
    const supabaseData = await loadWeeklyKPIsFromSupabaseInternal(userId);

    if (supabaseData && supabaseData.records.length > 0) {
      // Sync to localStorage for offline access
      localStorage.setItem(
        "noctisium-weekly-kpis",
        JSON.stringify(supabaseData),
      );
      console.log(
        "[WeeklyKPI] Synced from Supabase:",
        supabaseData.records.length,
        "records",
      );
      return supabaseData;
    }

    // No Supabase data - check if we have localStorage data to migrate
    const localData = loadWeeklyKPIs();
    if (localData.records.length > 0) {
      console.log(
        "[WeeklyKPI] Migrating localStorage to Supabase:",
        localData.records.length,
        "records",
      );
      await saveWeeklyKPIsToSupabase(localData, userId);
      return localData;
    }

    return { records: [] };
  } catch (error) {
    console.error("[WeeklyKPI] Sync failed, using localStorage:", error);
    return loadWeeklyKPIs();
  }
};

// Internal helper - the main export is below with userId parameter
const loadWeeklyKPIsFromSupabaseInternal = async (
  userId: string,
): Promise<WeeklyKPIData | null> => {
  try {
    const { data, error } = await supabase
      .from("weekly_kpis")
      .select("*")
      .eq("user_id", userId)
      .order("week_key", { ascending: true });

    if (error) {
      console.error("Error loading weekly KPIs from Supabase:", error);
      return null;
    }

    const records: WeeklyKPIRecord[] = (data || []).map((row) => ({
      weekKey: row.week_key,
      values:
        row.data &&
        typeof row.data === "object" &&
        !Array.isArray(row.data) &&
        row.data.values
          ? row.data.values
          : row.data || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      daily: row.data && row.data.__daily ? row.data.__daily : undefined,
      dailyByDate:
        row.data && row.data.__dailyByDate ? row.data.__dailyByDate : undefined,
    }));

    return { records };
  } catch (error) {
    console.error("Failed to load weekly KPIs from Supabase:", error);
    return null;
  }
};

export const saveWeeklyKPIs = async (data: WeeklyKPIData): Promise<void> => {
  try {
    // Save to localStorage immediately
    localStorage.setItem("noctisium-weekly-kpis", JSON.stringify(data));

    // Also save to Supabase if user is logged in
    const userId = userStorage.getCurrentUserId();
    if (userId) {
      await saveWeeklyKPIsToSupabase(data, userId);
    }
  } catch (error) {
    console.error("Failed to save weekly KPIs:", error);
  }
};

/**
 * Migration: Map legacy ISO-week keys (year-based) to fiscal-week keys (Sep 1 anchor)
 * Strategy:
 *  - Detect records whose weekKey doesn't match computed fiscal key for any included date.
 *  - If dailyByDate is present, derive the weekKey from the first date in that week window.
 *  - Merge values when collisions occur.
 */
export async function migrateWeeklyKPIsToFiscalWeeks(
  original: WeeklyKPIData,
): Promise<WeeklyKPIData> {
  try {
    const input = JSON.parse(JSON.stringify(original)) as WeeklyKPIData;
    const byWeek = new Map<string, WeeklyKPIRecord>();

    const mergeRecord = (target: WeeklyKPIRecord, src: WeeklyKPIRecord) => {
      target.values = { ...(target.values || {}), ...(src.values || {}) };
      if (src.dailyByDate) {
        if (!target.dailyByDate) target.dailyByDate = {};
        Object.entries(src.dailyByDate).forEach(([d, map]) => {
          target.dailyByDate![d] = {
            ...(target.dailyByDate![d] || {}),
            ...(map || {}),
          };
        });
      }
      if (src.daily) {
        if (!target.daily) target.daily = {} as Record<string, number[]>;
        Object.entries(src.daily).forEach(([kpiId, arr]) => {
          const existing = (
            target.daily![kpiId] || new Array(7).fill(0)
          ).slice();
          for (let i = 0; i < 7; i++)
            existing[i] = Math.max(0, Number(arr[i] || existing[i] || 0));
          target.daily![kpiId] = existing;
        });
      }
      target.updatedAt = new Date().toISOString();
    };

    for (const rec of input.records || []) {
      let newKey = rec.weekKey;
      // Prefer exact date-based mapping if available
      const dates = rec.dailyByDate ? Object.keys(rec.dailyByDate) : [];
      if (dates.length > 0) {
        // Choose the minimum date seen for stability
        const minDate = dates.slice().sort()[0];
        newKey = getWeekKey(new Date(minDate + "T00:00:00"));
      } else {
        // Fallback: compute from the old interpreted start date of the stored key
        try {
          const { start } = getWeekDates(rec.weekKey);
          newKey = getWeekKey(start);
        } catch {
          // Ignore errors when parsing week dates
        }
      }

      const merged = byWeek.get(newKey);
      if (!merged) {
        byWeek.set(newKey, { ...rec, weekKey: newKey });
      } else {
        mergeRecord(merged, { ...rec, weekKey: newKey });
      }
    }

    const migrated: WeeklyKPIData = {
      records: Array.from(byWeek.values()).sort((a, b) =>
        a.weekKey.localeCompare(b.weekKey),
      ),
    };
    return migrated;
  } catch (e) {
    console.warn("Weekly KPI fiscal migration failed or not needed:", e);
    return original;
  }
}

/**
 * Background migration for Supabase weekly_kpi_entries week_key values
 */
async function migrateSupabaseWeeklyEntriesWeekKeys(): Promise<void> {
  try {
    const userId = userStorage.getCurrentUserId();
    if (!userId) {
      return;
    }

    const { data, error } = await supabase
      .from("weekly_kpi_entries")
      .select("id, date, week_key, kpi_id, value")
      .eq("user_id", userId)
      .limit(2000);
    if (error || !data) return;

    const updates: { id: string; week_key: string }[] = [];
    for (const row of data as Array<{
      id: string;
      date: string;
      week_key: string;
      kpi_id: string;
      value: number;
    }>) {
      if (!row?.date) continue;
      const expected = getWeekKey(new Date(row.date + "T00:00:00"));
      if (row.week_key !== expected) {
        updates.push({ id: row.id, week_key: expected });
      }
    }
    if (updates.length === 0) return;

    // Batch updates in chunks
    const chunkSize = 200;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const { error: updErr } = await supabase
        .from("weekly_kpi_entries")
        .upsert(chunk, { onConflict: "id" });
      if (updErr) {
        console.warn("Failed to migrate weekly_kpi_entries chunk:", updErr);
      }
    }
  } catch (e) {
    console.warn("Supabase weekly_kpi_entries migration skipped:", e);
  }
}

export const getWeeklyKPIRecord = (weekKey: string): WeeklyKPIRecord | null => {
  const data = loadWeeklyKPIs();
  return data.records.find((record) => record.weekKey === weekKey) || null;
};

export const updateWeeklyKPIRecord = async (
  weekKey: string,
  values: Partial<WeeklyKPIValues>,
): Promise<void> => {
  const data = loadWeeklyKPIs();
  const existingRecordIndex = data.records.findIndex(
    (record) => record.weekKey === weekKey,
  );

  const now = new Date().toISOString();
  const isUpdatingOldData = existingRecordIndex >= 0; // Flag to check if we're updating existing data

  if (existingRecordIndex >= 0) {
    // Update existing record
    const record = data.records[existingRecordIndex];

    // Merge the values first
    const mergedValues = {
      ...record.values,
      ...values,
    };

    // For KPIs with daily data, recalculate from daily instead of using raw values
    const finalValues = { ...mergedValues };
    for (const [kpiId, value] of Object.entries(values)) {
      // Check if we have daily data for this KPI
      const dailyData = getWeeklyDailyValues(weekKey, kpiId);
      const hasDailyData = dailyData.some((v) => v > 0);

      if (hasDailyData) {
        // Recalculate from daily data to ensure correct average/total calculation
        finalValues[kpiId] = await calculateWeeklyValueFromDaily(
          kpiId,
          dailyData,
        );
      } else {
        // Use provided value if no daily data exists
        finalValues[kpiId] = value;
      }
    }

    data.records[existingRecordIndex] = {
      ...record,
      values: finalValues,
      updatedAt: now,
    };
  } else {
    // Create new record
    const newRecord: WeeklyKPIRecord = {
      weekKey,
      values: { ...values },
      createdAt: now,
      updatedAt: now,
    };
    data.records.push(newRecord);
  }

  // Save to both localStorage and Supabase
  await saveWeeklyKPIs(data);

  // If updating old data, regenerate rank history to reflect changes (with throttling)
  if (isUpdatingOldData && weekKey !== getCurrentWeek()) {
    // Throttle regeneration calls to prevent multiple simultaneous runs
    const global = globalThis as unknown as Record<
      string,
      NodeJS.Timeout | undefined
    >;
    if (global._rankRegenTimeout) {
      clearTimeout(global._rankRegenTimeout);
    }
    global._rankRegenTimeout = setTimeout(async () => {
      try {
        const { rankingManager } = await import("./rankingSystem");
        await rankingManager.regenerateRankHistory();
      } catch (error) {
        console.error(
          "Failed to regenerate rank history after KPI update:",
          error,
        );
      }
    }, 1000); // Wait 1 second before regenerating to batch multiple updates
  }
};

// Read daily values for a KPI in a given week (always length 7)
export const getWeeklyDailyValues = (
  weekKey: string,
  kpiId: string,
): number[] => {
  const record = getWeeklyKPIRecord(weekKey);
  const dates = getWeekDayDates(weekKey).map(toISODate);

  if (record && record.dailyByDate) {
    return dates.map((date) => {
      const dayMap = record!.dailyByDate![date];
      if (!dayMap) return 0;
      const v = dayMap[kpiId];
      return typeof v === "number" && Number.isFinite(v) ? v : 0;
    });
  }

  // Fallback to old daily array if exists
  if (record && record.daily && record.daily[kpiId]) {
    const arr = record.daily[kpiId];
    const normalized = (Array.isArray(arr) ? arr : []).map((v) =>
      typeof v === "number" && Number.isFinite(v) ? v : 0,
    );
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
  value: number,
): Promise<void> => {
  const data = loadWeeklyKPIs();
  const now = new Date().toISOString();
  let record = data.records.find((r) => r.weekKey === weekKey);
  if (!record) {
    record = {
      weekKey,
      values: {},
      createdAt: now,
      updatedAt: now,
      daily: {},
      dailyByDate: {},
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

  // Compute weekly aggregate with KPI-specific rules
  record.values[kpiId] = await calculateWeeklyValueFromDaily(kpiId, arr);
  record.updatedAt = now;

  await saveWeeklyKPIs(data);

  // If updating old data, regenerate rank history to reflect changes (with throttling)
  if (weekKey !== getCurrentWeek()) {
    // Throttle regeneration calls to prevent multiple simultaneous runs
    const global = globalThis as unknown as Record<
      string,
      NodeJS.Timeout | undefined
    >;
    if (global._rankRegenTimeout) {
      clearTimeout(global._rankRegenTimeout);
    }
    global._rankRegenTimeout = setTimeout(async () => {
      try {
        const { rankingManager } = await import("./rankingSystem");
        await rankingManager.regenerateRankHistory();
      } catch (error) {
        console.error(
          "Failed to regenerate rank history after daily KPI update:",
          error,
        );
      }
    }, 1000); // Wait 1 second before regenerating to batch multiple updates
  }

  // Persist a per-date entry row for analytics/reporting
  try {
    const userId = userStorage.getCurrentUserId();
    if (userId) {
      const { error } = await supabase.from("weekly_kpi_entries").upsert(
        {
          user_id: userId,
          date: dateKey,
          week_key: weekKey,
          kpi_id: kpiId,
          value: Math.max(0, Number(value) || 0),
        },
        {
          onConflict: "user_id,date,kpi_id",
        },
      );
      if (error) console.error("Failed to upsert weekly_kpi_entries:", error);
    }
  } catch (e) {
    console.error("Failed to save weekly_kpi_entries:", e);
  }
};

// Overwrite the entire week's daily values for a KPI (length 7), and sync weekly total
export const setWeeklyDailyValues = async (
  weekKey: string,
  kpiId: string,
  values: number[],
): Promise<void> => {
  const data = loadWeeklyKPIs();
  const now = new Date().toISOString();
  let record = data.records.find((r) => r.weekKey === weekKey);
  if (!record) {
    record = {
      weekKey,
      values: {},
      createdAt: now,
      updatedAt: now,
      daily: {},
      dailyByDate: {},
    };
    data.records.push(record);
  }

  if (!record.daily) record.daily = {};
  const arr = (Array.isArray(values) ? values.slice(0, 7) : []).map((v) =>
    Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0,
  );
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

  // If updating old data, regenerate rank history to reflect changes (with throttling)
  if (weekKey !== getCurrentWeek()) {
    // Throttle regeneration calls to prevent multiple simultaneous runs
    const global = globalThis as unknown as Record<
      string,
      NodeJS.Timeout | undefined
    >;
    if (global._rankRegenTimeout) {
      clearTimeout(global._rankRegenTimeout);
    }
    global._rankRegenTimeout = setTimeout(async () => {
      try {
        const { rankingManager } = await import("./rankingSystem");
        await rankingManager.regenerateRankHistory();
      } catch (error) {
        console.error(
          "Failed to regenerate rank history after weekly daily values update:",
          error,
        );
      }
    }, 1000); // Wait 1 second before regenerating to batch multiple updates
  }
};

// Load weekly KPIs with Supabase sync
export const loadWeeklyKPIsWithSync = async (): Promise<WeeklyKPIData> => {
  try {
    // Try to load from Supabase first if user is logged in
    const userId = userStorage.getCurrentUserId();
    const supabaseData = userId
      ? await loadWeeklyKPIsFromSupabase(userId)
      : null;

    if (supabaseData) {
      // Save to localStorage for offline access
      localStorage.setItem(
        "noctisium-weekly-kpis",
        JSON.stringify(supabaseData),
      );
      // Run migration on freshly loaded data (no-op if already migrated)
      const migrated = await migrateWeeklyKPIsToFiscalWeeks(supabaseData);
      // Persist after migration
      await saveWeeklyKPIs(migrated);

      // IMPORTANT: Also load daily entries from weekly_kpi_entries table
      // This populates the dailyByDate field with per-date values
      // silently load daily entries
      const currentWeek = getCurrentWeek();
      await loadWeeklyEntriesForWeek(currentWeek);

      // Also load previous and next week for context
      const [year, week] = currentWeek.split("-W").map(Number);
      const prevWeek = `${week === 1 ? year - 1 : year}-W${String(week === 1 ? 52 : week - 1).padStart(2, "0")}`;
      const nextWeek = `${week === 52 ? year + 1 : year}-W${String(week === 52 ? 1 : week + 1).padStart(2, "0")}`;
      await loadWeeklyEntriesForWeek(prevWeek);
      await loadWeeklyEntriesForWeek(nextWeek);

      return migrated;
    } else {
      // Fall back to localStorage
      const local = loadWeeklyKPIs();
      const migrated = await migrateWeeklyKPIsToFiscalWeeks(local);
      await saveWeeklyKPIs(migrated);
      return migrated;
    }
  } catch (error) {
    console.error(
      "Failed to sync weekly KPIs from Supabase, using localStorage:",
      error,
    );
    const local = loadWeeklyKPIs();
    const migrated = await migrateWeeklyKPIsToFiscalWeeks(local);
    await saveWeeklyKPIs(migrated);
    return migrated;
  }
};

// Calculate KPI progress percentage
export const calculateKPIProgress = async (
  kpiId: string,
  actualValue: number,
  weekKey?: string,
): Promise<number> => {
  // Resolve targets: prefer week override -> user KPI -> default definition
  let targetTuple: TargetTuple | undefined;
  try {
    const wk = weekKey || getCurrentWeek();
    const targets = await getEffectiveTargetsForWeek(wk);
    targetTuple = targets.get(kpiId);
  } catch {}

  if (!targetTuple) {
    const definition = WEEKLY_KPI_DEFINITIONS.find((kpi) => kpi.id === kpiId);
    if (!definition) return 0;
    targetTuple = {
      target: definition.target,
      minTarget: definition.minTarget,
    };
  }

  // Check if this is an average-based KPI
  const isAvgKPI = await isAverageKPI(kpiId);

  // On-track projection calculation
  const target = Number(targetTuple.target) || 0;
  if (target <= 0) return 0;

  // Special cases
  if (kpiId === "noCompromises") {
    // Keep simple mapping for streak-based KPI
    return Math.min(100, Math.max(0, ((Number(actualValue) || 0) / 7) * 100));
  }

  const wk = weekKey || getCurrentWeek();
  const dates = getWeekDayDates(wk);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = toMidnight(dates[0]);
  const end = toMidnight(dates[6]);
  let elapsedDays = 0;
  if (today < start) elapsedDays = 0;
  else if (today > end) elapsedDays = 7;
  else
    elapsedDays = Math.min(
      7,
      Math.max(
        0,
        Math.floor(
          (today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
        ) + 1,
      ),
    );
  const remainingDays = Math.max(0, 7 - elapsedDays);

  // Pull daily values if available
  let currentSum = Number(actualValue) || 0;
  try {
    const arr = getWeeklyDailyValues(wk, kpiId);
    const sumElapsed = arr
      .slice(0, elapsedDays)
      .reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
    const hasAnyDaily = arr.some((v) => (Number(v) || 0) > 0);
    if (hasAnyDaily)
      currentSum =
        sumElapsed +
        arr
          .slice(elapsedDays)
          .reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
    // For pace, use only elapsed days portion
    const paceBase = hasAnyDaily
      ? sumElapsed
      : Math.min(currentSum, sumElapsed || currentSum);
    const currentPace = elapsedDays > 0 ? paceBase / elapsedDays : 0;

    if (isAvgKPI) {
      // Treat average target as total target over 7 days
      const projectedTotal =
        paceBase +
        currentPace * remainingDays +
        arr
          .slice(elapsedDays)
          .reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
      const projectedAvg = projectedTotal / 7;
      return Math.min(100, Math.max(0, (projectedAvg / target) * 100));
    } else {
      const projectedTotal =
        paceBase +
        currentPace * remainingDays +
        arr
          .slice(elapsedDays)
          .reduce((s, n) => s + (Number.isFinite(n) ? Number(n) : 0), 0);
      return Math.min(100, Math.max(0, (projectedTotal / target) * 100));
    }
  } catch {
    // Fallback without daily breakdown
    if (elapsedDays === 0) {
      return Math.min(100, (currentSum / target) * 100);
    }
    const currentPace = currentSum / elapsedDays;
    const projectedTotal = currentSum + currentPace * remainingDays;
    return Math.min(100, Math.max(0, (projectedTotal / target) * 100));
  }
};

// Get KPI status based on progress
export const getKPIStatus = async (
  kpiId: string,
  actualValue: number,
  weekKey?: string,
): Promise<"excellent" | "good" | "fair" | "poor"> => {
  const progress = await calculateKPIProgress(kpiId, actualValue, weekKey);

  if (progress >= 100) return "excellent";
  if (progress >= 80) return "good";
  if (progress >= 50) return "fair";
  return "poor";
};

// Calculate overall week completion percentage
export const calculateWeekCompletion = async (
  values: WeeklyKPIValues,
  weekKey?: string,
): Promise<number> => {
  try {
    const { kpiManager } = await import("./configurableKpis");
    const kpis = await kpiManager.getActiveKPIs();
    let weighted = 0;
    let totalWeight = 0;
    for (const kpi of kpis) {
      const val = values[kpi.kpi_id] || 0;
      const progress = await calculateKPIProgress(kpi.kpi_id, val, weekKey);
      const weight =
        typeof kpi.weight === "number" && kpi.weight >= 0 ? kpi.weight : 1;
      if (weight > 0) {
        weighted += progress * weight;
        totalWeight += weight;
      }
    }
    return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  } catch {
    // Fallback to equal weights using static definitions
    const totalKPIs = WEEKLY_KPI_DEFINITIONS.length;
    let totalProgress = 0;
    for (const kpi of WEEKLY_KPI_DEFINITIONS) {
      const value = values[kpi.id] || 0;
      const progress = await calculateKPIProgress(kpi.id, value, weekKey);
      totalProgress += progress;
    }
    return Math.round(totalProgress / totalKPIs);
  }
};

// Supabase integration functions
export const loadWeeklyKPIsFromSupabase = async (
  userId: string,
): Promise<WeeklyKPIData | null> => {
  try {
    const { data, error } = await supabase
      .from("weekly_kpis")
      .select("*")
      .eq("user_id", userId)
      .order("week_key", { ascending: true });

    if (error) {
      console.error("❌ Error loading weekly KPIs from Supabase:", error);
      return null;
    }

    // loaded records count (silenced)

    const records: WeeklyKPIRecord[] = (data || []).map((row) => ({
      weekKey: row.week_key,
      values:
        row.data &&
        typeof row.data === "object" &&
        !Array.isArray(row.data) &&
        row.data.values
          ? row.data.values
          : row.data || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      daily: row.data && row.data.__daily ? row.data.__daily : undefined,
      dailyByDate:
        row.data && row.data.__dailyByDate ? row.data.__dailyByDate : undefined,
    }));

    return { records };
  } catch (error) {
    console.error("❌ Failed to load weekly KPIs from Supabase:", error);
    return null;
  }
};

export const saveWeeklyKPIsToSupabase = async (
  data: WeeklyKPIData,
  userId: string,
): Promise<void> => {
  try {
    // Prepare records for upsert
    const upsertData = data.records.map((record) => ({
      user_id: userId,
      week_key: record.weekKey,
      // Store values and embed daily breakdowns for compatibility and exact dates
      data: {
        values: record.values,
        __daily: record.daily || {},
        __dailyByDate: record.dailyByDate || {},
      },
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }));

    const { error } = await supabase.from("weekly_kpis").upsert(upsertData, {
      onConflict: "user_id,week_key",
    });

    if (error) {
      console.error("Error saving weekly KPIs to Supabase:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to save weekly KPIs to Supabase:", error);
    throw error;
  }
};

// Get recent weeks for trend analysis
export const getRecentWeeks = (count: number = 6): string[] => {
  const weeks: string[] = [];
  const currentDate = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - i * 7);
    weeks.push(getWeekKey(date));
  }

  return weeks.reverse(); // Return in chronological order
};

// Types are already exported above

// Load per-date entries for a week and merge into local weekly record
export const loadWeeklyEntriesForWeek = async (
  weekKey: string,
): Promise<void> => {
  try {
    const userId = userStorage.getCurrentUserId();
    // loading entries for week (silenced)

    if (!userId) {
      console.warn("⚠️ No user ID available for loadWeeklyEntriesForWeek");
      return;
    }

    const { data, error } = await supabase
      .from("weekly_kpi_entries")
      .select("date,kpi_id,value")
      .eq("user_id", userId)
      .eq("week_key", weekKey);

    if (error) {
      console.error("❌ Failed to load weekly_kpi_entries:", error);
      return;
    }

    // loaded entries count (silenced)

    const store = loadWeeklyKPIs();
    const now = new Date().toISOString();
    let record = store.records.find((r) => r.weekKey === weekKey);
    if (!record) {
      record = {
        weekKey,
        values: {},
        createdAt: now,
        updatedAt: now,
        dailyByDate: {},
        daily: {},
      };
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
    Object.values(record.dailyByDate).forEach((map) => {
      Object.keys(map || {}).forEach((k) => allKpiIds.add(k));
    });

    if (!record.daily) record.daily = {};
    for (const kpiId of allKpiIds) {
      const arr = weekDates.map((d) => {
        const dayMap = record!.dailyByDate![d];
        return dayMap && Number.isFinite(Number(dayMap[kpiId]))
          ? Math.max(0, Number(dayMap[kpiId]))
          : 0;
      });
      record.daily[kpiId] = arr;
      const sum = arr.reduce(
        (s, n) => s + (Number.isFinite(n) ? Number(n) : 0),
        0,
      );
      // Only set values from daily entries if no value exists yet
      // This preserves manually-set totals from useWeeklyKPIs.updateValue()
      if (record.values[kpiId] === undefined || record.values[kpiId] === null) {
        record.values[kpiId] = sum;
      }
    }

    record.updatedAt = now;
    await saveWeeklyKPIs(store);
  } catch (err) {
    console.error("Error merging weekly entries:", err);
  }
};

/**
 * Update contentShipped KPI when content is created
 */
export const incrementContentShippedKPI = async (
  publishedDate?: string,
): Promise<void> => {
  try {
    const date = publishedDate ? new Date(publishedDate) : new Date();
    const weekKey = getWeekKey(date);
    const dayIndex = getDayIndexFromDate(date.toISOString().split("T")[0]);

    if (dayIndex >= 0 && dayIndex < 7) {
      // Get current daily values
      const currentDaily = getWeeklyDailyValues(weekKey, "contentShipped");
      const newValue = currentDaily[dayIndex] + 1;

      // Update the specific day
      await updateWeeklyDailyValue(
        weekKey,
        "contentShipped",
        dayIndex,
        newValue,
      );

      // contentShipped KPI incremented (silenced)
    }
  } catch (error) {
    console.error("Failed to update contentShipped KPI:", error);
  }
};

/**
 * Sync deep work hours from Noctisium data to weekly KPIs
 */
export const syncDeepWorkHours = async (): Promise<void> => {
  try {
    // Import the function here to avoid circular dependencies
    const { loadNoctisiumData } = await import("./storage");
    const noctisiumData = loadNoctisiumData();

    // Group completed deep work sessions by date
    const sessionsPerDate: Record<string, number> = {};

    noctisiumData.deepWorkSessions.forEach((session) => {
      if (
        !session.isActive &&
        session.durationMinutes &&
        session.durationMinutes > 0
      ) {
        const date = new Date(session.startTime).toISOString().split("T")[0]; // YYYY-MM-DD
        const hours = session.durationMinutes / 60;
        sessionsPerDate[date] = (sessionsPerDate[date] || 0) + hours;
      }
    });

    // Update KPI values for each date
    for (const [date, hours] of Object.entries(sessionsPerDate)) {
      const weekKey = getWeekKeyFromDate(date);
      const dayIndex = getDayIndexFromDate(date);

      if (dayIndex >= 0 && dayIndex < 7) {
        await updateWeeklyDailyValue(weekKey, "deepWorkHours", dayIndex, hours);
      }
    }
  } catch (error) {
    console.error("Failed to sync deep work hours:", error);
  }
};

/**
 * Get fiscal week key from date string (YYYY-MM-DD) using Sep 1 anchor
 */
const getWeekKeyFromDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return getWeekKey(date);
};

/**
 * Get day index within the fiscal week (0..6 relative to the week start)
 */
const getDayIndexFromDate = (dateStr: string): number => {
  const date = new Date(dateStr + "T00:00:00");
  const wk = getWeekKey(date);
  const { start } = getWeekDates(wk);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(
    (toMidnight(date).getTime() - toMidnight(start).getTime()) / msPerDay,
  );
};
