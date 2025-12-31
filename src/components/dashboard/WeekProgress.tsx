/**
 * WeekProgress Component
 * 
 * Hero component showing this week's completion percentage.
 * Large, animated number with progress bar.
 * Clickable to open detailed breakdown.
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface WeekProgressProps {
  percentage: number;
  onClick?: () => void;
  className?: string;
}

export const WeekProgress: React.FC<WeekProgressProps> = ({
  percentage,
  onClick,
  className,
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  // Animate the number counting up
  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setDisplayPercentage(percentage);
        clearInterval(timer);
      } else {
        setDisplayPercentage(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentage]);

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-[#5FE3B3]';
    if (percentage >= 70) return 'bg-[#5FE3B3]/80';
    if (percentage >= 50) return 'bg-[#FFD700]';
    if (percentage >= 30) return 'bg-[#FFA500]';
    return 'bg-[#FF6B6B]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center py-6 cursor-pointer",
        "hover:scale-[1.02] transition-transform duration-200",
        className
      )}
    >
      {/* Big percentage number */}
      <motion.div
        className={cn(
          "text-7xl md:text-8xl font-bold font-mono tracking-tight",
          "text-terminal-accent",
          percentage >= 100 && "text-[#5FE3B3]"
        )}
        animate={percentage >= 100 ? { 
          textShadow: ['0 0 10px #5FE3B3', '0 0 20px #5FE3B3', '0 0 10px #5FE3B3']
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {displayPercentage}%
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-md mt-4 px-4">
        <div className="h-2 bg-terminal-accent/20 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", getProgressColor())}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, percentage)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="mt-3 text-terminal-accent/60 text-sm uppercase tracking-wider">
        This Week
      </div>
    </motion.div>
  );
};

export default WeekProgress;
