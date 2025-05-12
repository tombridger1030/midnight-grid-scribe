import { MetricData, TrackerData } from './storage';

// Define the habit metrics we want to track
export const HABIT_METRICS = [
  'jiuJitsuSessions',
  'weightliftingSessions',
  'coldShower',
  'noDopamine',
  'readingHours'
];

// Define accent colors for each habit metric
export const HABIT_COLORS = {
  jiuJitsuSessions: 'var(--accent-red)',
  weightliftingSessions: 'var(--accent-orange)',
  coldShower: 'var(--accent-cyan)',
  noDopamine: 'var(--accent-amber)',
  readingHours: 'var(--accent-sprint)'
};

// Interface for stacked chart data
export interface StackedChartData {
  date: string;
  [key: string]: string | number | boolean;
  rollingAvg?: number;
}

/**
 * Compute a rolling average for a series of values
 */
export function computeRollingAverage(values: number[], windowSize: number = 4): number[] {
  if (!values || values.length === 0) return [];
  
  return values.map((_, index) => {
    // For each position, take up to windowSize previous values (including current)
    const startIdx = Math.max(0, index - windowSize + 1);
    const window = values.slice(startIdx, index + 1);
    
    // Calculate average of the window
    const sum = window.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
    return window.length > 0 ? sum / window.length : 0;
  });
}

/**
 * Prepare stacked chart data from tracker data
 */
export function prepareStackedChartData(
  data: TrackerData,
  dates: string[],
  otherMetricId: string | null = null
): StackedChartData[] {
  // Filter metrics to only include habit metrics and the "other" metric
  const habitMetrics = data.metrics.filter(m => 
    HABIT_METRICS.includes(m.id) || m.id === otherMetricId
  );
  
  // Create a map of metric ID to metric data for easy access
  const metricsMap = habitMetrics.reduce((acc, metric) => {
    acc[metric.id] = metric;
    return acc;
  }, {} as Record<string, MetricData>);
  
  // Process each date
  return dates.map((date, dateIndex) => {
    // Start with the date
    const chartDataPoint: StackedChartData = { date };
    
    // Add each habit metric value
    HABIT_METRICS.forEach(metricId => {
      const metric = metricsMap[metricId];
      if (metric) {
        const rawValue = metric.values[date];
        // Convert to number (0 if undefined, empty, or NaN)
        let value = 0;
        if (rawValue !== undefined && rawValue !== '') {
          if (metric.type === 'boolean') {
            value = rawValue === true ? 1 : 0;
          } else {
            value = parseFloat(rawValue.toString());
            if (isNaN(value)) value = 0;
          }
        }
        chartDataPoint[metricId] = value;
      } else {
        chartDataPoint[metricId] = 0;
      }
    });
    
    // Add the "other" metric with rolling average if specified
    if (otherMetricId && metricsMap[otherMetricId]) {
      const otherMetric = metricsMap[otherMetricId];
      
      // Get all values for the other metric
      const otherValues = dates.map(d => {
        const rawValue = otherMetric.values[d];
        if (rawValue === undefined || rawValue === '') return 0;
        const numValue = parseFloat(rawValue.toString());
        return isNaN(numValue) ? 0 : numValue;
      });
      
      // Compute rolling average
      const rollingAvgs = computeRollingAverage(otherValues, 4);
      
      // Add both the raw value and rolling average
      const rawValue = otherMetric.values[date];
      chartDataPoint[otherMetricId] = rawValue !== undefined && rawValue !== '' 
        ? parseFloat(rawValue.toString()) || 0 
        : 0;
      chartDataPoint.rollingAvg = rollingAvgs[dateIndex];
    }
    
    return chartDataPoint;
  });
}

/**
 * Get last N days of data for a specific metric
 */
export function getLastNDays(
  data: TrackerData,
  metricId: string,
  n: number
): { dates: string[]; values: number[] } {
  const metric = data.metrics.find(m => m.id === metricId);
  if (!metric) return { dates: [], values: [] };
  
  // Sort dates in ascending order and take the last N
  const sortedDates = [...data.dates].sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );
  const lastNDates = sortedDates.slice(-n);
  
  // Extract values for these dates
  const values = lastNDates.map(date => {
    const rawValue = metric.values[date];
    if (rawValue === undefined || rawValue === '') return 0;
    if (metric.type === 'boolean') return rawValue === true ? 1 : 0;
    const numValue = parseFloat(rawValue.toString());
    return isNaN(numValue) ? 0 : numValue;
  });
  
  return { dates: lastNDates, values };
}

