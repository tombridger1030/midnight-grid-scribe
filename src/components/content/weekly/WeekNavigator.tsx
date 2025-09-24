import React from 'react';
import { cn } from '@/lib/utils';

interface WeekNavigatorProps {
  currentWeek: string;
  onWeekChange: (weekKey: string) => void;
  className?: string;
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  currentWeek,
  onWeekChange,
  className = ''
}) => {
  const parseWeekKey = (weekKey: string): { year: number; week: number } => {
    const [year, weekStr] = weekKey.split('-W');
    return { year: parseInt(year), week: parseInt(weekStr) };
  };

  const formatWeekKey = (year: number, week: number): string => {
    return `${year}-W${String(week).padStart(2, '0')}`;
  };

  const getWeekDates = (weekKey: string): { start: Date; end: Date } => {
    const { year, week } = parseWeekKey(weekKey);

    // Calculate the start of the week (Monday)
    const jan1 = new Date(year, 0, 1);
    const jan1DayOfWeek = jan1.getDay();
    const daysToFirstMonday = jan1DayOfWeek === 1 ? 0 : (8 - jan1DayOfWeek) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return { start: weekStart, end: weekEnd };
  };

  const getCurrentWeek = (): string => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const jan1DayOfWeek = jan1.getDay();
    const daysToFirstMonday = jan1DayOfWeek === 1 ? 0 : (8 - jan1DayOfWeek) % 7;
    const firstMonday = new Date(now.getFullYear(), 0, 1 + daysToFirstMonday);

    const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
    const currentWeekNum = Math.floor(daysSinceFirstMonday / 7) + 1;

    return formatWeekKey(now.getFullYear(), Math.max(1, currentWeekNum));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const { year, week } = parseWeekKey(currentWeek);

    if (direction === 'prev') {
      if (week > 1) {
        onWeekChange(formatWeekKey(year, week - 1));
      } else {
        onWeekChange(formatWeekKey(year - 1, 52)); // Go to last week of previous year
      }
    } else {
      if (week < 52) {
        onWeekChange(formatWeekKey(year, week + 1));
      } else {
        onWeekChange(formatWeekKey(year + 1, 1)); // Go to first week of next year
      }
    }
  };

  const formatWeekDisplay = (weekKey: string): string => {
    const { start, end } = getWeekDates(weekKey);
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (start.getMonth() === end.getMonth()) {
      return `${formatDate(start)} - ${end.getDate()}, ${start.getFullYear()}`;
    } else {
      return `${formatDate(start)} - ${formatDate(end)}, ${start.getFullYear()}`;
    }
  };

  const isCurrentWeek = currentWeek === getCurrentWeek();

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 hover:bg-[#2A2A2A] rounded-sm transition-colors text-[#8A8D93] hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center min-w-[200px]">
          <div className="text-sm font-medium text-white">
            Week {parseWeekKey(currentWeek).week}, {parseWeekKey(currentWeek).year}
            {isCurrentWeek && <span className="ml-2 text-xs text-terminal-accent">(Current)</span>}
          </div>
          <div className="text-xs text-[#8A8D93]">
            {formatWeekDisplay(currentWeek)}
          </div>
        </div>

        <button
          onClick={() => navigateWeek('next')}
          className="p-2 hover:bg-[#2A2A2A] rounded-sm transition-colors text-[#8A8D93] hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <button
        onClick={() => onWeekChange(getCurrentWeek())}
        disabled={isCurrentWeek}
        className={cn(
          'px-3 py-1 text-xs rounded-sm border transition-colors',
          isCurrentWeek
            ? 'border-[#333] text-[#555] cursor-not-allowed'
            : 'border-[#333] text-[#8A8D93] hover:bg-[#2A2A2A] hover:text-white'
        )}
      >
        Current Week
      </button>
    </div>
  );
};

export default WeekNavigator;