/**
 * ProjectionsPanel Component
 * 
 * Shows projected end-of-year totals for all goals.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import type { GoalAnalytics } from '@/hooks/useAnalytics';

interface ProjectionsPanelProps {
  goals: GoalAnalytics[];
}

export const ProjectionsPanel: React.FC<ProjectionsPanelProps> = ({ goals }) => {
  // Sort by how far from target (most at risk first)
  const sortedGoals = [...goals].sort((a, b) => {
    const aRatio = a.projectedTotal / a.yearlyTarget;
    const bRatio = b.projectedTotal / b.yearlyTarget;
    return aRatio - bRatio;
  });

  const atRiskGoals = sortedGoals.filter(g => g.projectedTotal < g.yearlyTarget * 0.9);
  const onTrackGoals = sortedGoals.filter(g => g.projectedTotal >= g.yearlyTarget * 0.9);

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-6 uppercase tracking-wider">
        End of Year Projections
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At Risk */}
        {atRiskGoals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-[#FFB800]" />
              <span className="text-xs text-terminal-accent/60 uppercase tracking-wider">
                Needs Attention
              </span>
            </div>
            <div className="space-y-3">
              {atRiskGoals.map((goal, index) => (
                <ProjectionCard key={goal.id} goal={goal} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* On Track */}
        {onTrackGoals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-[#00FF88]" />
              <span className="text-xs text-terminal-accent/60 uppercase tracking-wider">
                On Track
              </span>
            </div>
            <div className="space-y-3">
              {onTrackGoals.map((goal, index) => (
                <ProjectionCard key={goal.id} goal={goal} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-line">
        <div className="flex items-center justify-between text-sm">
          <span className="text-terminal-accent/60">Goals on track to be met</span>
          <span className="font-mono font-semibold text-terminal-accent">
            {onTrackGoals.length} / {goals.length}
          </span>
        </div>
      </div>
    </div>
  );
};

const ProjectionCard: React.FC<{ goal: GoalAnalytics; index: number }> = ({
  goal,
  index,
}) => {
  const ratio = goal.projectedTotal / goal.yearlyTarget;
  const willMeet = ratio >= 1;
  const isClose = ratio >= 0.9;

  const color = willMeet ? '#00FF88' : isClose ? '#FFB800' : '#FF3366';
  const Icon = willMeet ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg bg-surface-primary/50 border border-line"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-terminal-accent">{goal.name}</span>
        <div className="flex items-center gap-1" style={{ color }}>
          <Icon size={14} />
          <span className="text-xs font-mono">
            {Math.round(ratio * 100)}%
          </span>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold font-mono" style={{ color }}>
          {Math.round(goal.projectedTotal).toLocaleString()}
        </span>
        <span className="text-sm text-terminal-accent/40">
          / {goal.yearlyTarget.toLocaleString()} {goal.unit}
        </span>
      </div>

      {!willMeet && (
        <div className="mt-2 text-xs text-terminal-accent/50">
          Gap: {Math.round(goal.yearlyTarget - goal.projectedTotal).toLocaleString()} {goal.unit}
        </div>
      )}
    </motion.div>
  );
};

export default ProjectionsPanel;