/**
 * Get data for a cumulative habit spark line
 */
export function getStackedSparkData(
  data: TrackerData,
  n: number = 7
): { dates: string[]; habitData: Record<string, number[]>; otherData?: { id: string; values: number[]; rollingAvg: number[] } } {
  // Sort dates in ascending order and take the last N
  const sortedDates = [...data.dates].sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );
  const lastNDates = sortedDates.slice(-n);
  
  // Initialize habit data structure
  const habitData: Record<string, number[]> = {};
  HABIT_METRICS.forEach(metricId => {
    habitData[metricId] = [];
  });
  
  // Find a suitable "other" metric (first numeric non-habit metric)
  const otherMetric = data.metrics.find(m => 
    !HABIT_METRICS.includes(m.id) && m.type === 'number'
  );
  
  let otherData: { id: string; values: number[]; rollingAvg: number[] } | undefined;
  
  if (otherMetric) {
    const otherValues = lastNDates.map(date => {
      const rawValue = otherMetric.values[date];
      if (rawValue === undefined || rawValue === '') return 0;
      const numValue = parseFloat(rawValue.toString());
      return isNaN(numValue) ? 0 : numValue;
    });
    
    otherData = {
      id: otherMetric.id,
      values: otherValues,
      rollingAvg: computeRollingAverage(otherValues, 4)
    };
  }
  
  // Track cumulative counts for each habit
  const cumulativeCounts: Record<string, number> = {};
  HABIT_METRICS.forEach(metricId => {
    cumulativeCounts[metricId] = 0;
  });
  
  // Fill in habit data with cumulative values
  HABIT_METRICS.forEach(metricId => {
    const metric = data.metrics.find(m => m.id === metricId);
    habitData[metricId] = [];
    
    if (metric) {
      lastNDates.forEach(date => {
        const rawValue = metric.values[date];
        let value = 0;
        if (rawValue !== undefined && rawValue !== '') {
          if (metric.type === 'boolean') {
            value = rawValue === true ? 1 : 0;
          } else {
            value = parseFloat(rawValue.toString());
            if (isNaN(value)) value = 0;
          }
        }
        
        // Add to cumulative count
        cumulativeCounts[metricId] += value;
        
        // Store cumulative value
        habitData[metricId].push(cumulativeCounts[metricId]);
      });
    } else {
      // If metric doesn't exist, fill with zeros
      habitData[metricId] = new Array(lastNDates.length).fill(0);
    }
  });
  
  return { dates: lastNDates, habitData, otherData };
}

/**
 * Prepare cumulative habit data from tracker data
 * This adds up habit completions over time to show progress
 */
export function prepareCumulativeHabitData(
  data: TrackerData,
  dates: string[]
): StackedChartData[] {
  // Filter metrics to only include habit metrics
  const habitMetrics = data.metrics.filter(m => 
    HABIT_METRICS.includes(m.id)
  );
  
  // Create a map of metric ID to metric data for easy access
  const metricsMap = habitMetrics.reduce((acc, metric) => {
    acc[metric.id] = metric;
    return acc;
  }, {} as Record<string, MetricData>);
  
  // Track cumulative counts for each habit
  const cumulativeCounts: Record<string, number> = {};
  HABIT_METRICS.forEach(metricId => {
    cumulativeCounts[metricId] = 0;
  });
  
  // Process each date in sequence
  return dates.map(date => {
    // Start with the date
    const chartDataPoint: StackedChartData = { date };
    
    // Add each habit metric value as a cumulative count
    HABIT_METRICS.forEach(metricId => {
      const metric = metricsMap[metricId];
      if (metric) {
        const rawValue = metric.values[date];
        // Convert to number (0 if undefined, empty, or NaN)
        let value = 0;
        if (rawValue !== undefined && rawValue !== '') {
          if (metric.type === 'boolean') {
            value = rawValue === true ? 1 : 0;
          } else {
            value = parseFloat(rawValue.toString());
            if (isNaN(value)) value = 0;
          }
        }
        
        // Add to cumulative count
        cumulativeCounts[metricId] += value;
        
        // Store cumulative value
        chartDataPoint[metricId] = cumulativeCounts[metricId];
      } else {
        chartDataPoint[metricId] = cumulativeCounts[metricId];
      }
    });
    
    return chartDataPoint;
  });
} 