/**
 * PeriodSelector Component
 * 
 * Button group for selecting time period.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/hooks/useAnalytics';

interface PeriodSelectorProps {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}

const PERIODS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-terminal-accent/60 mr-2">Period:</span>
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg border border-line">
        {PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cn(
              "px-4 py-2 text-sm rounded-md transition-all duration-200",
              value === period.value
                ? "bg-terminal-accent text-black font-medium"
                : "text-terminal-accent/60 hover:text-terminal-accent hover:bg-surface-hover"
            )}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PeriodSelector;
