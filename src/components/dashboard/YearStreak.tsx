/**
 * YearStreak Component
 * 
 * Visual timeline showing 52 weeks of performance.
 * Green gradient based on completion percentage.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatWeekKey } from '@/lib/weeklyKpi';

interface WeekData {
  weekKey: string;
  percentage: number;
}

interface YearStreakProps {
  weeks: WeekData[];
  currentWeekKey: string;
  className?: string;
}

export const YearStreak: React.FC<YearStreakProps> = ({
  weeks,
  currentWeekKey,
  className,
}) => {
  const getBlockColor = (percentage: number, isCurrentWeek: boolean): string => {
    if (percentage === 0) return 'bg-terminal-accent/10';
    if (percentage < 20) return 'bg-terminal-accent/20';
    if (percentage < 40) return 'bg-[#2D5A3D]';
    if (percentage < 60) return 'bg-[#3D6A4D]';
    if (percentage < 80) return 'bg-[#4D8A5D]';
    if (percentage < 100) return 'bg-[#5FE3B3]/80';
    return 'bg-[#5FE3B3]';
  };

  // Ensure we have 52 weeks, filling with empty data if needed
  const paddedWeeks = [...weeks];
  while (paddedWeeks.length < 52) {
    paddedWeeks.unshift({ weekKey: '', percentage: 0 });
  }
  // Take only last 52
  const displayWeeks = paddedWeeks.slice(-52);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={cn("pt-2", className)}
    >
      {/* Week blocks */}
      <div className="flex gap-[2px] justify-center flex-wrap">
        {displayWeeks.map((week, index) => {
          const isCurrentWeek = week.weekKey === currentWeekKey;
          return (
            <motion.div
              key={week.weekKey || `empty-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: isCurrentWeek ? '0 0 8px rgba(95, 227, 179, 0.5)' : 'none'
              }}
              transition={{ 
                duration: 0.2, 
                delay: index * 0.01,
              }}
              className={cn(
                "w-2 h-2 rounded-[2px] cursor-pointer transition-all",
                getBlockColor(week.percentage, isCurrentWeek),
                isCurrentWeek && "ring-1 ring-[#5FE3B3] ring-offset-1 ring-offset-terminal-bg"
              )}
              title={week.weekKey ? `${formatWeekKey(week.weekKey)}: ${week.percentage}%` : 'No data'}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-terminal-accent/40 px-1">
        <span>Jan</span>
        <span>Now</span>
      </div>
    </motion.div>
  );
};

export default YearStreak;
