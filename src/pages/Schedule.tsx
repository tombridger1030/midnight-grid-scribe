import React, { useState, useEffect, useMemo } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { loadData } from '@/lib/storage';
import { userStorage } from '@/lib/userStorage';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, Edit3, Trash2, X, Settings } from 'lucide-react';
import { formatLocalDate, getCurrentLocalDate } from '@/lib/dateUtils';

// Override console.error to filter out PHANTOM-related errors and runtime errors
const origConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('PHANTOM') || args[0].includes('runtime.lastError'))) return;
  origConsoleError(...args);
};

// Sprint cycle configuration - now customizable
const DEFAULT_SPRINT_ON_DAYS = 21;
const DEFAULT_SPRINT_OFF_DAYS = 7;

// Enhanced Sprint interface with cycle configuration
interface Sprint {
  sprint_id: string;
  user_id: string;
  start_date: string;
  end_date?: string; // Optional for historical sprints
  status: 'active' | 'completed' | 'planned';
  name?: string; // Optional sprint name
  on_days?: number; // Custom ON days for this sprint
  off_days?: number; // Custom OFF days for this sprint
}

const Schedule = () => {
  const currentYear = new Date().getFullYear();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSprintManager, setShowSprintManager] = useState(false);
  const [newSprintData, setNewSprintData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'planned' as 'active' | 'completed' | 'planned',
    on_days: DEFAULT_SPRINT_ON_DAYS,
    off_days: DEFAULT_SPRINT_OFF_DAYS
  });
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [sprintStartDate, setSprintStartDate] = useState(() => {
    // Default to January 1st of current year if not stored
    const stored = localStorage.getItem('noctisium-sprint-start-date');
    return stored ? new Date(stored) : new Date(new Date().getFullYear(), 0, 1);
  });
  const [deepWorkBlocks, setDeepWorkBlocks] = useState<string[]>(() => {
    const stored = localStorage.getItem('midnight-deep-work-blocks');
    return stored ? JSON.parse(stored) : [];
  });

  // Helper function to safely get short sprint ID
  const getShortSprintId = (sprintId: string | number): string => {
    const idStr = String(sprintId);
    return idStr.length > 4 ? idStr.slice(-4) : idStr;
  };

  // Load sprints from Supabase on mount
  useEffect(() => {
    loadSprints();
  }, []);

  // Save sprint start date when changed
  useEffect(() => {
    localStorage.setItem('noctisium-sprint-start-date', sprintStartDate.toISOString());
  }, [sprintStartDate]);

  // Save deep work blocks when changed
  useEffect(() => {
    localStorage.setItem('midnight-deep-work-blocks', JSON.stringify(deepWorkBlocks));
  }, [deepWorkBlocks]);

  // Load tracker data for computing success metrics - memoized to prevent re-renders
  const trackerData = useMemo(() => loadData(), []);

  // Improved sprint detection using actual sprint records
  const getSprintForDate = (date: Date): Sprint | null => {
    const dateStr = formatLocalDate(date);
    
    // Find sprint that contains this date
    return sprints.find(sprint => {
      const startDate = sprint.start_date;
      const endDate = sprint.end_date;
      
      if (endDate) {
        // Historical sprint with defined end date
        return dateStr >= startDate && dateStr <= endDate;
      } else if (sprint.status === 'active') {
        // Active sprint - use cycle calculation from start date
        return dateStr >= startDate;
      } else if (sprint.status === 'planned') {
        // Planned sprint - check if date falls within planned period
        return dateStr >= startDate;
      }
      
      return false;
    }) || null;
  };

  // Enhanced function to determine sprint phase for a date
  const getSprintPhase = (date: Date): 'on' | 'off' | 'none' => {
    const sprint = getSprintForDate(date);
    
    if (!sprint) {
      return 'none';
    }
    
    const dateStr = formatLocalDate(date);
    const sprintStart = new Date(sprint.start_date);
    const onDays = sprint.on_days || DEFAULT_SPRINT_ON_DAYS;
    const offDays = sprint.off_days || DEFAULT_SPRINT_OFF_DAYS;
    
    // Calculate days since sprint start
    const daysSinceStart = Math.floor((date.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart < 0) {
      return 'none'; // Before sprint starts
    }
    
    // For sprints with end dates, check if we're within the sprint period
    if (sprint.end_date) {
      const sprintEnd = new Date(sprint.end_date);
      const onPeriodEnd = new Date(sprintStart);
      onPeriodEnd.setDate(sprintStart.getDate() + onDays - 1);
      
      if (date <= onPeriodEnd) {
        return 'on'; // Within ON period
      } else if (date <= sprintEnd) {
        return 'off'; // Within OFF period (after ON period ends)
      } else {
        return 'none'; // After sprint ends
      }
    }
    
    // For ongoing sprints, use cycle calculation
    const cycleLength = onDays + offDays;
    const cyclePosition = daysSinceStart % cycleLength;
    
    return cyclePosition < onDays ? 'on' : 'off';
  };

  // Auto-update sprint status based on current date
  const updateSprintStatuses = async () => {
    const today = getCurrentLocalDate();
    const todayDate = new Date(today);
    let needsUpdate = false;
    
    const updatedSprints = sprints.map(sprint => {
      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = sprint.end_date ? new Date(sprint.end_date) : null;
      
      let newStatus = sprint.status;
      
      // Auto-update status based on dates
      if (sprint.status === 'planned' && todayDate >= sprintStart) {
        newStatus = 'active';
        needsUpdate = true;
      } else if (sprint.status === 'active' && sprintEnd && todayDate > sprintEnd) {
        newStatus = 'completed';
        needsUpdate = true;
      }
      
      return { ...sprint, status: newStatus };
    });
    
    if (needsUpdate) {
      // Update statuses in database
      for (const sprint of updatedSprints) {
        if (sprint.status !== sprints.find(s => s.sprint_id === sprint.sprint_id)?.status) {
          await supabase
            .from('sprints')
            .update({ status: sprint.status })
            .eq('sprint_id', sprint.sprint_id)
            .eq('user_id', userStorage.getCurrentUserId());
        }
      }
      
      // Reload sprints to reflect changes
      await loadSprints();
    }
  };

  // Auto-calculate end date based on start date and ON days
  const calculateEndDate = (startDate: string, onDays: number, offDays: number): string => {
    const start = new Date(startDate);
    const totalCycleDays = onDays + offDays;
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + totalCycleDays - 1);
    return formatLocalDate(endDate);
  };

  // Auto-calculate ON days based on start and end dates
  const calculateOnDays = (startDate: string, endDate: string, offDays: number): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, totalDays - offDays);
  };

  // Handle changes to sprint form data with auto-calculations
  const handleSprintDataChange = (field: string, value: string | number) => {
    setNewSprintData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate end date when start date or ON/OFF days change
      if ((field === 'start_date' || field === 'on_days' || field === 'off_days') && 
          updated.start_date && !updated.end_date) {
        updated.end_date = calculateEndDate(updated.start_date, updated.on_days, updated.off_days);
      }
      
      // Auto-calculate ON days when start/end dates change
      if ((field === 'start_date' || field === 'end_date') && 
          updated.start_date && updated.end_date) {
        updated.on_days = calculateOnDays(updated.start_date, updated.end_date, updated.off_days);
      }
      
      return updated;
    });
  };

  // Load sprints and auto-update statuses
  useEffect(() => {
    loadSprints().then(() => {
      updateSprintStatuses();
    });
  }, []);

  // Auto-update sprint statuses every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await updateSprintStatuses();
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [sprints]); // Re-run when sprints change

  // Determine if a date is in a sprint ON period (enhanced)
  const isSprintOnDay = (date: Date) => {
    return getSprintPhase(date) === 'on';
  };

  // Determine if a date is in a sprint OFF period
  const isSprintOffDay = (date: Date) => {
    return getSprintPhase(date) === 'off';
  };

  // Plan a new sprint (can be future or immediate)
  const handlePlanNewSprint = async () => {
    if (!newSprintData.start_date) {
      alert('Please provide a start date');
      return;
    }

    // Calculate end date properly: end date should be when the OFF period ends
    let endDate = newSprintData.end_date;
    if (!endDate && newSprintData.status !== 'planned') {
      endDate = calculateEndDate(newSprintData.start_date, newSprintData.on_days, newSprintData.off_days);
    }

    try {
      if (editingSprint) {
        // Update existing sprint
        const { error, data, status } = await supabase
          .from('sprints')
          .update({
            start_date: newSprintData.start_date,
            end_date: endDate || null,
            status: newSprintData.status,
            name: newSprintData.name || null,
            on_days: newSprintData.on_days,
            off_days: newSprintData.off_days
          })
          .eq('sprint_id', editingSprint.sprint_id)
          .eq('user_id', userStorage.getCurrentUserId())
          .select();

        if (error) {
          console.error('Error updating sprint:', error);
          
          // Check for specific "updated_at" field error
          if (error.message && error.message.includes('updated_at')) {
            alert(`Database schema error: The sprints table is missing required columns.\n\nPlease run the database migration script 'supabase_fix_sprints_table.sql' in your Supabase SQL Editor to fix this issue.\n\nError: ${error.message}`);
          } else {
            alert('Failed to update sprint: ' + error.message);
          }
          return;
        }
        
        if (!data || data.length === 0) {
          alert('Sprint update may have failed due to Row Level Security policies. Please check your database policies.');
        } else {
          alert('Sprint updated successfully!');
        }
      } else {
        // Create new sprint
        // If starting today and status is active, mark previous sprint completed
        const today = getCurrentLocalDate();
        if (newSprintData.start_date === today && newSprintData.status === 'active') {
          const active = sprints.find(s => s.status === 'active');
          if (active) {
            await supabase
              .from('sprints')
              .update({ status: 'completed' })
              .eq('sprint_id', active.sprint_id);
          }
        }
        
        // Insert new sprint
        const { error } = await supabase
          .from('sprints')
          .insert([{
            user_id: userStorage.getCurrentUserId(),
            start_date: newSprintData.start_date,
            end_date: endDate || null,
            status: newSprintData.status,
            name: newSprintData.name || null,
            on_days: newSprintData.on_days,
            off_days: newSprintData.off_days
          }]);
        
        if (error) {
          console.error('Error creating new sprint:', error);
          
          // Check for specific "updated_at" field error
          if (error.message && error.message.includes('updated_at')) {
            alert(`Database schema error: The sprints table is missing required columns.\n\nPlease run the database migration script 'supabase_fix_sprints_table.sql' in your Supabase SQL Editor to fix this issue.\n\nError: ${error.message}`);
          } else {
            alert('Failed to create sprint: ' + error.message);
          }
          return;
        }
      }
      
      // Reset form and reload sprints
      setNewSprintData({
        name: '',
        start_date: '',
        end_date: '',
        status: 'planned',
        on_days: DEFAULT_SPRINT_ON_DAYS,
        off_days: DEFAULT_SPRINT_OFF_DAYS
      });
      setEditingSprint(null);
      setShowSprintManager(false);
      await loadSprints();
      
    } catch (err) {
      console.error('Failed to save sprint:', err);
      
      // Check if it's the updated_at field error
      if (err instanceof Error && err.message.includes('updated_at')) {
        alert(`Database schema error: The sprints table is missing required columns.\n\nPlease run the database migration script 'supabase_fix_sprints_table.sql' in your Supabase SQL Editor to fix this issue.\n\nError: ${err.message}`);
      } else {
        alert('Failed to save sprint: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  // Edit existing sprint
  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setNewSprintData({
      name: sprint.name || '',
      start_date: sprint.start_date,
      end_date: sprint.end_date || '',
      status: sprint.status,
      on_days: sprint.on_days || DEFAULT_SPRINT_ON_DAYS,
      off_days: sprint.off_days || DEFAULT_SPRINT_OFF_DAYS
    });
    setShowSprintManager(true);
  };

  // Delete sprint
  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint?')) return;

    try {
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('sprint_id', sprintId)
        .eq('user_id', userStorage.getCurrentUserId());

      if (error) {
        console.error('Error deleting sprint:', error);
        alert(`Failed to delete sprint: ${error.message}`);
        return;
      }

      alert('Sprint deleted successfully!');
      await loadSprints();
    } catch (err) {
      console.error('Failed to delete sprint:', err);
      alert(`Failed to delete sprint: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Load sprints function (extracted for reuse)
  const loadSprints = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', userStorage.getCurrentUserId())
        .order('start_date', { ascending: true });
      
      if (error) {
        console.error('Error loading sprints:', error);
        return;
      }
      
      setSprints(data || []);
      
      // If we have sprints, use the most recent active one for sprint start date
      if (data && data.length > 0) {
        const activeSprintRecord = data.find(s => s.status === 'active');
        if (activeSprintRecord) {
          const activeStartDate = new Date(activeSprintRecord.start_date);
          setSprintStartDate(activeStartDate);
          localStorage.setItem('noctisium-sprint-start-date', activeStartDate.toISOString());
        }
      }
    } catch (err) {
      console.error('Failed to load sprints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate all months for the selected year
  const getMonthsInYear = (year: number) => {
    return Array.from({ length: 12 }, (_, i) => {
      const firstDay = new Date(year, i, 1);
      return {
        month: i,
        name: firstDay.toLocaleDateString('default', { month: 'long' }),
        days: getDaysInMonth(year, i)
      };
    });
  };

  // Get all days in a month
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    
    // Get the first day of week for padding
    const firstDayOfWeek = date.getDay();
    
    // Add padding for the first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Check if a date has deep work scheduled
  const hasDeepWork = (date: Date) => {
    const dateString = formatLocalDate(date);
    return deepWorkBlocks.includes(dateString);
  };

  // Helper to check if wake time is between 4-5AM
  const isValidWakeTime = (timeStr: string): boolean => {
    if (!timeStr) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return false;
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 240 && totalMinutes < 300; // 4:00-4:59 AM
  };

  // Check if a day meets habit compliance criteria (STRICT - all must be true)
  const isHabitCompliantDay = (date: Date): boolean => {
    const dateKey = formatLocalDate(date);
    const metrics = trackerData.metrics;

    // Check wake time (4AM-5AM) - REQUIRED
    const wakingTimeMetric = metrics.find(m => m.id === 'wakingTime');
    const wakeTime = wakingTimeMetric?.values[dateKey]?.toString() || '';
    if (!isValidWakeTime(wakeTime)) return false;

    // Check deep work (3+ hours) - REQUIRED
    const deepWorkMetric = metrics.find(m => m.id === 'deepWork');
    const deepWorkHours = parseFloat(deepWorkMetric?.values[dateKey]?.toString() || '0');
    if (deepWorkHours < 3) return false;

    // Check either jiu jitsu or weightlifting (at least 1 session) - REQUIRED
    const jiuJitsuMetric = metrics.find(m => m.id === 'jiuJitsuSessions');
    const weightliftingMetric = metrics.find(m => m.id === 'weightliftingSessions');
    const jiuJitsuSessions = parseFloat(jiuJitsuMetric?.values[dateKey]?.toString() || '0');
    const weightliftingSessions = parseFloat(weightliftingMetric?.values[dateKey]?.toString() || '0');
    if (jiuJitsuSessions < 1 && weightliftingSessions < 1) return false;

    // Check no dopamine (must be true) - REQUIRED
    const noDopamineMetric = metrics.find(m => m.id === 'noDopamine');
    const noDopamine = noDopamineMetric?.values[dateKey];
    if (noDopamine !== true) return false;

    return true; // ALL criteria must be met
  };

  // Evaluate day quality based on metrics (good/ok/bad)
  const evaluateDayQuality = (date: Date): 'good' | 'ok' | 'bad' | null => {
    const dateKey = formatLocalDate(date);
    const metrics = trackerData.metrics;

    // Check if there's any data for this day
    const hasAnyData = metrics.some(m => m.values[dateKey] !== undefined && m.values[dateKey] !== '');
    if (!hasAnyData) return null;

    let score = 0;
    const totalCriteria = 4;

    // 1. Wake time (4AM-5AM)
    const wakingTimeMetric = metrics.find(m => m.id === 'wakingTime');
    const wakeTime = wakingTimeMetric?.values[dateKey]?.toString() || '';
    if (isValidWakeTime(wakeTime)) score++;

    // 2. Deep work (3+ hours)
    const deepWorkMetric = metrics.find(m => m.id === 'deepWork');
    const deepWorkHours = parseFloat(deepWorkMetric?.values[dateKey]?.toString() || '0');
    if (deepWorkHours >= 3) score++;

    // 3. Exercise (jiu jitsu or weightlifting)
    const jiuJitsuMetric = metrics.find(m => m.id === 'jiuJitsuSessions');
    const weightliftingMetric = metrics.find(m => m.id === 'weightliftingSessions');
    const jiuJitsuSessions = parseFloat(jiuJitsuMetric?.values[dateKey]?.toString() || '0');
    const weightliftingSessions = parseFloat(weightliftingMetric?.values[dateKey]?.toString() || '0');
    if (jiuJitsuSessions >= 1 || weightliftingSessions >= 1) score++;

    // 4. No dopamine
    const noDopamineMetric = metrics.find(m => m.id === 'noDopamine');
    const noDopamine = noDopamineMetric?.values[dateKey];
    if (noDopamine === true) score++;

    // Determine quality based on score
    const percentage = score / totalCriteria;
    if (percentage >= 1.0) return 'good';      // 100% - all criteria met
    if (percentage >= 0.5) return 'ok';        // 50%+ - most criteria met
    return 'bad';                              // <50% - few criteria met
  };

  // Toggle deep work for a date
  const toggleDeepWork = (date: Date) => {
    const dateString = formatLocalDate(date);
    
    if (hasDeepWork(date)) {
      setDeepWorkBlocks(prev => prev.filter(d => d !== dateString));
    } else {
      setDeepWorkBlocks(prev => [...prev, dateString]);
    }
  };

  // Handle sprint start date change
  const handleSprintStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSprintStartDate(newDate);
    }
  };

  // Calculate the current sprint number based on start date
  const getCurrentSprintNumber = () => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - sprintStartDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycleLength = DEFAULT_SPRINT_ON_DAYS + DEFAULT_SPRINT_OFF_DAYS;
    return Math.floor(diffDays / cycleLength) + 1;
  };

  // Calculate days left in current sprint phase
  const getDaysLeftInCurrentPhase = () => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - sprintStartDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycleLength = DEFAULT_SPRINT_ON_DAYS + DEFAULT_SPRINT_OFF_DAYS;
    const cyclePosition = diffDays % cycleLength;
    
    if (cyclePosition < DEFAULT_SPRINT_ON_DAYS) {
      // In ON phase
      return DEFAULT_SPRINT_ON_DAYS - cyclePosition;
    } else {
      // In OFF phase
      return cycleLength - cyclePosition;
    }
  };

  const currentSprintNumber = getCurrentSprintNumber();
  const daysLeftInPhase = getDaysLeftInCurrentPhase();
  const inOnPhase = isSprintOnDay(new Date());
  const activeSprintExists = sprints.some(s => s.status === 'active');

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="mb-4">
        <TypewriterText text="Sprint Schedule" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          Sprint cycle visualization with customizable periods
        </p>
        
        {/* Sprint Management Controls */}
        <div className="mt-4 mb-4 flex flex-wrap gap-2">
          <button 
            onClick={() => setShowSprintManager(true)}
            className="terminal-button bg-accent-cyan text-white px-4 py-2 rounded flex items-center"
            disabled={isLoading}
          >
            <Plus size={16} className="mr-2" />
            Plan New Sprint
          </button>
          
          {activeSprintExists && (
            <span className="text-sm text-terminal-accent/70 self-center ml-2">
              (Planning future sprints or immediate activation)
            </span>
          )}
        </div>
        
        {/* Sprint History */}
        {sprints.length > 0 && (
          <div className="mb-4 p-3 border border-terminal-accent/30">
            <div className="text-sm text-terminal-accent mb-2 flex items-center">
              <Calendar size={16} className="mr-2" />
              Sprint History ({sprints.length} sprints)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {sprints.map(sprint => {
                const startDate = new Date(sprint.start_date).toLocaleDateString();
                const endDate = sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'Ongoing';
                const onDays = sprint.on_days || DEFAULT_SPRINT_ON_DAYS;
                const offDays = sprint.off_days || DEFAULT_SPRINT_OFF_DAYS;
                
                // Calculate actual duration and ON/OFF periods
                let onPeriodEnd = '';
                let offPeriodEnd = '';
                if (sprint.end_date) {
                  const sprintStart = new Date(sprint.start_date);
                  const onEnd = new Date(sprintStart);
                  onEnd.setDate(sprintStart.getDate() + onDays - 1);
                  onPeriodEnd = onEnd.toLocaleDateString();
                  offPeriodEnd = endDate;
                }
                
                return (
                  <div 
                    key={sprint.sprint_id} 
                    className={`text-xs p-2 border border-terminal-accent/20 flex justify-between items-center ${
                      sprint.status === 'active' ? 'bg-terminal-accent/10' : 
                      sprint.status === 'planned' ? 'bg-blue-400/10' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold">
                        {sprint.name || `Sprint ${getShortSprintId(sprint.sprint_id)}`}
                        {sprint.status === 'active' && <span className="text-green-400 ml-1">●</span>}
                        {sprint.status === 'planned' && <span className="text-blue-400 ml-1">○</span>}
                      </div>
                      <div className="text-terminal-accent/70">
                        <div>Start: {startDate}</div>
                        {sprint.end_date && onPeriodEnd && (
                          <div className="text-green-400">ON: {startDate} → {onPeriodEnd}</div>
                        )}
                        {sprint.end_date && offPeriodEnd && onPeriodEnd !== offPeriodEnd && (
                          <div className="text-yellow-400">OFF: {new Date(new Date(sprint.start_date).getTime() + onDays * 24 * 60 * 60 * 1000).toLocaleDateString()} → {offPeriodEnd}</div>
                        )}
                        {!sprint.end_date && <div>End: {endDate}</div>}
                      </div>
                      <div className="text-terminal-accent/50 text-xs">
                        {onDays} ON days / {offDays} OFF days
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditSprint(sprint)}
                        className="text-terminal-accent hover:text-terminal-accent/70 p-1"
                        title="Edit sprint"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSprint(sprint.sprint_id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete sprint"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Sprint status */}
        <div className="p-3 border border-terminal-accent/50 inline-block">
          <div className="text-sm text-terminal-accent mb-2">Current Sprint Status:</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>Sprint cycle:</div>
            <div>{DEFAULT_SPRINT_ON_DAYS} on / {DEFAULT_SPRINT_OFF_DAYS} off (default)</div>
            
            <div>Current sprint:</div>
            <div>#{currentSprintNumber}</div>
            
            <div>Phase:</div>
            <div className={inOnPhase ? 'text-green-400' : 'text-yellow-400'}>
              {inOnPhase ? 'ON' : 'OFF'}
            </div>
            
            <div>Days left:</div>
            <div>{daysLeftInPhase} day{daysLeftInPhase !== 1 ? 's' : ''}</div>
            
            <div>Start date:</div>
            <div>
              <input
                type="date"
                className="terminal-input border-b border-terminal-accent bg-transparent"
                value={formatLocalDate(sprintStartDate)}
                onChange={handleSprintStartChange}
              />
            </div>
          </div>
        </div>
        
        {/* Sprint Border Legend */}
        <div className="mt-4 p-3 border border-terminal-accent/30">
          <div className="text-sm text-terminal-accent mb-2">Calendar Legend:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 legend-compliant"></div>
              <span>Habit Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 legend-on"></div>
              <span>Sprint ON Days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 legend-off"></div>
              <span>Sprint OFF Days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-terminal-accent/10"></div>
              <span>No Sprint</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-terminal-accent/70">
            • Bright green borders override sprint colors for fully compliant days<br/>
            • Colored dots at bottom show day quality (green=good, yellow=ok, red=bad)
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getMonthsInYear(currentYear).map(({ month, name, days }) => (
          <div key={month} className="border border-terminal-accent/30 p-2">
            <div className="text-center mb-2 text-terminal-accent">{name}</div>
            <div className="grid grid-cols-7 gap-px text-center text-xs mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-8"></div>;
                }
                
                const sprintPhase = getSprintPhase(day);
                const isToday = new Date().toDateString() === day.toDateString();
                const isCompliant = isHabitCompliantDay(day); // This is now STRICT
                const dayQuality = evaluateDayQuality(day); // New quality evaluation
                const sprint = getSprintForDate(day);
                
                // Check if there's any data for this day
                const dateKey = formatLocalDate(day);
                const metrics = trackerData.metrics;
                const hasMetrics = metrics.some(m => m.values[dateKey] !== undefined && m.values[dateKey] !== '');

                // Enhanced border style based on sprint phase and habit compliance
                let borderClass = '';
                
                // Use CSS classes for borders
                if (isCompliant) {
                  // Bright green border for FULLY compliant days
                  borderClass = 'sprint-day-compliant';
                } else if (sprintPhase === 'on') {
                  // Green border for ON days
                  borderClass = 'sprint-day-on';
                } else if (sprintPhase === 'off') {
                  // Red border for OFF days
                  borderClass = 'sprint-day-off';
                } else {
                  // No border for non-sprint days
                  borderClass = 'sprint-day-none';
                }

                // Build tooltip with enhanced sprint information
                let tooltip = '';
                if (isCompliant) {
                  tooltip = 'FULLY Habit Compliant: 4-5AM wake • 3+ hr focus • BJJ/lifting • no dopamine';
                } else if (dayQuality === 'good') {
                  tooltip = 'Good Day: Most habits completed successfully';
                } else if (dayQuality === 'ok') {
                  tooltip = 'OK Day: Some habits completed, room for improvement';
                } else if (dayQuality === 'bad') {
                  tooltip = 'Bad Day: Few habits completed, needs attention';
                } else if (hasMetrics) {
                  tooltip = 'Data available - check metrics for details';
                }
                
                // Add sprint information to tooltip
                if (sprint) {
                  const sprintInfo = `Sprint: ${sprint.name || getShortSprintId(sprint.sprint_id)} (${sprint.status})`;
                  const phaseInfo = sprintPhase === 'on' ? 'ON period' : sprintPhase === 'off' ? 'OFF period' : 'Sprint period';
                  const cycleInfo = `${sprint.on_days || DEFAULT_SPRINT_ON_DAYS} ON / ${sprint.off_days || DEFAULT_SPRINT_OFF_DAYS} OFF days`;
                  tooltip = tooltip ? `${tooltip}\n\n${sprintInfo}\n${phaseInfo} - ${cycleInfo}` : `${sprintInfo}\n${phaseInfo} - ${cycleInfo}`;
                } else if (sprintPhase === 'none') {
                  tooltip = tooltip || 'No active sprint';
                }

                return (
                  <div
                    key={day.getTime()}
                    className={`h-8 relative flex items-center justify-center text-xs cursor-pointer ${borderClass}`}
                    onClick={() => toggleDeepWork(day)}
                    title={tooltip}
                  >
                    <span>{day.getDate()}</span>
                    
                    {/* Show colored dot based on day quality */}
                    {dayQuality === 'good' && (
                      <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5FE3B3]" />
                    )}
                    {dayQuality === 'ok' && (
                      <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                    )}
                    {dayQuality === 'bad' && (
                      <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF6B6B]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sprint Manager Modal */}
      {showSprintManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-terminal-bg border border-terminal-accent p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg text-terminal-accent">
                {editingSprint ? 'Edit Sprint' : 'Plan New Sprint'}
              </h3>
              <button 
                onClick={() => {
                  setShowSprintManager(false);
                  setEditingSprint(null);
                  setNewSprintData({
                    name: '',
                    start_date: '',
                    end_date: '',
                    status: 'planned',
                    on_days: DEFAULT_SPRINT_ON_DAYS,
                    off_days: DEFAULT_SPRINT_OFF_DAYS
                  });
                }}
                className="text-terminal-accent/70 hover:text-terminal-accent"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-terminal-accent/70 mb-1">Sprint Name (optional)</label>
                <input
                  type="text"
                  className="terminal-input w-full"
                  placeholder="e.g., Q2 Focus Sprint"
                  value={newSprintData.name}
                  onChange={(e) => handleSprintDataChange('name', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm text-terminal-accent/70 mb-1">Start Date *</label>
                <input
                  type="date"
                  className="terminal-input w-full"
                  value={newSprintData.start_date}
                  onChange={(e) => handleSprintDataChange('start_date', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-terminal-accent/70 mb-1">ON Days</label>
                  <input
                    type="number"
                    className="terminal-input w-full"
                    min="1"
                    max="90"
                    value={newSprintData.on_days}
                    onChange={(e) => handleSprintDataChange('on_days', parseInt(e.target.value) || DEFAULT_SPRINT_ON_DAYS)}
                  />
                  <div className="text-xs text-terminal-accent/50 mt-1">
                    High-intensity work period
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-terminal-accent/70 mb-1">OFF Days</label>
                  <input
                    type="number"
                    className="terminal-input w-full"
                    min="1"
                    max="30"
                    value={newSprintData.off_days}
                    onChange={(e) => handleSprintDataChange('off_days', parseInt(e.target.value) || DEFAULT_SPRINT_OFF_DAYS)}
                  />
                  <div className="text-xs text-terminal-accent/50 mt-1">
                    Recovery/maintenance period
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-terminal-accent/70 mb-1">End Date (when OFF period ends)</label>
                <input
                  type="date"
                  className="terminal-input w-full"
                  value={newSprintData.end_date}
                  onChange={(e) => handleSprintDataChange('end_date', e.target.value)}
                />
                <div className="text-xs text-terminal-accent/50 mt-1">
                  Auto-calculated from ON/OFF days. Leave empty for ongoing sprint.
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-terminal-accent/70 mb-1">Status</label>
                <select
                  className="terminal-input w-full"
                  value={newSprintData.status}
                  onChange={(e) => handleSprintDataChange('status', e.target.value as 'active' | 'completed' | 'planned')}
                >
                  <option value="planned">Planned (Future)</option>
                  <option value="active">Active (Start Now)</option>
                  <option value="completed">Completed (Historical)</option>
                </select>
                <div className="text-xs text-terminal-accent/50 mt-1">
                  Status auto-updates based on dates
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handlePlanNewSprint}
                className="terminal-button bg-terminal-accent text-terminal-bg px-4 py-2 flex-1"
              >
                {editingSprint ? 'Update Sprint' : 'Create Sprint'}
              </button>
              <button
                onClick={() => {
                  setShowSprintManager(false);
                  setEditingSprint(null);
                  setNewSprintData({
                    name: '',
                    start_date: '',
                    end_date: '',
                    status: 'planned',
                    on_days: DEFAULT_SPRINT_ON_DAYS,
                    off_days: DEFAULT_SPRINT_OFF_DAYS
                  });
                }}
                className="terminal-button border border-terminal-accent/50 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
