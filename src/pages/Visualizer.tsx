
import React, { useState } from 'react';
import { loadData } from '@/lib/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TypewriterText from '@/components/TypewriterText';

// Period types for the selector
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

const Visualizer = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  
  const data = loadData();
  const metrics = data.metrics;

  // Get date range based on selected period
  const getDateRange = (period: PeriodType): [Date, Date] => {
    const endDate = new Date();
    let startDate = new Date();
    
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
    return data.dates.filter(date => new Date(date) >= startDate);
  };

  // Prepare chart data for a specific metric
  const getChartData = (metricId: string): any[] => {
    const filteredDates = getFilteredDates(selectedPeriod);
    const metric = metrics.find(m => m.id === metricId);
    
    if (!metric) return [];
    
    return filteredDates.map(date => {
      const value = metric.values[date] ? parseFloat(metric.values[date] as string) : 0;
      return {
        date,
        value,
        // You would calculate rolling average here, but for simplicity we're using a placeholder
        rollingAvg: value * 0.9 + Math.random() * 0.2 * value
      };
    });
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

  // Is the metric boolean (only 0/1 values)?
  const isMetricBoolean = (metricId: string): boolean => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return false;
    
    const uniqueValues = new Set();
    Object.values(metric.values).forEach(v => {
      if (v !== '' && v !== undefined) uniqueValues.add(Number(v));
    });
    
    return uniqueValues.size <= 2 && 
      ![...uniqueValues].some(v => v !== 0 && v !== 1);
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
        
        {/* Metric selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
          {metrics.map(metric => (
            <button 
              key={metric.id}
              className={`terminal-button text-left overflow-hidden overflow-ellipsis whitespace-nowrap ${selectedMetricId === metric.id ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setSelectedMetricId(metric.id)}
            >
              {metric.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Visualization area */}
      {selectedMetricId && (
        <div className="flex-1 border border-terminal-accent/30 p-4 bg-terminal-bg/30">
          <div className="mb-4">
            <TypewriterText 
              text={`${metrics.find(m => m.id === selectedMetricId)?.name || 'Metric'} (${selectedPeriod})`}
              className="text-lg mb-1"
              delay={30}
            />
            <div className="text-terminal-accent/70 text-xs">
              {formatDateRange(selectedPeriod)}
            </div>
          </div>
          
          {/* Chart area */}
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getChartData(selectedMetricId)}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888888"
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                />
                <YAxis stroke="#888888" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#2E2E2E', 
                    border: '1px solid #888888',
                    color: '#CFCFCF'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00FF00" 
                  strokeWidth={2}
                  dot={{ r: 3 }} 
                  name="Actual" 
                />
                <Line 
                  type="monotone" 
                  dataKey="rollingAvg" 
                  stroke="#00FFFF" 
                  strokeWidth={1.5}
                  strokeDasharray="5 5" 
                  dot={{ r: 0 }} 
                  name="Trend" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary table */}
          {getMetricSummary(selectedMetricId) && (
            <div className="mb-4">
              <div className="text-sm mb-2 text-terminal-accent">Summary Statistics:</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="terminal-cell">Period</th>
                    <th className="terminal-cell">Value</th>
                    <th className="terminal-cell">Previous</th>
                    <th className="terminal-cell">Δ Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="terminal-cell">{selectedPeriod}</td>
                    <td className="terminal-cell">{getMetricSummary(selectedMetricId)?.current}</td>
                    <td className="terminal-cell">{getMetricSummary(selectedMetricId)?.previous}</td>
                    <td className="terminal-cell">
                      <span 
                        className={
                          getMetricSummary(selectedMetricId)?.percentChange === 'N/A' ? '' :
                          parseFloat(getMetricSummary(selectedMetricId)?.percentChange || '0') > 0 ? 'text-green-400' : 
                          parseFloat(getMetricSummary(selectedMetricId)?.percentChange || '0') < 0 ? 'text-red-400' : ''
                        }
                      >
                        {getMetricSummary(selectedMetricId)?.percentChange !== 'N/A' ? 
                          `${getMetricSummary(selectedMetricId)?.percentChange}%` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Boolean metrics visualization - basic implementation */}
          {isMetricBoolean(selectedMetricId) && (
            <div className="mb-4">
              <div className="text-sm mb-2 text-terminal-accent">Habit Tracking:</div>
              <div className="flex flex-wrap gap-1">
                {getFilteredDates(selectedPeriod).map(date => {
                  const metric = metrics.find(m => m.id === selectedMetricId);
                  const value = metric?.values[date] ? Number(metric.values[date]) : 0;
                  
                  return (
                    <div 
                      key={date} 
                      className={`w-6 h-6 border border-terminal-accent flex items-center justify-center text-xs ${
                        value ? 'bg-green-800/40' : 'bg-terminal-bg'
                      }`}
                      title={`${date}: ${value ? 'Done' : 'Not done'}`}
                    >
                      {value ? '✓' : '·'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!selectedMetricId && (
        <div className="flex-1 flex items-center justify-center text-terminal-accent/70">
          Select a metric to visualize data
        </div>
      )}
    </div>
  );
};

export default Visualizer;
