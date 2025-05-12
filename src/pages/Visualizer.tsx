import React, { useState, useEffect } from 'react';
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

// Period types for the selector
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

// Define chart data shape
type ChartData = { date: string; value: number; rollingAvg: number; };

const Visualizer = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [currentMetric, setCurrentMetric] = useState<typeof metrics[0] | null>(null);
  const [showAllHabits, setShowAllHabits] = useState<boolean>(false);
  
  const data = loadData();
  const metrics = data.metrics.filter(m => predefinedMetrics.some(pm => pm.id === m.id));

  // Update currentMetric when selectedMetricId changes
  useEffect(() => {
    if (selectedMetricId) {
      const found = metrics.find(m => m.id === selectedMetricId) || null;
      setCurrentMetric(found);
      setShowAllHabits(false); // Hide all habits view when selecting a specific metric
    } else {
      setCurrentMetric(null);
    }
  }, [selectedMetricId, metrics]);

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

  // Format date range for display
  const formatDateRange = (period: PeriodType): string => {
    const [startDate, endDate] = getDateRange(period);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  // Filter dates based on selected period
  const getFilteredDates = (period: PeriodType): string[] => {
    const [startDate, _] = getDateRange(period);
    return data.dates.filter(date => new Date(date) >= startDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
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
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={cumulativeData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)"
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-panel)', 
                  border: '1px solid var(--line-faint)',
                  color: 'var(--text-main)'
                }}
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
      
      // Format the dates for display
      const startDate = new Date(filteredDates[0]);
      const endDate = new Date(filteredDates[filteredDates.length - 1]);
      const dateRange = `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
      
      return (
        <div>
          <h2 className="text-lg mb-1">{metric.name} (Cumulative)</h2>
          <div className="text-sm text-terminal-accent/70 mb-2">{dateRange}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={cumulativeData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)"
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
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
      
      // Format the dates for display
      const startDate = new Date(chartData[0].date);
      const endDate = new Date(chartData[chartData.length - 1].date);
      const dateRange = `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
      
      return (
        <div>
          <h2 className="text-lg mb-1">{metric.name}</h2>
          <div className="text-sm text-terminal-accent/70 mb-2">{dateRange}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)"
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  domain={['dataMin', 'dataMax']} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-panel)', 
                    border: '1px solid var(--line-faint)',
                    color: 'var(--text-main)'
                  }}
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
      <div className="mb-6">
        <TypewriterText text="Metrics Visualizer" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm mb-4">Analyze sprint performance and trends.</p>
        
        {/* Period selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="text-sm mr-2">Period:</div>
          {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((period) => (
            <button
              key={period}
              className={`terminal-button ${selectedPeriod === period ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setSelectedPeriod(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
          <span className="text-terminal-accent/70 text-sm ml-2">
            {formatDateRange(selectedPeriod)}
          </span>
        </div>
        
        {/* View selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="text-sm mr-2">View:</div>
          <button
            className={`terminal-button ${showAllHabits ? 'bg-terminal-accent text-terminal-bg' : ''}`}
            onClick={() => {
              setShowAllHabits(true);
              setSelectedMetricId(null);
            }}
          >
            All Habits
          </button>
          {selectedMetricId && (
            <span className="text-terminal-accent/70 text-sm ml-2">
              or select a metric below
            </span>
          )}
        </div>
        
        {/* Metric selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
          {metrics.map(metric => (
            <button 
              key={metric.id}
              className={`terminal-button text-left overflow-hidden overflow-ellipsis whitespace-nowrap ${selectedMetricId === metric.id ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => {
                setSelectedMetricId(metric.id);
                setShowAllHabits(false);
              }}
            >
              {metric.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Visualization area */}
      <div className="flex-1 border border-terminal-accent/30 p-4 bg-terminal-bg/30 overflow-y-auto">
        <div className="mb-4">
          <h1 className="text-lg mb-1">
            {showAllHabits ? 'Habit Progress' : selectedMetricId ? metrics.find(m => m.id === selectedMetricId)?.name : 'Select a Metric'}
          </h1>
          <div className="text-terminal-accent/70 text-xs">
            {formatDateRange(selectedPeriod)}
          </div>
        </div>
        
        {/* Chart area */}
        <div className="mb-6">
          {renderVisualization()}
        </div>
        
        {/* Summary table for selected metric */}
        {selectedMetricId && !showAllHabits && getMetricSummary(selectedMetricId) && (
          <div className="mb-4">
            <div className="text-sm mb-2 text-terminal-accent">Summary Statistics:</div>
            <table className="w-full border-collapse">
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
