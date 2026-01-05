/**
 * GoalCascade Component
 * 
 * Expanded view showing yearly → monthly → weekly breakdown.
 * Clean design matching Dashboard/Cash style.
 */

import React from 'react';
import { GoalWithProgress } from '@/hooks/useGoals';
import MonthlyChart from './MonthlyChart';
import WeeklySparkline from './WeeklySparkline';

interface GoalCascadeProps {
  goal: GoalWithProgress;
  accentColor?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '$' || unit === 'dollars') {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value).toLocaleString()}`;
};

const GoalCascade: React.FC<GoalCascadeProps> = ({ goal, accentColor = '#00F0FF' }) => {
  const currentMonth = new Date().getMonth();
  const monthsRemaining = 12 - currentMonth - 1;
  const remaining = Math.max(0, goal.remaining.amount);
  const perMonthNeeded = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;

  return (
    <div className="pt-4 space-y-6">
      {/* Monthly Chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wider">Monthly Progress</span>
          <span className="text-xs text-[#6B6B6B]">
            Target: {formatValue(goal.monthlyTarget, goal.unit)}/month
          </span>
        </div>
        <MonthlyChart
          monthlyActuals={goal.monthlyActuals}
          monthlyTarget={goal.monthlyTarget}
          unit={goal.unit}
          currentMonth={currentMonth}
          accentColor={accentColor}
        />
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* This Week */}
        <div className="p-3 rounded-lg bg-[#141414]">
          <div className="text-xs text-[#6B6B6B] mb-1">This Week</div>
          <div className="text-lg font-mono text-[#E8E8E8]">
            {formatValue(goal.weeklyData.current, goal.unit)}
          </div>
          <div className="mt-2 h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ 
                backgroundColor: accentColor,
                width: `${Math.min(100, (goal.weeklyData.current / goal.weeklyData.weeklyTarget) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Avg/Week */}
        <div className="p-3 rounded-lg bg-[#141414]">
          <div className="text-xs text-[#6B6B6B] mb-1">Avg/Week</div>
          <div className="text-lg font-mono text-[#E8E8E8]">
            {formatValue(goal.weeklyData.weeklyAverage, goal.unit)}
          </div>
          <div className="mt-2 text-xs text-[#6B6B6B]">
            target: {formatValue(goal.weeklyData.weeklyTarget, goal.unit)}
          </div>
        </div>

        {/* Last 4 Weeks */}
        <div className="p-3 rounded-lg bg-[#141414]">
          <div className="text-xs text-[#6B6B6B] mb-1">Last 4 Weeks</div>
          <div className="mt-2">
            <WeeklySparkline
              weeklyData={goal.weeklyData.last4Weeks}
              target={goal.weeklyData.weeklyTarget}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>

      {/* Remaining */}
      <div className="flex items-center justify-between text-xs text-[#6B6B6B] pt-2 border-t border-[#1F1F1F]">
        <span>
          Need {formatValue(remaining, goal.unit)} more
        </span>
        {monthsRemaining > 0 && (
          <span>
            {formatValue(perMonthNeeded, goal.unit)}/month to hit target
          </span>
        )}
      </div>
    </div>
  );
};

export default GoalCascade;
