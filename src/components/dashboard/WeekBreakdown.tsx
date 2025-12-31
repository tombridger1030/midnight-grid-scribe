/**
 * WeekBreakdown Component
 * 
 * Modal showing KPI-by-KPI breakdown for the current week.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface KPIBreakdown {
  id: string;
  name: string;
  percentage: number;
  color: string;
}

interface WeekBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  weekKey: string;
  overallPercentage: number;
  kpiBreakdown: KPIBreakdown[];
  xpGained: number;
}

export const WeekBreakdown: React.FC<WeekBreakdownProps> = ({
  isOpen,
  onClose,
  weekKey,
  overallPercentage,
  kpiBreakdown,
  xpGained,
}) => {
  // Extract week number from weekKey (e.g., "2025-W23" -> "Week 23")
  const weekLabel = weekKey ? `Week ${weekKey.split('-W')[1]}` : 'This Week';

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-[#5FE3B3]';
    if (percentage >= 70) return 'bg-[#5FE3B3]/70';
    if (percentage >= 50) return 'bg-[#FFD700]';
    if (percentage >= 30) return 'bg-[#FFA500]';
    return 'bg-[#FF6B6B]';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-md mx-4",
              "bg-terminal-bg border border-terminal-accent/30 rounded-lg shadow-2xl",
              "overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-terminal-accent/20">
              <h2 className="text-lg font-bold text-terminal-accent">
                {weekLabel} Breakdown
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-terminal-accent/10 transition-colors"
              >
                <X size={20} className="text-terminal-accent/70" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Overall */}
              <div className="text-center pb-4 border-b border-terminal-accent/10">
                <div className="text-4xl font-bold text-terminal-accent font-mono">
                  {overallPercentage}%
                </div>
                <div className="h-2 bg-terminal-accent/20 rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
                  <motion.div
                    className={cn("h-full rounded-full", getProgressColor(overallPercentage))}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, overallPercentage)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* KPI Breakdown */}
              <div className="space-y-3">
                {kpiBreakdown.map((kpi, index) => (
                  <motion.div
                    key={kpi.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-terminal-accent/80">{kpi.name}</span>
                      <span className="font-mono text-terminal-accent font-medium">
                        {kpi.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-terminal-accent/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: kpi.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, kpi.percentage)}%` }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* XP Earned */}
              <div className="pt-4 border-t border-terminal-accent/10 text-center">
                <span className="text-terminal-accent/60 text-sm">XP Earned: </span>
                <span className="text-[#5FE3B3] font-bold font-mono">+{xpGained}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WeekBreakdown;
