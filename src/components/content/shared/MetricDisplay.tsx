import React from 'react';
import { cn } from '@/lib/utils';

interface MetricDisplayProps {
  label: string;
  value: number | string | null | undefined;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  format = 'number',
  trend,
  trendValue,
  size = 'md',
  className = ''
}) => {
  const formatValue = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '—';

    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numVal)) return '—';

    switch (format) {
      case 'percentage':
        return `${Math.round(numVal * 100)}%`;
      case 'duration':
        if (numVal < 60) return `${Math.round(numVal)}s`;
        const mins = Math.floor(numVal / 60);
        const secs = Math.round(numVal % 60);
        return `${mins}m ${secs}s`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numVal);
      case 'number':
      default:
        if (numVal >= 1000000) return `${(numVal / 1000000).toFixed(1)}M`;
        if (numVal >= 1000) return `${(numVal / 1000).toFixed(1)}K`;
        return numVal.toLocaleString();
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const trendIcon = {
    up: '↗',
    down: '↘',
    neutral: '→'
  };

  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-[#8A8D93]'
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('text-[#8A8D93] opacity-70', sizeClasses[size])}>
        {label}
      </div>
      <div className={cn('text-terminal-accent font-medium', valueSizeClasses[size])}>
        {formatValue(value)}
      </div>
      {trend && trendValue !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs', trendColor[trend])}>
          <span>{trendIcon[trend]}</span>
          <span>{formatValue(Math.abs(trendValue))} vs last period</span>
        </div>
      )}
    </div>
  );
};

export default MetricDisplay;