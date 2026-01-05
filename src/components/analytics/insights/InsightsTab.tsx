/**
 * InsightsTab Component
 * 
 * Shows automated insights and recommendations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { WeeklyHighlights } from './WeeklyHighlights';
import { Recommendations } from './Recommendations';
import { RecordsPanel } from './RecordsPanel';
import type { InsightsData } from '@/hooks/useAnalytics';

interface InsightsTabProps {
  data: InsightsData;
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

export const InsightsTab: React.FC<InsightsTabProps> = ({ data }) => {
  const hasInsights = data.highlights.length > 0 || data.recommendations.length > 0 || data.records.length > 0;

  if (!hasInsights) {
    return (
      <div className="rounded-xl bg-surface-secondary border border-line p-12 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-terminal-accent mb-2">
          Building Insights...
        </h3>
        <p className="text-terminal-accent/60 max-w-md mx-auto">
          Keep tracking your weekly KPIs. The more data you have, 
          the more patterns and insights we can discover for you.
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
      {/* AI Insights Placeholder */}
      <motion.div variants={itemVariants}>
        <div className="rounded-xl bg-gradient-to-r from-[#00F0FF]/10 to-[#9D4EDD]/10 border border-[#00F0FF]/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00F0FF]/20">
              <Sparkles size={20} className="text-[#00F0FF]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-terminal-accent">
                AI Insights Coming Soon
              </div>
              <div className="text-xs text-terminal-accent/60">
                Personalized recommendations powered by AI analysis
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weekly Highlights */}
      {data.highlights.length > 0 && (
        <motion.div variants={itemVariants}>
          <WeeklyHighlights highlights={data.highlights} />
        </motion.div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <motion.div variants={itemVariants}>
          <Recommendations recommendations={data.recommendations} />
        </motion.div>
      )}

      {/* Personal Records */}
      {data.records.length > 0 && (
        <motion.div variants={itemVariants}>
          <RecordsPanel records={data.records} />
        </motion.div>
      )}
    </motion.div>
  );
};

export default InsightsTab;
