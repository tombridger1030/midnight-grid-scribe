/**
 * CategoryRollups Component
 * 
 * Shows aggregate trends for each category.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CategoryTrendData } from '@/hooks/useAnalytics';

interface CategoryRollupsProps {
  data: CategoryTrendData[];
}

export const CategoryRollups: React.FC<CategoryRollupsProps> = ({ data }) => {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
        Category Trends
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {data.map((category, index) => (
          <CategoryCard key={category.id} data={category} index={index} />
        ))}
      </div>
    </div>
  );
};

const CategoryCard: React.FC<{ data: CategoryTrendData; index: number }> = ({
  data,
  index,
}) => {
  const trendColor =
    data.trend.direction === 'up' ? '#00FF88' :
    data.trend.direction === 'down' ? '#FF3366' :
    '#6B6B6B';

  const TrendIcon =
    data.trend.direction === 'up' ? TrendingUp :
    data.trend.direction === 'down' ? TrendingDown :
    Minus;

  const isComplete = data.currentProgress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg border border-line bg-surface-primary/50"
      style={{
        borderTopWidth: '3px',
        borderTopColor: data.color,
      }}
    >
      <div className="text-xs text-terminal-accent/60 mb-2">{data.name}</div>

      {/* Current Progress */}
      <div className="flex items-baseline gap-1 mb-2">
        <span
          className="text-2xl font-bold font-mono"
          style={{ color: isComplete ? '#00FF88' : data.color }}
        >
          {Math.round(data.currentProgress)}%
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden mb-2"
        style={{ backgroundColor: `${data.color}20` }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, data.currentProgress)}%` }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          style={{ backgroundColor: data.color }}
        />
      </div>

      {/* Trend */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-terminal-accent/40">
          Avg: {Math.round(data.averageProgress)}%
        </span>
        <div className="flex items-center gap-1" style={{ color: trendColor }}>
          <TrendIcon size={12} />
          <span className="font-mono">
            {data.trend.percentChange > 0 ? '+' : ''}
            {Math.round(data.trend.percentChange)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryRollups;
