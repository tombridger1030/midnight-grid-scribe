/**
 * DistributionChart Component
 * 
 * Histogram showing distribution of weekly scores.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { calculateMean, calculateMedian } from '@/lib/analyticsCalculations';

interface DistributionChartProps {
  data: number[];
  title: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  title,
}) => {
  // Create histogram buckets
  const histogram = useMemo(() => {
    const buckets = [
      { label: '0-20%', min: 0, max: 20, count: 0, color: '#FF3366' },
      { label: '20-40%', min: 20, max: 40, count: 0, color: '#FF6B6B' },
      { label: '40-60%', min: 40, max: 60, count: 0, color: '#FFB800' },
      { label: '60-80%', min: 60, max: 80, count: 0, color: '#00F0FF' },
      { label: '80-100%', min: 80, max: 100, count: 0, color: '#00FF88' },
      { label: '100%+', min: 100, max: Infinity, count: 0, color: '#00FF88' },
    ];

    data.forEach(value => {
      for (const bucket of buckets) {
        if (value >= bucket.min && value < bucket.max) {
          bucket.count++;
          break;
        }
        if (bucket.max === Infinity && value >= bucket.min) {
          bucket.count++;
          break;
        }
      }
    });

    return buckets;
  }, [data]);

  const maxCount = Math.max(...histogram.map(b => b.count), 1);
  const mean = calculateMean(data);
  const median = calculateMedian(data);
  const totalWeeks = data.length;

  // Calculate percentages for insights
  const above80Pct = data.filter(v => v >= 80).length / totalWeeks * 100;
  const perfectWeeks = data.filter(v => v >= 100).length;

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-surface-secondary border border-line p-8 text-center">
        <div className="text-terminal-accent/60">No distribution data available</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-6 uppercase tracking-wider">
        {title}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histogram */}
        <div className="lg:col-span-2">
          <div className="flex items-end gap-2 h-48">
            {histogram.map((bucket, index) => {
              const heightPct = (bucket.count / maxCount) * 100;
              
              return (
                <div key={bucket.label} className="flex-1 flex flex-col items-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="w-full rounded-t-md relative group cursor-default"
                    style={{
                      backgroundColor: bucket.color,
                      minHeight: bucket.count > 0 ? '8px' : '0px',
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-[#0A0A0A] border border-line rounded px-2 py-1 text-xs whitespace-nowrap">
                        <span className="font-mono font-semibold">{bucket.count}</span>
                        <span className="text-terminal-accent/60"> weeks</span>
                      </div>
                    </div>
                  </motion.div>
                  <div className="mt-2 text-xs text-terminal-accent/40 text-center">
                    {bucket.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-surface-primary/50 border border-line">
            <div className="text-xs text-terminal-accent/60 mb-1">Average Score</div>
            <div className="text-2xl font-bold font-mono text-[#00F0FF]">
              {Math.round(mean)}%
            </div>
          </div>

          <div className="p-4 rounded-lg bg-surface-primary/50 border border-line">
            <div className="text-xs text-terminal-accent/60 mb-1">Median Score</div>
            <div className="text-2xl font-bold font-mono text-[#00F0FF]">
              {Math.round(median)}%
            </div>
          </div>

          <div className="p-4 rounded-lg bg-surface-primary/50 border border-line">
            <div className="text-xs text-terminal-accent/60 mb-1">Hit 80%+ Rate</div>
            <div className="text-2xl font-bold font-mono text-[#00FF88]">
              {Math.round(above80Pct)}%
            </div>
            <div className="text-xs text-terminal-accent/40 mt-1">
              of {totalWeeks} weeks
            </div>
          </div>

          <div className="p-4 rounded-lg bg-surface-primary/50 border border-line">
            <div className="text-xs text-terminal-accent/60 mb-1">Perfect Weeks</div>
            <div className="text-2xl font-bold font-mono text-[#FFB800]">
              {perfectWeeks}
            </div>
            <div className="text-xs text-terminal-accent/40 mt-1">
              100%+ completion
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionChart;
