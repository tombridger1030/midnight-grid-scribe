/**
 * MonthProgress Component
 * 
 * Shows rolling 4-week average with a small progress bar.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MonthProgressProps {
  percentage: number;
  className?: string;
}

export const MonthProgress: React.FC<MonthProgressProps> = ({
  percentage,
  className,
}) => {
  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-[#5FE3B3]';
    if (percentage >= 60) return 'bg-[#5FE3B3]/70';
    if (percentage >= 40) return 'bg-[#FFD700]';
    return 'bg-[#FF6B6B]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className={cn(
        "px-4 py-3 rounded-lg",
        "bg-terminal-bg/30 border border-terminal-accent/20",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-terminal-accent/60 text-sm">Last 4 Weeks</span>
        <span className="text-terminal-accent font-bold font-mono text-lg">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-terminal-accent/20 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", getProgressColor())}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percentage)}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        />
      </div>
    </motion.div>
  );
};

export default MonthProgress;
