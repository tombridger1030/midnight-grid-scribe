/**
 * KPITrendCard Component
 * 
 * Compact card showing trend for a single KPI.
 * Includes sparkline, current value, and trend indicator.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import type { KPITrendData } from '@/hooks/useAnalytics';

interface KPITrendCardProps {
  data: KPITrendData;
  index: number;
}

export const KPITrendCard: React.FC<KPITrendCardProps> = ({ data, index }) => {
  const trendColor =
    data.trend.direction === 'up' ? '#00FF88' :
    data.trend.direction === 'down' ? '#FF3366' :
    '#6B6B6B';

  const TrendIcon =
    data.trend.direction === 'up' ? TrendingUp :
    data.trend.direction === 'down' ? TrendingDown :
    Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl bg-surface-secondary border border-line p-4 hover:border-terminal-accent/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-medium text-terminal-accent truncate">
            {data.name}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color: trendColor }}>
          <TrendIcon size={14} />
          <span className="text-xs font-mono">
            {data.trend.percentChange > 0 ? '+' : ''}
            {Math.round(data.trend.percentChange)}%
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-12 mb-3">
        <Sparkline data={data.sparklineData} color={data.color} />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-terminal-accent/50">Current: </span>
          <span className="font-mono font-semibold" style={{ color: data.color }}>
            {data.currentValue}
          </span>
          <span className="text-terminal-accent/40">/{data.target} {data.unit}</span>
        </div>
        <div className="flex items-center gap-1 text-terminal-accent/50">
          <span>Avg: </span>
          <span className="font-mono">{Math.round(data.average)}</span>
        </div>
      </div>

      {/* Best Week */}
      {data.best > 0 && (
        <div className="mt-2 pt-2 border-t border-line flex items-center gap-2 text-xs">
          <Trophy size={12} className="text-[#FFB800]" />
          <span className="text-terminal-accent/50">
            Best: <span className="font-mono text-[#FFB800]">{data.best}</span>
            {data.bestWeek && (
              <span className="text-terminal-accent/30 ml-1">({data.bestWeek})</span>
            )}
          </span>
        </div>
      )}
    </motion.div>
  );
};

// Simple SVG Sparkline component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-terminal-accent/30">
        Not enough data
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const width = 100;
  const height = 100;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Create area path
  const areaPath = `M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#sparkGradient-${color.replace('#', '')})`}
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};

export default KPITrendCard;
