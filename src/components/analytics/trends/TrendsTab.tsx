/**
 * TrendsTab Component
 * 
 * Historical analysis showing trends over time.
 * Includes overall trend chart, KPI trend cards, and category rollups.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { PeriodSelector } from './PeriodSelector';
import { OverallTrendChart } from './OverallTrendChart';
import { KPITrendCard } from './KPITrendCard';
import { CategoryRollups } from './CategoryRollups';
import type { TrendsData, AnalyticsPeriod } from '@/hooks/useAnalytics';
import type { ConfigurableKPI } from '@/lib/configurableKpis';

interface TrendsTabProps {
  data: TrendsData;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
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

export const TrendsTab: React.FC<TrendsTabProps> = ({
  data,
  period,
  onPeriodChange,
  kpis,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Period Selector */}
      <motion.div variants={itemVariants}>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </motion.div>

      {/* Overall Trend Chart */}
      <motion.div variants={itemVariants}>
        <OverallTrendChart
          data={data.weeklyHistory}
          rollingAverage={data.rollingAverage}
        />
      </motion.div>

      {/* Category Rollups */}
      <motion.div variants={itemVariants}>
        <CategoryRollups data={data.categoryTrends} />
      </motion.div>

      {/* KPI Trend Cards */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
          Individual KPI Trends
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.kpiTrends.map((kpiTrend, index) => (
            <KPITrendCard key={kpiTrend.kpiId} data={kpiTrend} index={index} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TrendsTab;
