import React, { useState, useEffect } from 'react';
import { userStorage } from '@/lib/userStorage';
import { useMetrics } from '@/hooks/useTracker';
import MetricGrid from './MetricGrid';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar } from 'lucide-react';
import { useDate } from '@/contexts/DateContext';
import CalendarNavigator from './CalendarNavigator';
import { supabase } from '@/lib/supabase';

const MidnightTracker: React.FC = () => {
  const { metrics, dates, addDate } = useMetrics();
  const { toast } = useToast();
  const { currentDate, setCurrentDate } = useDate();

  // Register keyboard shortcuts (Ctrl+N adds entry for selected date)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case 'n': // Ctrl+N: New Day for selected date
          e.preventDefault();
          handleAddDay(currentDate);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDate]);

  // Add a Tracker entry for the given date (or selected date by default)
  const handleAddDay = (dateToAdd?: string) => {
    const dateKey = dateToAdd ?? currentDate;
    setCurrentDate(dateKey);
    
    // Only add the specified date if it doesn't exist
    if (!dates.includes(dateKey)) {
      addDate(dateKey);
      toast({
        title: "New day added",
        description: `Date (${dateKey}) has been added to your tracker.`
      });
    } else {
      toast({
        title: "Already exists",
        description: `Date (${dateKey}) is already in your tracker.`
      });
    }
  };

  // Test save function (moved from MetricGrid)
  const handleTestSave = async () => {
    console.log('🔔 Test save button clicked');
    try {
      const testDate = '2025-05-07';
      const dayData = metrics.reduce((acc, metric) => {
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
          user_id: userStorage.getCurrentUserId(), 
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

  return (
    <div className="flex flex-col min-h-full">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <button className="terminal-button flex items-center min-h-[44px] px-4" onClick={() => handleAddDay(currentDate)}>
          <Calendar size={16} className="mr-2" />
          New Day
        </button>
        <CalendarNavigator />
        <button 
          onClick={handleTestSave}
          className="terminal-button bg-accent-cyan text-white px-4 py-2 min-h-[44px]"
        >
          Test Save
        </button>
      </div>

      <div className="flex">
        <div className="flex-1">
          <div className="bg-panel p-1 h-full">
            <MetricGrid onAddDay={() => handleAddDay(currentDate)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MidnightTracker;
