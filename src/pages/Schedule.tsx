import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { loadData, FIXED_USER_ID } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// Override console.error to filter out PHANTOM-related errors
const origConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('PHANTOM')) return;
  origConsoleError(...args);
};

// Sprint cycle configuration
const SPRINT_ON_DAYS = 21;
const SPRINT_OFF_DAYS = 7;
const SPRINT_CYCLE = SPRINT_ON_DAYS + SPRINT_OFF_DAYS;

// Define Sprint interface
interface Sprint {
  sprint_id: string;
  user_id: string;
  start_date: string;
  status: 'active' | 'completed';
}

const Schedule = () => {
  const currentYear = new Date().getFullYear();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sprintStartDate, setSprintStartDate] = useState(() => {
    // Default to January 1st of current year if not stored
    const stored = localStorage.getItem('noctisium-sprint-start-date');
    return stored ? new Date(stored) : new Date(new Date().getFullYear(), 0, 1);
  });
  const [deepWorkBlocks, setDeepWorkBlocks] = useState<string[]>(() => {
    const stored = localStorage.getItem('midnight-deep-work-blocks');
    return stored ? JSON.parse(stored) : [];
  });

  // Load sprints from Supabase on mount
  useEffect(() => {
    const loadSprints = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('sprints')
          .select('*')
          .eq('user_id', FIXED_USER_ID)
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

  // Load tracker data for computing success metrics
  const trackerData = loadData();

  // Start a new sprint
  const handleStartNewSprint = async () => {
    try {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      
      // Mark previous sprint completed
      const active = sprints.find(s => s.status === 'active');
      if (active) {
        await supabase
          .from('sprints')
          .update({ status: 'completed' })
          .eq('sprint_id', active.sprint_id);
      }
      
      // Insert new sprint
      const { data, error } = await supabase
        .from('sprints')
        .insert([
          { user_id: FIXED_USER_ID, start_date: todayDate, status: 'active' }
        ]);
      
      if (error) {
        console.error('Error creating new sprint:', error);
        return;
      }
      
      // Reload sprints to get the newly created sprint with its ID
      const { data: updatedSprints, error: fetchError } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('start_date', { ascending: true });
        
      if (fetchError) {
        console.error('Error fetching updated sprints:', fetchError);
        return;
      }
      
      // Update local state
      setSprints(updatedSprints || []);
      
      // Update sprint start date
      setSprintStartDate(new Date(todayDate));
      
    } catch (err) {
      console.error('Failed to start new sprint:', err);
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

  // Determine if a date is in a sprint ON period
  const isSprintOnDay = (date: Date) => {
    const diffTime = Math.abs(date.getTime() - sprintStartDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cyclePosition = diffDays % SPRINT_CYCLE;
    
    return cyclePosition < SPRINT_ON_DAYS;
  };

  // Check if a date has deep work scheduled
  const hasDeepWork = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return deepWorkBlocks.includes(dateString);
  };

  // Toggle deep work for a date
  const toggleDeepWork = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    
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
    return Math.floor(diffDays / SPRINT_CYCLE) + 1;
  };

  // Calculate days left in current sprint phase
  const getDaysLeftInCurrentPhase = () => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - sprintStartDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cyclePosition = diffDays % SPRINT_CYCLE;
    
    if (cyclePosition < SPRINT_ON_DAYS) {
      // In ON phase
      return SPRINT_ON_DAYS - cyclePosition;
    } else {
      // In OFF phase
      return SPRINT_CYCLE - cyclePosition;
    }
  };

  const currentSprintNumber = getCurrentSprintNumber();
  const daysLeftInPhase = getDaysLeftInCurrentPhase();
  const inOnPhase = isSprintOnDay(new Date());
  const activeSprintExists = sprints.some(s => s.status === 'active');

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <TypewriterText text="Sprint Schedule" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          {SPRINT_ON_DAYS}-day on / {SPRINT_OFF_DAYS}-day off sprint cycle visualization
        </p>
        
        {/* Start New Sprint Button */}
        <div className="mt-4 mb-4">
          <button 
            onClick={handleStartNewSprint}
            className="terminal-button bg-accent-cyan text-white px-4 py-2 rounded mr-2"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : activeSprintExists ? 'Start New Sprint' : 'Start First Sprint'}
          </button>
          {activeSprintExists && (
            <span className="text-sm text-terminal-accent/70 ml-2">
              (This will complete the current active sprint)
            </span>
          )}
        </div>
        
        {/* Sprint status */}
        <div className="mt-4 mb-6 p-3 border border-terminal-accent/50 inline-block">
          <div className="text-sm text-terminal-accent mb-2">Current Sprint Status:</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>Sprint cycle:</div>
            <div>{SPRINT_ON_DAYS} on / {SPRINT_OFF_DAYS} off</div>
            
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
                value={sprintStartDate.toISOString().split('T')[0]}
                onChange={handleSprintStartChange}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto pb-12">
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
                
                const isOn = isSprintOnDay(day);
                const isToday = new Date().toDateString() === day.toDateString();
                // Compute success metrics
                const dateKey = day.toISOString().split('T')[0];
                const metrics = trackerData.metrics;
                let score = 0;
                const deepWorkVal = metrics.find(m => m.id === 'deepWork')?.values[dateKey];
                if (deepWorkVal !== undefined && Number(deepWorkVal) >= 2) score++;
                const sleepVal = metrics.find(m => m.id === 'sleepHours')?.values[dateKey];
                if (sleepVal !== undefined && Number(sleepVal) >= 7) score++;
                const coldVal = metrics.find(m => m.id === 'coldShower')?.values[dateKey];
                if (coldVal === true) score++;
                const proteinVal = metrics.find(m => m.id === 'proteinIntake')?.values[dateKey];
                if (proteinVal !== undefined && Number(proteinVal) >= 100) score++;
                const recoveryVal = metrics.find(m => m.id === 'recovery')?.values[dateKey];
                if (recoveryVal !== undefined && Number(recoveryVal) >= 70) score++;
                const successPercent = Math.round((score / 5) * 100);
                const hasMetrics = metrics.some(m => m.values[dateKey] !== undefined && m.values[dateKey] !== '');
                const dotColor = successPercent >= 80
                  ? 'var(--accent-cyan)'
                  : successPercent >= 50
                  ? 'var(--accent-orange)'
                  : 'var(--accent-red)';

                // Apply border style based on sprint cycle
                const borderStyle = isOn 
                  ? { border: '2px solid var(--accent-cyan)' }
                  : { border: '1px solid var(--accent-orange)' };

                return (
                  <div
                    key={day.getTime()}
                    className="h-8 relative flex items-center justify-center text-xs cursor-pointer"
                    style={borderStyle}
                    onClick={() => toggleDeepWork(day)}
                    title={hasMetrics ? `Success: ${successPercent}% — ${successPercent >= 80 ? 'Success' : successPercent >= 50 ? 'Partial' : 'Needs Improvement'}` : undefined}
                  >
                    <span>{day.getDate()}</span>
                    {hasMetrics && (
                      <span
                        className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Success Legend */}
      <div className="mt-4 text-xs">
        <div className="font-semibold mb-1">Legend:</div>
        <ul className="space-y-1">
          <li>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1"
              style={{ backgroundColor: 'var(--accent-cyan)' }}
            />
            Success – met ≥ 4 of 5 criteria (≥ 80%)
          </li>
          <li>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1"
              style={{ backgroundColor: 'var(--accent-orange)' }}
            />
            Partial – met 3 of 5 criteria (50–79%)
          </li>
          <li>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1"
              style={{ backgroundColor: 'var(--accent-red)' }}
            />
            Needs Improvement – met ≤ 2 criteria (&lt; 50%)
          </li>
          <li>
            <span className="inline-block w-4 h-2 border-[2px] border-[var(--accent-cyan)] mr-1" />
            Sprint-on days (days 1–21)
            <span className="inline-block w-4 h-2 border-[1px] border-[var(--accent-orange)] ml-2 mr-1" />
            Sprint-off days (days 22–28)
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Schedule;
