
import React, { useState, useEffect } from 'react';
import { loadData, saveData, MetricData, TrackerData, exportData } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import SparkLine from './SparkLine';

interface MetricGridProps {
  onAddMetric: () => void;
  onAddDay: () => void;
}

const MetricGrid: React.FC<MetricGridProps> = ({ onAddMetric, onAddDay }) => {
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
          return {
            ...metric,
            values: {
              ...metric.values,
              [date]: value
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

  // Handle metric name changes
  const handleMetricNameChange = (metricId: string, newName: string) => {
    setData(prevData => {
      const updatedMetrics = prevData.metrics.map(metric => {
        if (metric.id === metricId) {
          return {
            ...metric,
            name: newName
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

  // Handle delete metric
  const handleDeleteMetric = (metricId: string) => {
    setData(prevData => {
      const updatedMetrics = prevData.metrics.filter(metric => metric.id !== metricId);
      return {
        ...prevData,
        metrics: updatedMetrics
      };
    });
    
    toast({
      title: "Metric deleted",
      description: "The metric has been removed from your tracker."
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
      return parseFloat(value as string) || 0;
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

  return (
    <div className="w-full overflow-x-auto">
      {data.metrics.length === 0 && data.dates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-terminal-text/70">No data yet. Add some metrics and days to start tracking.</p>
          <div className="mt-4 space-x-4">
            <button 
              className="terminal-button" 
              onClick={onAddMetric}
            >
              Add Metric
            </button>
            <button 
              className="terminal-button" 
              onClick={onAddDay}
            >
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
                  <div className="flex items-center">
                    <input
                      type="text"
                      className="terminal-input"
                      value={metric.name}
                      onChange={(e) => handleMetricNameChange(metric.id, e.target.value)}
                    />
                    <button 
                      className="ml-2 px-1 text-terminal-accent hover:text-terminal-text" 
                      onClick={() => handleDeleteMetric(metric.id)}
                    >
                      ×
                    </button>
                  </div>
                </td>
                {data.dates.map(date => (
                  <td key={`${metric.id}-${date}`} className="terminal-cell text-center">
                    <input
                      type="text"
                      className="terminal-input text-center"
                      value={metric.values[date] || ''}
                      onChange={(e) => handleCellChange(metric.id, date, e.target.value)}
                    />
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
