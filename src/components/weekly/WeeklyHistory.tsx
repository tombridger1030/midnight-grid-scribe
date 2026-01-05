/**
 * WeeklyHistory Component
 * 
 * Shows a mini bar chart of the last N weeks' progress.
 * Cyberpunk aesthetic with animated bars and glow effects.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { colors, shadows } from '@/styles/design-tokens';

interface WeekData {
  weekKey: string;
  percentage: number;
}

interface WeeklyHistoryProps {
  weeks: WeekData[];
  currentWeekKey: string;
  className?: string;
}

export const WeeklyHistory: React.FC<WeeklyHistoryProps> = ({
  weeks,
  currentWeekKey,
  className,
}) => {
  // Get color based on percentage using design tokens
  const getBarColor = (percentage: number): string => {
    if (percentage >= 90) return colors.success.DEFAULT;
    if (percentage >= 70) return colors.primary.DEFAULT;
    if (percentage >= 50) return colors.warning.DEFAULT;
    if (percentage >= 30) return colors.warning.DEFAULT;
    return colors.danger.DEFAULT;
  };

  // Get week label (just the week number)
  const getWeekLabel = (weekKey: string): string => {
    const match = weekKey.match(/W(\d+)/);
    return match ? `W${match[1]}` : weekKey;
  };

  return (
    <motion.div 
      className={cn("p-4 rounded-lg", className)}
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.accent}`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div 
        className="text-xs mb-4 uppercase tracking-widest font-medium"
        style={{ color: colors.text.muted }}
      >
        History
      </div>

      <div className="flex items-end justify-between gap-2 h-20">
        {weeks.map((week, index) => {
          const isCurrent = week.weekKey === currentWeekKey;
          const barHeight = Math.max(8, (week.percentage / 100) * 80);
          const color = getBarColor(week.percentage);
          const isHigh = week.percentage >= 70;

          return (
            <div
              key={week.weekKey}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              {/* Bar */}
              <motion.div
                className="w-full rounded-t-sm relative overflow-hidden"
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                style={{
                  backgroundColor: color,
                  opacity: isCurrent ? 1 : 0.7,
                  boxShadow: isCurrent && isHigh ? `0 0 12px ${color}50` : undefined,
                }}
              >
                {/* Shine effect for current week */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)`,
                    }}
                  />
                )}
                
                {/* Current week indicator */}
                {isCurrent && (
                  <motion.div
                    className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.div>
              
              {/* Percentage label */}
              <motion.span 
                className="text-xs font-mono font-medium"
                style={{ 
                  color: isCurrent ? color : colors.text.muted,
                  textShadow: isCurrent && isHigh ? `0 0 8px ${color}` : undefined,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                {week.percentage}
              </motion.span>
            </div>
          );
        })}
      </div>

      {/* Week labels */}
      <div className="flex justify-between mt-2">
        {weeks.map((week) => {
          const isCurrent = week.weekKey === currentWeekKey;
          const color = getBarColor(week.percentage);
          
          return (
            <div
              key={week.weekKey}
              className="flex-1 text-center"
            >
              <span
                className="text-xs font-mono"
                style={{ 
                  color: isCurrent ? color : colors.text.muted,
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {getWeekLabel(week.weekKey)}
              </span>
              {isCurrent && (
                <motion.span 
                  className="block text-[10px] uppercase tracking-wider"
                  style={{ color: colors.primary.DEFAULT }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  now
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default WeeklyHistory;
