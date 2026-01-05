/**
 * GoalsTab Component
 * 
 * Shows yearly goal progress with projections.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GoalProgressCard } from './GoalProgressCard';
import { MonthlyActualsChart } from './MonthlyActualsChart';
import { ProjectionsPanel } from './ProjectionsPanel';
import type { GoalAnalytics } from '@/hooks/useAnalytics';

interface GoalsTabProps {
  data: GoalAnalytics[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const GoalsTab: React.FC<GoalsTabProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-surface-secondary border border-line p-12 text-center">
        <div className="text-4xl mb-4">🎯</div>
        <h3 className="text-lg font-semibold text-terminal-accent mb-2">
          No Goals Configured
        </h3>
        <p className="text-terminal-accent/60 max-w-md mx-auto">
          Set up yearly goals in the Roadmap page to track your progress and see projections here.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Goal Progress Cards */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
          Yearly Goals Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((goal, index) => (
            <GoalProgressCard key={goal.id} goal={goal} index={index} />
          ))}
        </div>
      </motion.div>

      {/* Projections Panel */}
      <motion.div variants={itemVariants}>
        <ProjectionsPanel goals={data} />
      </motion.div>

      {/* Monthly Charts for each goal */}
      {data.length > 0 && data[0].monthlyData.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
            Monthly Breakdown
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.slice(0, 4).map((goal) => (
              <MonthlyActualsChart key={goal.id} goal={goal} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GoalsTab;
