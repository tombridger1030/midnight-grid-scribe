/**
 * AllocationChart Component
 * 
 * Premium donut chart with cyberpunk aesthetics.
 * Shows portfolio allocation by individual holding.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Holding } from '@/lib/investmentQuotes';

interface AllocationChartProps {
  holdings: Holding[];
  hideBalances: boolean;
}

// Cyberpunk color palette with neon glow effects
const CHART_COLORS = [
  { color: '#00F0FF', glow: 'rgba(0, 240, 255, 0.4)' },   // Cyan
  { color: '#00FF88', glow: 'rgba(0, 255, 136, 0.4)' },   // Green
  { color: '#FFB800', glow: 'rgba(255, 184, 0, 0.4)' },   // Amber
  { color: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)' },  // Purple
  { color: '#FF3366', glow: 'rgba(255, 51, 102, 0.4)' },  // Pink
  { color: '#0EA5E9', glow: 'rgba(14, 165, 233, 0.4)' },  // Sky
  { color: '#22C55E', glow: 'rgba(34, 197, 94, 0.4)' },   // Lime
  { color: '#F97316', glow: 'rgba(249, 115, 22, 0.4)' },  // Orange
  { color: '#D946EF', glow: 'rgba(217, 70, 239, 0.4)' },  // Fuchsia
  { color: '#14B8A6', glow: 'rgba(20, 184, 166, 0.4)' },  // Teal
  { color: '#6366F1', glow: 'rgba(99, 102, 241, 0.4)' },  // Indigo
  { color: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)' },  // Pink
];

interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  glow: string;
}

export const AllocationChart: React.FC<AllocationChartProps> = ({
  holdings,
  hideBalances,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = useMemo(() => 
    holdings.reduce((sum, h) => sum + (h.valueCAD || 0), 0),
    [holdings]
  );

  // Calculate allocation with colors
  const allocation = useMemo((): AllocationItem[] => {
    return holdings
      .filter(h => (h.valueCAD || 0) > 0)
      .map((h, i) => ({
        symbol: h.symbol,
        value: h.valueCAD || 0,
        percentage: total > 0 ? ((h.valueCAD || 0) / total) * 100 : 0,
        color: CHART_COLORS[i % CHART_COLORS.length].color,
        glow: CHART_COLORS[i % CHART_COLORS.length].glow,
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, total]);

  // Calculate SVG paths for donut segments
  const segments = useMemo(() => {
    const size = 200;
    const center = size / 2;
    const outerRadius = 90;
    const innerRadius = 55;
    
    let currentAngle = -90; // Start from top
    
    return allocation.map((item, index) => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      currentAngle = endAngle;
      
      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate arc points
      const x1Outer = center + outerRadius * Math.cos(startRad);
      const y1Outer = center + outerRadius * Math.sin(startRad);
      const x2Outer = center + outerRadius * Math.cos(endRad);
      const y2Outer = center + outerRadius * Math.sin(endRad);
      
      const x1Inner = center + innerRadius * Math.cos(endRad);
      const y1Inner = center + innerRadius * Math.sin(endRad);
      const x2Inner = center + innerRadius * Math.cos(startRad);
      const y2Inner = center + innerRadius * Math.sin(startRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const path = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
        `L ${x1Inner} ${y1Inner}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
        'Z'
      ].join(' ');
      
      return {
        ...item,
        path,
        index,
      };
    });
  }, [allocation]);

  const formatValue = (value: number): string => {
    if (hideBalances) return '***';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (holdings.length === 0 || total === 0) {
    return (
      <div className="p-6 rounded-lg bg-surface-secondary border border-line h-full">
        <h3 className="text-sm font-medium text-terminal-accent/60 uppercase tracking-wider mb-4">
          Allocation
        </h3>
        <div className="flex items-center justify-center h-48 text-terminal-accent/40">
          No holdings yet
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-surface-secondary border border-line h-full">
      <h3 className="text-sm font-medium text-terminal-accent/60 uppercase tracking-wider mb-4">
        Allocation
      </h3>
      
      {/* Chart Container */}
      <div className="flex flex-col items-center">
        {/* SVG Donut Chart */}
        <div className="relative">
          <svg 
            width="200" 
            height="200" 
            viewBox="0 0 200 200"
            className="transform -rotate-0"
          >
            {/* Glow filter */}
            <defs>
              {segments.map((seg, i) => (
                <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              ))}
            </defs>
            
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r="72.5"
              fill="none"
              stroke="rgba(0, 240, 255, 0.05)"
              strokeWidth="35"
            />
            
            {/* Donut segments */}
            {segments.map((seg, i) => (
              <motion.path
                key={seg.symbol}
                d={seg.path}
                fill={seg.color}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.3,
                  scale: hoveredIndex === i ? 1.02 : 1,
                }}
                transition={{ duration: 0.2 }}
                style={{
                  filter: hoveredIndex === i ? `url(#glow-${i})` : 'none',
                  transformOrigin: 'center',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hoveredIndex !== null ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div 
                  className="text-lg font-bold font-mono"
                  style={{ color: segments[hoveredIndex]?.color }}
                >
                  {segments[hoveredIndex]?.symbol}
                </div>
                <div className="text-2xl font-bold text-terminal-accent">
                  {segments[hoveredIndex]?.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-terminal-accent/60">
                  {formatValue(segments[hoveredIndex]?.value || 0)}
                </div>
              </motion.div>
            ) : (
              <div className="text-center">
                <div className="text-xs text-terminal-accent/40 uppercase tracking-wider">
                  Total
                </div>
                <div 
                  className="text-xl font-bold font-mono text-terminal-accent"
                  style={{ textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}
                >
                  {formatValue(total)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="w-full mt-6 space-y-2 max-h-40 overflow-y-auto">
          {allocation.map((item, index) => (
            <motion.div 
              key={item.symbol}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors"
              style={{
                backgroundColor: hoveredIndex === index ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              whileHover={{ x: 4 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Color indicator with glow */}
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: item.color,
                    boxShadow: hoveredIndex === index ? `0 0 8px ${item.glow}` : 'none',
                  }}
                />
                <span className="text-terminal-accent/80 font-mono text-sm truncate">
                  {item.symbol}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Percentage bar */}
                <div className="w-16 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  />
                </div>
                
                <span 
                  className="text-sm font-mono w-12 text-right"
                  style={{ color: hoveredIndex === index ? item.color : 'rgba(0, 240, 255, 0.7)' }}
                >
                  {hideBalances ? '**%' : `${item.percentage.toFixed(1)}%`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllocationChart;
