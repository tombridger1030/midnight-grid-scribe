/**
 * PerformanceScoreCard Component
 * 
 * Hero card showing this week's completion percentage.
 * Includes week-over-week change and streak indicator.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProgressColor } from '@/lib/analyticsCalculations';

interface PerformanceScoreCardProps {
  currentScore: number;
  weekOverWeekChange: number;
  monthlyAverage: number;
  currentStreak: number;
  currentWeekKey: string;
}

export const PerformanceScoreCard: React.FC<PerformanceScoreCardProps> = ({
  currentScore,
  weekOverWeekChange,
  monthlyAverage,
  currentStreak,
  currentWeekKey,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const progressColor = getProgressColor(currentScore);
  const isComplete = currentScore >= 100;

  // Animate score counting up
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = currentScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= currentScore) {
        setDisplayScore(currentScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [currentScore]);

  const getTrendIcon = () => {
    if (weekOverWeekChange > 2) return <TrendingUp size={20} className="text-[#00FF88]" />;
    if (weekOverWeekChange < -2) return <TrendingDown size={20} className="text-[#FF3366]" />;
    return <Minus size={20} className="text-terminal-accent/60" />;
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-secondary border border-line p-6">
      {/* Background glow effect */}
      {currentScore >= 70 && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at center, ${progressColor} 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-terminal-accent/60" />
            <span className="text-sm text-terminal-accent/60 font-mono">{currentWeekKey}</span>
          </div>
          <div className="text-xs uppercase tracking-wider text-terminal-accent/40">
            This Week
          </div>
        </div>

        {/* Score Display */}
        <div className="text-center mb-6">
          <motion.div
            className="text-7xl md:text-8xl font-bold font-mono tracking-tight"
            style={{
              color: progressColor,
              textShadow: isComplete ? `0 0 30px ${progressColor}` : undefined,
            }}
            animate={isComplete ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {displayScore}%
          </motion.div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto mt-4">
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: `${progressColor}20` }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, currentScore)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  backgroundColor: progressColor,
                  boxShadow: isComplete ? `0 0 15px ${progressColor}` : undefined,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-8 text-sm">
          {/* Week over Week */}
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span
              className={cn(
                'font-mono font-semibold',
                weekOverWeekChange > 0 ? 'text-[#00FF88]' :
                weekOverWeekChange < 0 ? 'text-[#FF3366]' :
                'text-terminal-accent/60'
              )}
            >
              {weekOverWeekChange > 0 ? '+' : ''}{weekOverWeekChange}%
            </span>
            <span className="text-terminal-accent/40">vs last week</span>
          </div>

          <div className="w-px h-4 bg-line" />

          {/* Streak */}
          {currentStreak >= 2 && (
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-[#FFB800]" />
              <span className="font-mono font-semibold text-[#FFB800]">
                {currentStreak}
              </span>
              <span className="text-terminal-accent/40">week streak</span>
            </div>
          )}

          {currentStreak < 2 && (
            <div className="flex items-center gap-2">
              <span className="text-terminal-accent/40">
                Monthly avg: <span className="text-terminal-accent font-mono">{monthlyAverage}%</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceScoreCard;
