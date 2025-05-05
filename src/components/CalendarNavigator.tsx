import React, { useState, useEffect } from 'react';
import { useDate } from '@/contexts/DateContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CalendarNavigator: React.FC = () => {
  const { currentDate, setCurrentDate } = useDate();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(new Date(currentDate));

  // Sync viewMonth when currentDate changes
  useEffect(() => {
    setViewMonth(new Date(currentDate));
  }, [currentDate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && !e.ctrlKey) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        setCurrentDate(d.toISOString().split('T')[0]);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && !e.ctrlKey) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 1);
        setCurrentDate(d.toISOString().split('T')[0]);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        const m = new Date(viewMonth);
        m.setMonth(m.getMonth() - 1);
        setViewMonth(m);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        const m = new Date(viewMonth);
        m.setMonth(m.getMonth() + 1);
        setViewMonth(m);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentDate, viewMonth, setCurrentDate]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates = [] as (Date | null)[];
  for (let i = 0; i < firstDay; i++) dates.push(null);
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
          const ds = dt.toISOString().split('T')[0];
          const isToday = ds === today.toISOString().split('T')[0];
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
          return (
            <div key={idx} className={cls} onClick={() => setCurrentDate(ds)}>
              {dt.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarNavigator; 