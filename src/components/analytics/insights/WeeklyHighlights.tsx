/**
 * WeeklyHighlights Component
 * 
 * Shows auto-generated highlights from recent performance.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { Highlight } from '@/lib/analyticsCalculations';

interface WeeklyHighlightsProps {
  highlights: Highlight[];
}

const HIGHLIGHT_STYLES: Record<Highlight['type'], { bg: string; border: string }> = {
  achievement: { bg: 'bg-[#00FF88]/10', border: 'border-[#00FF88]/30' },
  warning: { bg: 'bg-[#FFB800]/10', border: 'border-[#FFB800]/30' },
  trend: { bg: 'bg-[#00F0FF]/10', border: 'border-[#00F0FF]/30' },
  record: { bg: 'bg-[#9D4EDD]/10', border: 'border-[#9D4EDD]/30' },
  streak: { bg: 'bg-[#FFB800]/10', border: 'border-[#FFB800]/30' },
};

export const WeeklyHighlights: React.FC<WeeklyHighlightsProps> = ({
  highlights,
}) => {
  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
        This Week's Highlights
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {highlights.map((highlight, index) => {
          const styles = HIGHLIGHT_STYLES[highlight.type];
          
          return (
            <motion.div
              key={highlight.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{highlight.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-terminal-accent mb-1">
                    {highlight.title}
                  </div>
                  <div className="text-xs text-terminal-accent/60">
                    {highlight.description}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyHighlights;
