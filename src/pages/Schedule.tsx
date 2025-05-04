
import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';

// Sprint cycle configuration
const SPRINT_ON_DAYS = 21;
const SPRINT_OFF_DAYS = 7;
const SPRINT_CYCLE = SPRINT_ON_DAYS + SPRINT_OFF_DAYS;

const Schedule = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sprintStartDate, setSprintStartDate] = useState(() => {
    // Default to January 1st of current year if not stored
    const stored = localStorage.getItem('midnight-sprint-start-date');
    return stored ? new Date(stored) : new Date(new Date().getFullYear(), 0, 1);
  });
  const [deepWorkBlocks, setDeepWorkBlocks] = useState<string[]>(() => {
    const stored = localStorage.getItem('midnight-deep-work-blocks');
    return stored ? JSON.parse(stored) : [];
  });

  // Save sprint start date when changed
  useEffect(() => {
    localStorage.setItem('midnight-sprint-start-date', sprintStartDate.toISOString());
  }, [sprintStartDate]);

  // Save deep work blocks when changed
  useEffect(() => {
    localStorage.setItem('midnight-deep-work-blocks', JSON.stringify(deepWorkBlocks));
  }, [deepWorkBlocks]);

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

  // Year navigation
  const years = [
    selectedYear - 2, 
    selectedYear - 1, 
    selectedYear, 
    selectedYear + 1, 
    selectedYear + 2
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <TypewriterText text="Sprint Schedule" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          {SPRINT_ON_DAYS}-day on / {SPRINT_OFF_DAYS}-day off sprint cycle visualization
        </p>
        
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
        
        {/* Year selector */}
        <div className="flex gap-2 mb-6">
          <button 
            className="terminal-button" 
            onClick={() => setSelectedYear(prev => prev - 1)}
          >
            ← Prev
          </button>
          
          {years.map(year => (
            <button
              key={year}
              className={`terminal-button ${selectedYear === year ? 'bg-terminal-accent text-terminal-bg' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
          
          <button 
            className="terminal-button" 
            onClick={() => setSelectedYear(prev => prev + 1)}
          >
            Next →
          </button>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto pb-12">
        {getMonthsInYear(selectedYear).map(({ month, name, days }) => (
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
                const hasWork = hasDeepWork(day);
                
                return (
                  <div
                    key={day.getTime()}
                    className={`
                      h-8 flex items-center justify-center border text-xs cursor-pointer
                      ${isToday ? 'border-terminal-accent' : 'border-terminal-accent/20'}
                      ${isOn ? 'bg-terminal-accent/20' : 'bg-terminal-bg/70'}
                      ${hasWork ? 'text-green-400 font-bold' : ''}
                    `}
                    onClick={() => toggleDeepWork(day)}
                    title={`${day.toLocaleDateString()}: ${isOn ? 'Sprint ON' : 'Sprint OFF'}${hasWork ? ', Deep Work' : ''}`}
                  >
                    {day.getDate()}
                    {hasWork && <span className="ml-1">•</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schedule;
