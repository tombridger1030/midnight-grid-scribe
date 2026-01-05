/**
 * OverviewTab Component
 * 
 * Quick snapshot of overall performance.
 * Shows score card, KPI summaries, year heatmap, and quick stats.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { PerformanceScoreCard } from './PerformanceScoreCard';
import { KPISummaryGrid } from './KPISummaryGrid';
import { YearHeatmap } from './YearHeatmap';
import { QuickStats } from './QuickStats';
import type { OverviewData } from '@/hooks/useAnalytics';

interface OverviewTabProps {
  data: OverviewData;
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

export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Row: Score Card + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <PerformanceScoreCard
            currentScore={data.currentWeekScore}
            weekOverWeekChange={data.weekOverWeekChange}
            monthlyAverage={data.monthlyAverage}
            currentStreak={data.currentStreak}
            currentWeekKey={data.currentWeekKey}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <QuickStats
            level={data.level}
            rank={data.rank}
            rrPoints={data.rrPoints}
            totalWeeksTracked={data.totalWeeksTracked}
            perfectWeeks={data.perfectWeeks}
            yearlyAverage={data.yearlyAverage}
          />
        </motion.div>
      </div>

      {/* KPI Summary Grid */}
      <motion.div variants={itemVariants}>
        <KPISummaryGrid kpis={data.kpiSummaries} />
      </motion.div>

      {/* Year Heatmap */}
      <motion.div variants={itemVariants}>
        <YearHeatmap categoryProgress={data.categoryProgress} />
      </motion.div>
    </motion.div>
  );
};

export default OverviewTab;
