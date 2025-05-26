import React, { useState, useEffect } from 'react';
import { predefinedMetrics, FIXED_USER_ID, MetricData } from '@/lib/storage';
import { useDate } from '@/contexts/DateContext';
import { useToast } from '@/components/ui/use-toast';
import { useMetrics } from '@/hooks/useTracker';
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
  const { metrics, dates, isLoading, updateMetric } = useMetrics();
  const { toast } = useToast();
  const { currentDate } = useDate();
  const [sprintStartDate, setSprintStartDate] = useState<Date>(() => {
    // Default to January 1st of current year if not stored
    const stored = localStorage.getItem('noctisium-sprint-start-date');
    return stored ? new Date(stored) : new Date(new Date().getFullYear(), 0, 1);
  });

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
  const metricsToShow = metrics.filter(m => validMetricIds.includes(m.id));

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full text-center py-8">
        <p className="text-terminal-text/70">Loading metrics data...</p>
      </div>
    );
  }

  // If currentDate isn't tracked, show New Day prompt
  if (!dates.includes(currentDate)) {
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
    let processedValue: string | number | boolean = value;
    const metric = metrics.find(m => m.id === metricId);
    
    if (metric?.type === 'number') {
      processedValue = value;
    } else if (metric?.type === 'boolean') {
      processedValue = value.toLowerCase() === 'true';
    }

    // Update using the hook
    updateMetric(metricId, date, processedValue);

    try {
      // Build the metrics data for the current day
      const dayData = metrics.reduce((acc, metric) => {
        acc[metric.id] = metric.values[date] ?? null;
        return acc;
      }, {} as Record<string, string | number | boolean>);

      // Apply the current change
      dayData[metricId] = processedValue;

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

      const { data: upsertResult, error } = await supabase
        .from('metrics')
        .upsert(payload, {
          onConflict: 'user_id,date'
        });

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
    if (!dates || dates.length === 0) return [];
    
    // Get the last 7 dates or fewer
    const recentDates = dates.slice(-7);
    
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

  // Get cell border style based on sprint cycle
  const getCellBorderStyle = (date: string) => {
    if (isSprintOnDay(date)) {
      return { border: '2px solid var(--accent-cyan)' };
    } else {
      return { border: '1px solid var(--accent-orange)' };
    }
  };

  return (
    <div className="w-full">
      {/* Mobile-friendly table container */}
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-max px-2 sm:px-0">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="terminal-cell w-48 min-w-[150px] text-left sticky left-0 bg-sidebar z-10">Metric</th>
                <th 
                  className="terminal-cell text-center border-accent-pink min-w-[120px]" 
                  style={{ 
                    ...getCellBorderStyle(currentDate)
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-sm">{currentDate}</span>
                    <span className="text-xs opacity-70 hidden sm:block">Today</span>
                  </div>
                </th>
                <th className="terminal-cell w-24 min-w-[80px] text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {metricsToShow.map(metric => (
                <tr key={metric.id}>
                  <td className="terminal-cell sticky left-0 bg-sidebar z-10">
                    <div className="text-sm">{metric.name}</div>
                    <div className="text-xs text-terminal-accent/50">{metric.type}</div>
                  </td>
                  <td 
                    className="terminal-cell text-center" 
                    style={getCellBorderStyle(currentDate)}
                  >
                    <div className="min-w-[100px] px-1">
                      {getCellInput(metric, currentDate)}
                    </div>
                  </td>
                  <td className="terminal-cell">
                    <div className="min-w-[60px]">
                      <SparkLine data={getSparkLineData(metric)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile help text */}
      <div className="mt-4 text-xs text-terminal-text/50 text-center sm:hidden">
        Swipe horizontally to view all columns
      </div>
    </div>
  );
};

export default MetricGrid;
