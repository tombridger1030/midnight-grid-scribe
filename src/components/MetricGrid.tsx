import React, { useState, useEffect } from 'react';
import { loadData, saveData, MetricData, TrackerData, predefinedMetrics } from '@/lib/storage';
import { useDate } from '@/contexts/DateContext';
import { useToast } from '@/components/ui/use-toast';
import SparkLine from './SparkLine';

interface MetricGridProps {
  onAddDay: () => void;
}

const MetricGrid: React.FC<MetricGridProps> = ({ onAddDay }) => {
  const [data, setData] = useState<TrackerData>({ metrics: [], dates: [] });
  const { toast } = useToast();
  const { currentDate } = useDate();

  // Load data on component mount
  useEffect(() => {
    const storedData = loadData();
    setData(storedData);
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Filter metrics to only those still in predefinedMetrics
  const validMetricIds = predefinedMetrics.map(m => m.id);
  const metricsToShow = data.metrics.filter(m => validMetricIds.includes(m.id));

  // If currentDate isn't tracked, show New Day prompt
  if (!data.dates.includes(currentDate)) {
    return (
      <div className="w-full text-center py-8">
        <p className="text-terminal-text/70">No entry for selected date. Add a day to start tracking.</p>
        <div className="mt-4">
          <button className="terminal-button" onClick={onAddDay}>
            New Day
          </button>
        </div>
      </div>
    );
  }

  // Handle cell value changes
  const handleCellChange = (metricId: string, date: string, value: string) => {
    setData(prevData => {
      const updatedMetrics = prevData.metrics.map(metric => {
        if (metric.id === metricId) {
          let processedValue: string | number | boolean = value;
          
          // Convert value based on metric type
          if (metric.type === 'number') {
            // allow decimals and store raw input
            processedValue = value;
          } else if (metric.type === 'boolean') {
            processedValue = value.toLowerCase() === 'true';
          }
          
          return {
            ...metric,
            values: {
              ...metric.values,
              [date]: processedValue
            }
          };
        }
        return metric;
      });

      return {
        ...prevData,
        metrics: updatedMetrics
      };
    });
  };

  // Extract values for spark line charts
  const getSparkLineData = (metric: MetricData): number[] => {
    if (!data.dates || data.dates.length === 0) return [];
    
    // Get the last 7 dates or fewer
    const recentDates = data.dates.slice(-7);
    
    return recentDates.map(date => {
      const value = metric.values[date];
      
      if (value === undefined || value === '') return NaN;
      if (typeof value === 'boolean') return value ? 1 : 0;
      return parseFloat(value.toString()) || 0;
    });
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Get cell input based on metric type (number, time, boolean, or text)
  const getCellInput = (metric: MetricData, date: string) => {
    const rawValue = metric.values[date];
    const valueStr = rawValue === undefined ? '' : rawValue.toString();
    const commonProps = {
      className: 'terminal-input text-center w-full',
      value: valueStr,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => handleCellChange(metric.id, date, e.target.value),
    };
    if (metric.type === 'boolean') {
      return (
        <select {...commonProps}>
          <option value=""></option>
          <option value="true">✓</option>
          <option value="false">✗</option>
        </select>
      );
    }
    if (metric.type === 'number') {
      return (
        <input type="number" step="any" {...commonProps} />
      );
    }
    if (metric.type === 'time') {
      return (
        <input type="time" {...commonProps} />
      );
    }
    // fallback to text
    return <input type="text" {...commonProps} />;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse min-w-full">
        <thead>
          <tr>
            <th className="terminal-cell w-48">Metric</th>
            <th className="terminal-cell text-center border-accent-pink" style={{ minWidth: '100px' }}>
              {currentDate}
            </th>
            <th className="terminal-cell w-24 text-center">Trend</th>
          </tr>
        </thead>
        <tbody>
          {metricsToShow.map(metric => (
            <tr key={metric.id}>
              <td className="terminal-cell">
                <div className="text-sm">{metric.name}</div>
                <div className="text-xs text-terminal-accent/50">{metric.type}</div>
              </td>
              <td className="terminal-cell text-center border-accent-pink">
                {getCellInput(metric, currentDate)}
              </td>
              <td className="terminal-cell">
                <SparkLine data={getSparkLineData(metric)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MetricGrid;
