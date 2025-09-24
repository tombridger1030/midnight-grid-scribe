import React from 'react';
import { cn } from '@/lib/utils';

export type TimeRange = '7d' | '30d' | '90d';

interface TimeFilterProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

const TimeFilter: React.FC<TimeFilterProps> = ({ selected, onChange, className = '' }) => {
  const options: { value: TimeRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  return (
    <div className={cn('flex items-center gap-1 text-xs', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 rounded-sm border transition-colors',
            selected === option.value
              ? 'bg-[#5FE3B3] text-black border-[#5FE3B3]'
              : 'bg-[#1D1D1D] text-[#8A8D93] border-[#333] hover:bg-[#2A2A2A]'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimeFilter;