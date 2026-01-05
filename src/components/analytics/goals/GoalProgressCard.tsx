/**
 * GoalProgressCard Component
 * 
 * Shows progress for a single yearly goal.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GoalAnalytics } from '@/hooks/useAnalytics';

interface GoalProgressCardProps {
  goal: GoalAnalytics;
  index: number;
}

const PACE_CONFIG = {
  'ahead': { color: '#00FF88', label: 'Ahead of pace', icon: TrendingUp },
  'on-track': { color: '#00F0FF', label: 'On track', icon: Target },
  'behind': { color: '#FFB800', label: 'Slightly behind', icon: TrendingDown },
  'far-behind': { color: '#FF3366', label: 'Behind pace', icon: TrendingDown },
};

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  goal,
  index,
}) => {
  const paceConfig = PACE_CONFIG[goal.pace.status];
  const PaceIcon = paceConfig.icon;
  const isComplete = goal.progressPct >= 100;

  // Calculate remaining
  const remaining = goal.yearlyTarget - goal.currentTotal;
  const monthsLeft = 12 - new Date().getMonth();
  const remainingPerMonth = monthsLeft > 0 ? remaining / monthsLeft : remaining;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl bg-surface-secondary border border-line p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-terminal-accent">{goal.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <PaceIcon size={14} style={{ color: paceConfig.color }} />
            <span className="text-xs" style={{ color: paceConfig.color }}>
              {paceConfig.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-terminal-accent">
            {Math.round(goal.progressPct)}%
          </div>
          <div className="text-xs text-terminal-accent/40">complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: `${paceConfig.color}20` }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, goal.progressPct)}%` }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            style={{
              backgroundColor: paceConfig.color,
              boxShadow: isComplete ? `0 0 10px ${paceConfig.color}` : undefined,
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-terminal-accent/50 text-xs">YTD Progress</div>
          <div className="font-mono font-semibold text-terminal-accent">
            {goal.currentTotal.toLocaleString()} <span className="text-terminal-accent/40">/ {goal.yearlyTarget.toLocaleString()}</span>
          </div>
          <div className="text-xs text-terminal-accent/40">{goal.unit}</div>
        </div>
        <div>
          <div className="text-terminal-accent/50 text-xs">Projected EOY</div>
          <div className="font-mono font-semibold" style={{ color: paceConfig.color }}>
            {Math.round(goal.projectedTotal).toLocaleString()}
          </div>
          <div className="text-xs text-terminal-accent/40">{goal.unit}</div>
        </div>
      </div>

      {/* Remaining */}
      {remaining > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <div className="flex items-center justify-between text-xs">
            <span className="text-terminal-accent/50">Remaining</span>
            <span className="font-mono text-terminal-accent">
              {Math.round(remaining).toLocaleString()} {goal.unit}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-terminal-accent/50">Required pace</span>
            <span className="font-mono text-terminal-accent">
              {Math.round(remainingPerMonth).toLocaleString()} {goal.unit}/mo
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GoalProgressCard;
