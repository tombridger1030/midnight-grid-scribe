/**
 * YearHeatmap Component
 * 
 * Shows category progress as horizontal bars.
 * Alternative to GitHub-style heatmap for category overview.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_CATEGORIES } from '@/lib/analyticsCalculations';

interface YearHeatmapProps {
  categoryProgress: Record<string, number>;
}

export const YearHeatmap: React.FC<YearHeatmapProps> = ({ categoryProgress }) => {
  const categories = DEFAULT_CATEGORIES.filter(
    cat => categoryProgress[cat.id] !== undefined
  );

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-6 uppercase tracking-wider">
        Category Balance
      </h3>

      <div className="space-y-4">
        {categories.map((category, index) => {
          const progress = categoryProgress[category.id] || 0;
          const isComplete = progress >= 100;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-terminal-accent">{category.name}</span>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: isComplete ? '#00FF88' : category.color }}
                >
                  {Math.round(progress)}%
                </span>
              </div>

              <div
                className="h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: `${category.color}15` }}
              >
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                  style={{
                    backgroundColor: category.color,
                    boxShadow: isComplete ? `0 0 10px ${category.color}` : undefined,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-line">
        <div className="flex items-center justify-center gap-6 text-xs text-terminal-accent/40">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#FF3366]" />
            <span>&lt;50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#FFB800]" />
            <span>50-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#00F0FF]" />
            <span>80-99%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#00FF88]" />
            <span>100%+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearHeatmap;
