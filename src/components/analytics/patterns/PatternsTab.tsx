/**
 * PatternsTab Component
 * 
 * Shows patterns and correlations in the data.
 * Includes correlation matrix, streak calendar, and distributions.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CorrelationMatrix } from './CorrelationMatrix';
import { StreakCalendar } from './StreakCalendar';
import { DistributionChart } from './DistributionChart';
import type { PatternsData } from '@/hooks/useAnalytics';
import type { ConfigurableKPI } from '@/lib/configurableKpis';

interface PatternsTabProps {
  data: PatternsData;
  kpis: ConfigurableKPI[];
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

export const PatternsTab: React.FC<PatternsTabProps> = ({ data, kpis }) => {
  // Build KPI name map for correlation matrix
  const kpiNames: Record<string, string> = {};
  kpis.forEach(kpi => {
    kpiNames[kpi.kpi_id] = kpi.name;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Correlation Matrix */}
      <motion.div variants={itemVariants}>
        <CorrelationMatrix
          correlations={data.correlations}
          kpiNames={kpiNames}
        />
      </motion.div>

      {/* Distribution Chart */}
      <motion.div variants={itemVariants}>
        <DistributionChart
          data={data.distributions['overall'] || []}
          title="Weekly Score Distribution"
        />
      </motion.div>

      {/* Streak Calendar */}
      <motion.div variants={itemVariants}>
        <StreakCalendar
          streaks={data.streaks}
          kpiNames={kpiNames}
        />
      </motion.div>
    </motion.div>
  );
};

export default PatternsTab;
