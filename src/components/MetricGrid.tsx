import React, { useState, useEffect } from 'react';
import { loadData, saveData, MetricData, TrackerData, predefinedMetrics, FIXED_USER_ID } from '@/lib/storage';
import { useDate } from '@/contexts/DateContext';
import { useToast } from '@/components/ui/use-toast';
import SparkLine from './SparkLine';
import { supabase } from '@/lib/supabase';

// Sprint cycle configuration
const SPRINT_ON_DAYS = 21;
const SPRINT_OFF_DAYS = 7;
const SPRINT_CYCLE = SPRINT_ON_DAYS + SPRINT_OFF_DAYS;

interface MetricGridProps {
  onAddDay: () => void;
}

const MetricGrid: React.FC<MetricGridProps> = ({ onAddDay }) => {
  const [data, setData] = useState<TrackerData>({ metrics: [], dates: [] });
  const { toast } = useToast();
  const { currentDate } = useDate();
  const [sprintStartDate, setSprintStartDate] = useState<Date>(() => {
    // Default to January 1st of current year if not stored
    const stored = localStorage.getItem('noctisium-sprint-start-date');
    return stored ? new Date(stored) : new Date(new Date().getFullYear(), 0, 1);
  });

  // Load data on component mount
  useEffect(() => {
    const storedData = loadData();
    setData(storedData);
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Determine if a date is in a sprint ON period
  const isSprintOnDay = (date: string) => {
    const dateObj = new Date(date);
    const diffTime = Math.abs(dateObj.getTime() - sprintStartDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cyclePosition = diffDays % SPRINT_CYCLE;
    
    return cyclePosition < SPRINT_ON_DAYS;
  };

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
  const handleCellChange = async (metricId: string, date: string, value: string) => {
    setData(prevData => {
      const updatedMetrics = prevData.metrics.map(metric => {
        if (metric.id === metricId) {
          let processedValue: string | number | boolean = value;
          if (metric.type === 'number') {
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

    try {
      // Build the metrics data for the current day
      const dayData = data.metrics.reduce((acc, metric) => {
        acc[metric.id] = metric.values[date] ?? null;
        return acc;
      }, {} as Record<string, string | number | boolean>);

      // Filter out any non-metric fields
      const metricsOnly = Object.fromEntries(
        Object.entries(dayData).filter(([k, v]) => 
          k !== 'date' && k !== 'user_id'
        )
      );

      // Upsert the changed day's data to Supabase
      const payload = [{
        user_id: FIXED_USER_ID,
        date,
        data: metricsOnly
      }];

      console.log('🔔 Cell change upsert payload:', payload);

      const { data: upsertResult, error } = await supabase
        .from('metrics')
        .upsert(payload, {
          onConflict: 'user_id,date'
        });

      console.log('Upsert result:', upsertResult, error);

      if (error) {
        console.error('Supabase upsert error:', error);
        toast({
          title: "Sync failed",
          description: "Changes saved locally but failed to sync to cloud",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('handleCellChange threw', err);
      toast({
        title: "Sync failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
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

  const handleTestSave = async () => {
    console.log('🔔 Test save button clicked');
    try {
      const testDate = '2025-05-07';
      const dayData = data.metrics.reduce((acc, metric) => {
        acc[metric.id] = metric.values[currentDate] ?? null;
        return acc;
      }, {} as Record<string, string | number | boolean>);

      console.log('🔔 Test save payload:', { testDate, dayData });

      const metricsOnly = Object.fromEntries(
        Object.entries(dayData).filter(([k, v]) => 
          k !== 'date' && k !== 'user_id'
        )
      );

      const { data: upsertData, error } = await supabase
        .from('metrics')
        .upsert([{ 
          user_id: FIXED_USER_ID, 
          date: testDate, 
          data: metricsOnly 
        }], 
        { onConflict: 'user_id,date' });

      console.log('🔔 Test save result:', { upsertData, error });

      if (error) {
        throw error;
      }
      
      toast({
        title: "Test save successful",
        description: "Data was saved to Supabase for 2025-05-07"
      });
    } catch (err) {
      console.error('Test save failed:', err);
      toast({
        title: "Test save failed",
        description: "Check console for details",
        variant: "destructive"
      });
    }
  };

  // Get cell border style based on sprint cycle
  const getCellBorderStyle = (date: string) => {
    if (isSprintOnDay(date)) {
      return { border: '2px solid var(--accent-cyan)' };
    } else {
      return { border: '1px solid var(--accent-orange)' };
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-4">
        <button 
          onClick={handleTestSave}
          className="terminal-button bg-accent-pink text-white px-4 py-2 rounded"
        >
          Test Save (2025-05-07)
        </button>
      </div>
      <table className="w-full border-collapse min-w-full">
        <thead>
          <tr>
            <th className="terminal-cell w-48">Metric</th>
            <th 
              className="terminal-cell text-center border-accent-pink" 
              style={{ 
                minWidth: '100px',
                ...getCellBorderStyle(currentDate)
              }}
            >
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
              <td 
                className="terminal-cell text-center" 
                style={getCellBorderStyle(currentDate)}
              >
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
