
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
    let row = [metric.name];
    data.dates.forEach(date => {
      const value = metric.values[date] !== undefined ? metric.values[date] : "";
      row.push(value.toString());
    });
    csv += row.join(",") + "\n";
  });
  
  const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "midnight-tracker-data.csv");
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
      
      const metric: MetricData = {
        id: `csv-import-${i}-${Date.now()}`, // Generate a unique ID
        name: metricName,
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

// To be implemented when migrating to Supabase
// export const initSupabase = () => {
//   // Initialize Supabase client
//   // Replace localStorage operations with Supabase operations
// };
