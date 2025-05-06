/**
 * Storage abstraction module
 * 
 * This module provides an abstraction layer for data storage operations.
 * Currently it uses localStorage, but can be extended to use other storage methods.
 */

import { supabase } from './supabase';

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

// Use a fixed Supabase user ID for all sync operations
const FIXED_USER_ID = '<YOUR-UUID>';

/**
 * Load all metrics from Supabase (falls back to localStorage)
 */
export async function loadMetrics(): Promise<TrackerData> {
  try {
    const { data, error } = await supabase
      .from('metrics')
      .select('date, data')
      .eq('user_id', FIXED_USER_ID)
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
  // First, write to localStorage
  saveData(trackerData);
  try {
    const entries = trackerData.dates.map((date) => {
      const payload: Record<string, string | number | boolean> = {};
      trackerData.metrics.forEach((metric) => {
        payload[metric.id] = metric.values[date] ?? null;
      });
      return { user_id: FIXED_USER_ID, date, data: payload };
    });
    const { error } = await supabase
      .from('metrics')
      .upsert(entries, { onConflict: 'user_id,date' });
    if (error) console.error('Supabase upsert failed', error);
  } catch (e) {
    console.error('Failed to save metrics to Supabase:', e);
  }
}
