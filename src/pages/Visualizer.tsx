import React, { useState, useEffect, useMemo } from 'react';
import { loadData, predefinedMetrics } from '@/lib/storage';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import TypewriterText from '@/components/TypewriterText';
import { 
  HABIT_COLORS, HABIT_METRICS, computeRollingAverage, 
  prepareCumulativeHabitData 
} from '@/lib/chartUtils';
import { formatLocalDate, getCurrentLocalDate, parseLocalDate } from '@/lib/dateUtils';

// Period types for the selector
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

// Define chart data shape
type ChartData = { date: string; value: number; rollingAvg: number; };

const Visualizer = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [currentMetric, setCurrentMetric] = useState<typeof metrics[0] | null>(null);
  const [showAllHabits, setShowAllHabits] = useState<boolean>(false);
  
  // Memoize data loading to prevent infinite re-renders
  const data = useMemo(() => loadData(), []);
  const metrics = useMemo(() => 
    data.metrics.filter(m => predefinedMetrics.some(pm => pm.id === m.id)), 
    [data.metrics]
  );

  // Update currentMetric when selectedMetricId changes
  useEffect(() => {
    if (selectedMetricId) {
      const found = metrics.find(m => m.id === selectedMetricId) || null;
      setCurrentMetric(found);
      setShowAllHabits(false); // Hide all habits view when selecting a specific metric
    } else {
      setCurrentMetric(null);
    }
  }, [selectedMetricId]); // Removed metrics from dependency array

  // Get date range based on selected period
  const getDateRange = (period: PeriodType): [Date, Date] => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    return [startDate, endDate];
  };

  // Improved date formatting based on period
  const formatDateForPeriod = (dateStr: string, period: PeriodType): string => {
    // Use parseLocalDate to avoid timezone issues
    const date = parseLocalDate(dateStr);
    
    switch (period) {
      case 'week':
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      case 'quarter':
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      case 'year':
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  // Format date range for display
  const formatDateRange = (period: PeriodType): string => {
    const [startDate, endDate] = getDateRange(period);
    const options: Intl.DateTimeFormatOptions = period === 'year' 
      ? { year: 'numeric', month: 'short' }
      : { month: 'short', day: 'numeric', year: '2-digit' };
    
    return `${startDate.toLocaleDateString(undefined, options)} – ${endDate.toLocaleDateString(undefined, options)}`;
  };

  // Filter dates based on selected period
  const getFilteredDates = (period: PeriodType): string[] => {
    const [startDate, _] = getDateRange(period);
    const startDateStr = formatLocalDate(startDate);
    
    return data.dates.filter(date => date >= startDateStr).sort((a, b) => 
      a.localeCompare(b) // Use string comparison for YYYY-MM-DD format
    );
  };

  // Prepare chart data for a specific metric with rolling average
  const getChartData = (metricId: string): ChartData[] => {
    const filteredDates = getFilteredDates(selectedPeriod);
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return [];

    // Build numeric values array
    const valuesByDate = filteredDates.map(date => {
      const raw = metric.values[date];
      const num = raw !== undefined && raw !== '' ? parseFloat(raw as string) : 0;
      return isNaN(num) ? 0 : num;
    });

    // Compute rolling average with window size 4
    const rollingAvgs = computeRollingAverage(valuesByDate, 4);

    // Return chart data
    return filteredDates.map((date, idx) => ({
      date,
      value: valuesByDate[idx],
      rollingAvg: rollingAvgs[idx]
    }));
  };

  // Calculate better Y-axis domain for improved graph fitting
  const getYAxisDomain = (data: ChartData[], dataKeys: string[] = ['value', 'rollingAvg']): [number, number] => {
    if (!data || data.length === 0) return [0, 100];
    
    const allValues: number[] = [];
    data.forEach(item => {
      dataKeys.forEach(key => {
        const value = item[key as keyof ChartData];
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      });
    });
    
    if (allValues.length === 0) return [0, 100];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Add 10% padding to top and bottom for better visualization
    const range = max - min;
    const padding = Math.max(range * 0.1, 1); // At least 1 unit padding
    
    return [Math.max(0, min - padding), max + padding];
  };

  // Get cumulative habit data
  const getCumulativeHabitData = () => {
    const filteredDates = getFilteredDates(selectedPeriod);
    return prepareCumulativeHabitData(data, filteredDates);
  };

  // Calculate summary statistics for a metric
  const getMetricSummary = (metricId: string) => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return null;
    
    const filteredDates = getFilteredDates(selectedPeriod);
    const values = filteredDates
      .map(date => metric.values[date] ? parseFloat(metric.values[date] as string) : 0)
      .filter(v => !isNaN(v));
    
    if (values.length === 0) return null;
    
    // Calculate basic statistics
    const currentValue = values[values.length - 1];
    const previousValue = values.length > 1 ? values[0] : currentValue;
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const percentChange = previousValue !== 0 
      ? ((currentValue - previousValue) / previousValue * 100).toFixed(1)
      : 'N/A';
    
    return {
      current: currentValue.toFixed(1),
      previous: previousValue.toFixed(1),
      average: average.toFixed(1),
      percentChange
    };
  };

  // Render the habit streak progress chart
  const renderHabitStreakChart = () => {
    const cumulativeData = getCumulativeHabitData();
    
    return (
      <div>
        <h2 className="text-lg mb-2">Habit Streak Progress</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={cumulativeData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)"
                tickFormatter={(date) => formatDateForPeriod(date, selectedPeriod)}
                interval="preserveStartEnd"
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-panel)', 
                  border: '1px solid var(--line-faint)',
                  color: 'var(--text-main)'
                }}
                labelFormatter={(date) => formatDateForPeriod(date, selectedPeriod)}
              />
              <Legend />
              
              {/* Habit metrics as lines */}
              {HABIT_METRICS.map(metricId => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={HABIT_COLORS[metricId as keyof typeof HABIT_COLORS]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name={metrics.find(m => m.id === metricId)?.name || metricId}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Render the selected metric chart with rolling average
  const renderMetricChart = (metricId: string) => {
    const metric = metrics.find(m => m.id === metricId);
    
    if (!metric) {
      return <div className="text-center p-4">No data available for this metric</div>;
    }
    
    // Check if this is a habit metric (should show cumulative) or a regular metric (show with rolling avg)
    const isHabitMetric = HABIT_METRICS.includes(metricId);
    
    if (isHabitMetric) {
      // For habit metrics, show cumulative progress like in the All Habits view
      const filteredDates = getFilteredDates(selectedPeriod);
      
      // Create cumulative data for just this one habit
      let cumulativeCount = 0;
      const cumulativeData = filteredDates.map(date => {
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
        cumulativeCount += value;
        
        return {
          date,
          [metricId]: cumulativeCount
        };
      });
      
      return (
        <div>
          <h2 className="text-lg mb-1">{metric.name} (Cumulative)</h2>
          <div className="text-sm text-terminal-accent/70 mb-2">{formatDateRange(selectedPeriod)}</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={cumulativeData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)"
                  tickFormatter={(date) => formatDateForPeriod(date, selectedPeriod)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-panel)', 
                    border: '1px solid var(--line-faint)',
                    color: 'var(--text-main)'
                  }}
                  labelFormatter={(date) => formatDateForPeriod(date, selectedPeriod)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey={metricId} 
                  stroke={HABIT_COLORS[metricId as keyof typeof HABIT_COLORS] || "var(--accent-cyan)"} 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name={`${metric.name} (Cumulative)`} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    } else {
      // For non-habit metrics, show daily values with rolling average
      const chartData = getChartData(metricId);
      
      if (chartData.length === 0) {
        return <div className="text-center p-4">No data available for this metric</div>;
      }
      
      return (
        <div>
          <h2 className="text-lg mb-1">{metric.name}</h2>
          <div className="text-sm text-terminal-accent/70 mb-2">{formatDateRange(selectedPeriod)}</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)"
                  tickFormatter={(date) => formatDateForPeriod(date, selectedPeriod)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  domain={getYAxisDomain(chartData)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-panel)', 
                    border: '1px solid var(--line-faint)',
                    color: 'var(--text-main)'
                  }}
                  labelFormatter={(date) => formatDateForPeriod(date, selectedPeriod)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--accent-cyan)" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--accent-cyan)', stroke: 'none' }} 
                  name="Daily Value" 
                />
                <Line 
                  type="monotone" 
                  dataKey="rollingAvg" 
                  stroke="var(--accent-sprint)" 
                  strokeWidth={1.5}
                  strokeDasharray="5 5" 
                  dot={{ r: 0 }} 
                  name="4-Day Avg" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
  };

  // Render the main visualization
  const renderVisualization = () => {
    if (showAllHabits) {
      return renderHabitStreakChart();
    } else if (selectedMetricId) {
      return renderMetricChart(selectedMetricId);
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-terminal-accent/70">
          <p>Select a metric or view all habits</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact header section */}
      <div className="mb-4">
        <TypewriterText text="Metrics Visualizer" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm mb-3">Analyze sprint performance and trends.</p>
        
        {/* Compact controls in a single row */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-accent/70">Period:</span>
            {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((period) => (
              <button
                key={period}
                className={`px-2 py-1 text-xs border border-terminal-accent/30 transition-colors ${
                  selectedPeriod === period 
                    ? 'bg-terminal-accent text-terminal-bg' 
                    : 'hover:border-terminal-accent/50'
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          {/* View selector */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-accent/70">View:</span>
            <button
              className={`px-2 py-1 text-xs border border-terminal-accent/30 transition-colors ${
                showAllHabits 
                  ? 'bg-terminal-accent text-terminal-bg' 
                  : 'hover:border-terminal-accent/50'
              }`}
              onClick={() => {
                setShowAllHabits(true);
                setSelectedMetricId(null);
              }}
            >
              All Habits
            </button>
          </div>
          
          {/* Date range display */}
          <div className="text-terminal-accent/50 text-xs ml-auto">
            {formatDateRange(selectedPeriod)}
          </div>
        </div>
        
        {/* Compact metric selector - smaller buttons in tighter grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1 mb-4">
          {metrics.map(metric => (
            <button 
              key={metric.id}
              className={`px-2 py-1 text-xs border border-terminal-accent/30 text-left truncate transition-colors ${
                selectedMetricId === metric.id 
                  ? 'bg-terminal-accent text-terminal-bg' 
                  : 'hover:border-terminal-accent/50'
              }`}
              onClick={() => {
                setSelectedMetricId(metric.id);
                setShowAllHabits(false);
              }}
              title={metric.name} // Show full name on hover
            >
              {metric.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main visualization area - now takes up more space */}
      <div className="flex-1 border border-terminal-accent/30 p-4 bg-terminal-bg/30 overflow-y-auto">
        <div className="mb-3">
          <h1 className="text-lg mb-1">
            {showAllHabits ? 'Habit Progress' : selectedMetricId ? metrics.find(m => m.id === selectedMetricId)?.name : 'Select a Metric'}
          </h1>
          <div className="text-terminal-accent/70 text-xs">
            {formatDateRange(selectedPeriod)}
          </div>
        </div>
        
        {/* Chart area - larger and more prominent */}
        <div className="mb-4">
          {renderVisualization()}
        </div>
        
        {/* Summary table for selected metric - more compact */}
        {selectedMetricId && !showAllHabits && getMetricSummary(selectedMetricId) && (
          <div className="mb-4">
            <div className="text-sm mb-2 text-terminal-accent">Summary Statistics:</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="terminal-cell">Period</th>
                  <th className="terminal-cell">Value</th>
                  <th className="terminal-cell">Prev vs Curr</th>
                  <th className="terminal-cell">Δ (pct)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="terminal-cell">{selectedPeriod}</td>
                  <td className="terminal-cell">{getMetricSummary(selectedMetricId)?.current}</td>
                  <td className="terminal-cell">
                    {selectedPeriod} / {selectedPeriod === 'week' ? 'W-1' : 
                      selectedPeriod === 'month' ? 'M-1' : 
                      selectedPeriod === 'quarter' ? 'Q-1' : 'Y-1'}
                  </td>
                  <td className="terminal-cell">
                    <span 
                      className={
                        getMetricSummary(selectedMetricId)?.percentChange === 'N/A' ? '' :
                        parseFloat(getMetricSummary(selectedMetricId)?.percentChange || '0') > 0 ? 'text-green-400' : 
                        parseFloat(getMetricSummary(selectedMetricId)?.percentChange || '0') < 0 ? 'text-red-400' : ''
                      }
                    >
                      {getMetricSummary(selectedMetricId)?.percentChange === 'N/A' 
                        ? '–' 
                        : `${getMetricSummary(selectedMetricId)?.percentChange}%`}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Visualizer;
