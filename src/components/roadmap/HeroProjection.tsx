/**
 * HeroProjection Component
 * 
 * Hero section showing projected year-end for the primary goal.
 * Large animated number with progress bar.
 * Matches Dashboard's WeekProgress design language.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GoalWithProgress } from '@/hooks/useGoals';

interface HeroProjectionProps {
  goals: GoalWithProgress[];
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '$' || unit === 'dollars') {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${Math.round(value)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value).toLocaleString()}`;
};

const getDayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export const HeroProjection: React.FC<HeroProjectionProps> = ({ goals, className }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  // Get primary goal (first one, typically Deep Work)
  const primaryGoal = goals[0];
  
  if (!primaryGoal) return null;

  // Calculate projected year-end
  const dayOfYear = getDayOfYear();
  const daysInYear = 365;
  const dailyRate = primaryGoal.currentTotal / Math.max(1, dayOfYear);
  const projectedYearEnd = Math.round(dailyRate * daysInYear);
  
  // Will hit target?
  const willHitTarget = projectedYearEnd >= primaryGoal.yearlyTarget;
  const projectionPct = (projectedYearEnd / primaryGoal.yearlyTarget) * 100;

  // Animate the number counting up
  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = projectedYearEnd / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= projectedYearEnd) {
        setDisplayValue(projectedYearEnd);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [projectedYearEnd]);

  const getProgressColor = () => {
    if (projectionPct >= 100) return 'bg-[#00FF88]';
    if (projectionPct >= 80) return 'bg-[#00F0FF]';
    if (projectionPct >= 60) return 'bg-[#FFB800]';
    return 'bg-[#FF3366]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("flex flex-col items-center py-8", className)}
    >
      {/* Projected year-end number */}
      <motion.div
        className={cn(
          "text-6xl md:text-7xl font-bold font-mono tracking-tight",
          willHitTarget ? "text-[#00FF88]" : "text-[#E8E8E8]"
        )}
        animate={willHitTarget ? { 
          textShadow: ['0 0 10px #00FF88', '0 0 25px #00FF88', '0 0 10px #00FF88']
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {formatValue(displayValue, primaryGoal.unit)}
      </motion.div>

      {/* Subtitle */}
      <div className="mt-2 text-[#A0A0A0] text-sm">
        Projected {primaryGoal.name.toLowerCase()} {primaryGoal.unit}
      </div>
      <div className="text-[#6B6B6B] text-xs mt-1">
        if current pace holds
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mt-6 px-4">
        <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", getProgressColor())}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, primaryGoal.progressPct * 100)}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-[#6B6B6B]">{Math.round(primaryGoal.progressPct * 100)}% YTD</span>
          <span className="text-[#6B6B6B]">Target: {formatValue(primaryGoal.yearlyTarget, primaryGoal.unit)}</span>
        </div>
      </div>

      {/* Status summary */}
      <div className="mt-4 text-xs text-[#6B6B6B]">
        {goals.filter(g => g.status === 'on-pace').length} of {goals.length} goals on pace
      </div>
    </motion.div>
  );
};

export default HeroProjection;
