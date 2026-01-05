/**
 * KPISummaryGrid Component
 * 
 * Grid showing quick summary for each KPI.
 * Includes value, progress bar, and trend indicator.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPISummary {
  id: string;
  name: string;
  value: number;
  target: number;
  percentage: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
  changeVsAvg: number;
}

interface KPISummaryGridProps {
  kpis: KPISummary[];
}

export const KPISummaryGrid: React.FC<KPISummaryGridProps> = ({ kpis }) => {
  if (kpis.length === 0) {
    return (
      <div className="rounded-xl bg-surface-secondary border border-line p-8 text-center">
        <div className="text-terminal-accent/60">No KPIs configured</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
        KPI Summary
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard key={kpi.id} kpi={kpi} index={index} />
        ))}
      </div>
    </div>
  );
};

const KPICard: React.FC<{ kpi: KPISummary; index: number }> = ({ kpi, index }) => {
  const getTrendIcon = () => {
    switch (kpi.trend) {
      case 'up':
        return <TrendingUp size={14} className="text-[#00FF88]" />;
      case 'down':
        return <TrendingDown size={14} className="text-[#FF3366]" />;
      default:
        return <Minus size={14} className="text-terminal-accent/40" />;
    }
  };

  const isComplete = kpi.percentage >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative p-4 rounded-lg border border-line bg-surface-primary/50 hover:bg-surface-hover transition-colors"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: kpi.color,
      }}
    >
      {/* KPI Name */}
      <div className="text-xs text-terminal-accent/60 mb-2 truncate">{kpi.name}</div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-3">
        <span
          className="text-2xl font-bold font-mono"
          style={{ color: kpi.color }}
        >
          {kpi.value}
        </span>
        <span className="text-xs text-terminal-accent/40">/ {kpi.target}</span>
      </div>

      {/* Progress Bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden mb-2"
        style={{ backgroundColor: `${kpi.color}20` }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, kpi.percentage)}%` }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          style={{
            backgroundColor: kpi.color,
            boxShadow: isComplete ? `0 0 8px ${kpi.color}` : undefined,
          }}
        />
      </div>

      {/* Footer: Percentage + Trend */}
      <div className="flex items-center justify-between text-xs">
        <span
          className="font-mono font-semibold"
          style={{ color: isComplete ? '#00FF88' : kpi.color }}
        >
          {kpi.percentage}%
        </span>
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span
            className={cn(
              'font-mono',
              kpi.changeVsAvg > 0 ? 'text-[#00FF88]' :
              kpi.changeVsAvg < 0 ? 'text-[#FF3366]' :
              'text-terminal-accent/40'
            )}
          >
            {kpi.changeVsAvg > 0 ? '+' : ''}{Math.round(kpi.changeVsAvg)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default KPISummaryGrid;
