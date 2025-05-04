
/**
 * Storage abstraction module
 * 
 * This module provides an abstraction layer for data storage operations.
 * Currently it uses localStorage, but can be extended to use other storage methods.
 */

export interface MetricData {
  id: string;
  name: string;
  values: Record<string, string | number>;
}

export interface TrackerData {
  metrics: MetricData[];
  dates: string[];
}

const STORAGE_KEY = 'midnight-tracker-data';

// Initial data structure
const initialData: TrackerData = {
  metrics: [],
  dates: []
};

/**
 * Load data from storage
 */
export const loadData = (): TrackerData => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return initialData;
    return JSON.parse(storedData);
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
  downloadAnchorNode.setAttribute("download", "midnight-tracker-data.json");
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

// To be implemented when migrating to Supabase
// export const initSupabase = () => {
//   // Initialize Supabase client
//   // Replace localStorage operations with Supabase operations
// };
