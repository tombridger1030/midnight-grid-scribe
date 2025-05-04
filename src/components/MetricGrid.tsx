
import React, { useState, useEffect } from 'react';
import { loadData, saveData, MetricData, TrackerData } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import SparkLine from './SparkLine';

interface MetricGridProps {
  onAddDay: () => void;
}

const MetricGrid: React.FC<MetricGridProps> = ({ onAddDay }) => {
  const [data, setData] = useState<TrackerData>({ metrics: [], dates: [] });
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    const storedData = loadData();
    setData(storedData);
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Handle cell value changes
  const handleCellChange = (metricId: string, date: string, value: string) => {
    setData(prevData => {
      const updatedMetrics = prevData.metrics.map(metric => {
        if (metric.id === metricId) {
          let processedValue: string | number | boolean = value;
          
          // Convert value based on metric type
          if (metric.type === 'number') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              processedValue = numValue;
            } else if (value === '') {
              processedValue = '';
            }
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

  // Get cell input type based on metric type
  const getCellInput = (metric: MetricData, date: string) => {
    const value = metric.values[date];
    
    if (metric.type === 'boolean') {
      return (
        <select
          className="terminal-input text-center w-full"
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(e) => handleCellChange(metric.id, date, e.target.value)}
        >
          <option value=""></option>
          <option value="true">✓</option>
          <option value="false">✗</option>
        </select>
      );
    } else {
      return (
        <input
          type={metric.type === 'number' ? 'text' : 'text'}
          className="terminal-input text-center w-full"
          value={value !== undefined ? value.toString() : ''}
          onChange={(e) => handleCellChange(metric.id, date, e.target.value)}
        />
      );
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      {data.metrics.length === 0 && data.dates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-terminal-text/70">No data yet. Add a day to start tracking.</p>
          <div className="mt-4">
            <button className="terminal-button" onClick={onAddDay}>
              New Day
            </button>
          </div>
        </div>
      ) : (
        <table className="w-full border-collapse min-w-full">
          <thead>
            <tr>
              <th className="terminal-cell w-48">Metric</th>
              {data.dates.map(date => (
                <th key={date} className="terminal-cell text-center" style={{ minWidth: '100px' }}>
                  {formatDate(date)}
                </th>
              ))}
              <th className="terminal-cell w-24 text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map(metric => (
              <tr key={metric.id}>
                <td className="terminal-cell">
                  <div className="text-sm">{metric.name}</div>
                  <div className="text-xs text-terminal-accent/50">{metric.type}</div>
                </td>
                {data.dates.map(date => (
                  <td key={`${metric.id}-${date}`} className="terminal-cell text-center">
                    {getCellInput(metric, date)}
                  </td>
                ))}
                <td className="terminal-cell">
                  <SparkLine data={getSparkLineData(metric)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MetricGrid;
