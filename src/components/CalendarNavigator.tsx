import React, { useState, useEffect } from 'react';
import { useDate } from '@/contexts/DateContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocalDate, getCurrentLocalDate } from '@/lib/dateUtils';

// Sprint cycle configuration
const SPRINT_ON_DAYS = 21;
const SPRINT_OFF_DAYS = 7;
const SPRINT_CYCLE = SPRINT_ON_DAYS + SPRINT_OFF_DAYS;

const CalendarNavigator: React.FC = () => {
  const { currentDate, setCurrentDate } = useDate();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [sprintStartDate, setSprintStartDate] = useState<Date>(() => {
    // Default to January 1st of current year if not stored
    const stored = localStorage.getItem('noctisium-sprint-start-date');
    return stored ? new Date(stored) : new Date(new Date().getFullYear(), 0, 1);
  });

  // Determine if a date is in a sprint ON period
  const isSprintOnDay = (date: Date) => {
    const diffTime = Math.abs(date.getTime() - sprintStartDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cyclePosition = diffDays % SPRINT_CYCLE;
    
    return cyclePosition < SPRINT_ON_DAYS;
  };

  // Get cell border style based on sprint cycle
  const getCellBorderStyle = (date: Date) => {
    if (isSprintOnDay(date)) {
      return { border: '2px solid var(--accent-cyan)' };
    } else {
      return { border: '1px solid var(--accent-orange)' };
    }
  };

  // Get today's date string using local timezone
  const todayString = getCurrentLocalDate();

  // Get month and year from viewMonth
  const month = viewMonth.getMonth();
  const year = viewMonth.getFullYear();

  // Create day name headers
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create dates array with padding for first day of month
  const dates: (Date | null)[] = [];
  const firstDay = new Date(year, month, 1).getDay();
  
  // Add empty slots for padding
  for (let i = 0; i < firstDay; i++) dates.push(null);
  
  // Add dates for the month
  for (let d = 1; d <= daysInMonth; d++) dates.push(new Date(year, month, d));

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  return (
    <div className="w-[300px] p-3 bg-panel border border-accent-primary text-sm">
      <div className="flex items-center justify-between mb-1">
        <button onClick={prevMonth} className="p-1 hover:bg-accent-primary hover:text-bg-01">
          <ChevronLeft className="w-4 h-4 text-main" />
        </button>
        <div className="text-main font-bold">
          {viewMonth.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </div>
        <button onClick={nextMonth} className="p-1 hover:bg-accent-primary hover:text-bg-01">
          <ChevronRight className="w-4 h-4 text-main" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-main mb-1">
        {dayNames.map(dn => <div key={dn}>{dn}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center gap-0">
        {dates.map((dt, idx) => {
          if (!dt) return <div key={idx} className="py-2 bg-panel"></div>;
          const ds = formatLocalDate(dt);
          const isToday = ds === todayString;
          const isSelected = ds === currentDate;
          const base = "py-2 bg-panel rounded";
          const cls = cn(
            base,
            isSelected
              ? 'border border-accent-primary bg-accent-primary text-bg-01'
              : 'text-main',
            isToday ? 'outline outline-1 outline-accent-highlight' : '',
            'cursor-pointer hover:bg-accent-primary hover:text-bg-01'
          );
          
          // Apply sprint cycle styling
          const sprintStyle = !isSelected ? getCellBorderStyle(dt) : {};
          
          return (
            <div 
              key={idx} 
              className={cls} 
              onClick={() => setCurrentDate(ds)}
              style={sprintStyle}
            >
              {dt.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarNavigator; 