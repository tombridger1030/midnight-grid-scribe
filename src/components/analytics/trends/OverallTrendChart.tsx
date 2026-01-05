/**
 * OverallTrendChart Component
 * 
 * Line chart showing weekly completion percentages over time.
 * Includes rolling average overlay and 100% target line.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import type { WeekDataPoint } from '@/hooks/useAnalytics';

interface OverallTrendChartProps {
  data: WeekDataPoint[];
  rollingAverage: number[];
}

export const OverallTrendChart: React.FC<OverallTrendChartProps> = ({
  data,
  rollingAverage,
}) => {
  const chartData = useMemo(() => {
    return data.map((point, index) => ({
      weekKey: point.weekKey,
      label: formatWeekLabel(point.weekKey),
      percentage: point.percentage,
      rollingAvg: rollingAverage[index] || point.percentage,
    }));
  }, [data, rollingAverage]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-surface-secondary border border-line p-8 text-center">
        <div className="text-terminal-accent/60">No trend data available</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-terminal-accent uppercase tracking-wider">
          Weekly Performance Trend
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#00F0FF]" />
            <span className="text-terminal-accent/60">Weekly</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#00FF88]" />
            <span className="text-terminal-accent/60">4-Week Avg</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1F1F1F"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              stroke="#404040"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{ fill: '#6B6B6B' }}
            />

            <YAxis
              stroke="#404040"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, 120]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#6B6B6B' }}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#00F0FF', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {/* 100% Target Reference Line */}
            <ReferenceLine
              y={100}
              stroke="#00FF88"
              strokeDasharray="5 5"
              strokeWidth={1}
              label={{
                value: 'Target',
                fill: '#00FF88',
                fontSize: 10,
                position: 'right',
              }}
            />

            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="percentage"
              fill="url(#areaGradient)"
              stroke="none"
            />

            {/* Main line */}
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#00F0FF"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#00F0FF',
                stroke: '#0A0A0A',
                strokeWidth: 2,
              }}
            />

            {/* Rolling average line */}
            <Line
              type="monotone"
              dataKey="rollingAvg"
              stroke="#00FF88"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const weekData = payload[0]?.payload;

  return (
    <div className="bg-[#0A0A0A] border border-line rounded-lg p-3 shadow-xl">
      <div className="text-xs text-terminal-accent/60 mb-2">{weekData?.weekKey}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-[#00F0FF]">Weekly</span>
          <span className="text-sm font-mono font-semibold text-[#00F0FF]">
            {weekData?.percentage}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-[#00FF88]">Rolling Avg</span>
          <span className="text-sm font-mono font-semibold text-[#00FF88]">
            {Math.round(weekData?.rollingAvg || 0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Format week key to shorter label
function formatWeekLabel(weekKey: string): string {
  // "2025-W15" -> "W15"
  const match = weekKey.match(/W(\d+)/);
  return match ? `W${match[1]}` : weekKey;
}

export default OverallTrendChart;
