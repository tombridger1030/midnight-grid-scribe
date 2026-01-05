/**
 * MonthlyActualsChart Component
 * 
 * Bar chart showing monthly actuals vs target for a goal.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { GoalAnalytics } from '@/hooks/useAnalytics';

interface MonthlyActualsChartProps {
  goal: GoalAnalytics;
}

export const MonthlyActualsChart: React.FC<MonthlyActualsChartProps> = ({
  goal,
}) => {
  const currentMonth = new Date().getMonth();

  // Color based on performance
  const getBarColor = (actual: number, target: number, monthIndex: number) => {
    if (monthIndex > currentMonth) return '#1F1F1F'; // Future months
    if (actual >= target) return '#00FF88';
    if (actual >= target * 0.8) return '#FFB800';
    return '#FF3366';
  };

  const data = goal.monthlyData.map((m, index) => ({
    ...m,
    monthIndex: index,
    isFuture: index > currentMonth,
  }));

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-terminal-accent">{goal.name}</h4>
        <div className="text-xs text-terminal-accent/40">
          Target: {Math.round(goal.yearlyTarget / 12).toLocaleString()} {goal.unit}/mo
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="month"
              stroke="#404040"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6B6B6B' }}
            />
            <YAxis
              stroke="#404040"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6B6B6B' }}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip goal={goal} />}
              cursor={{ fill: 'rgba(0, 240, 255, 0.1)' }}
            />
            <ReferenceLine
              y={goal.yearlyTarget / 12}
              stroke="#00F0FF"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar dataKey="actual" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.actual, entry.target, entry.monthIndex)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Custom tooltip
const CustomTooltip: React.FC<any> = ({ active, payload, goal }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  const pct = data.target > 0 ? (data.actual / data.target) * 100 : 0;

  return (
    <div className="bg-[#0A0A0A] border border-line rounded-lg p-3 shadow-xl">
      <div className="text-xs text-terminal-accent/60 mb-2">{data.month}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-terminal-accent/60">Actual</span>
          <span className="text-sm font-mono font-semibold text-terminal-accent">
            {data.actual.toLocaleString()} {goal.unit}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-terminal-accent/60">Target</span>
          <span className="text-sm font-mono text-terminal-accent/60">
            {data.target.toLocaleString()} {goal.unit}
          </span>
        </div>
        <div className="pt-1 border-t border-line mt-1">
          <span
            className="text-xs font-mono font-semibold"
            style={{
              color: pct >= 100 ? '#00FF88' : pct >= 80 ? '#FFB800' : '#FF3366',
            }}
          >
            {Math.round(pct)}% of target
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyActualsChart;
