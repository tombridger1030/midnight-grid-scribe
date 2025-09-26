import React from 'react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  // Traditional usage with current/previous values
  label?: string;
  current?: number;
  previous?: number;
  format?: 'number' | 'percentage' | 'currency';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;

  // Direct trend usage (alternative interface)
  direction?: 'up' | 'down' | 'neutral';
  percentage?: number;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  label,
  current,
  previous,
  format = 'number',
  size = 'md',
  showIcon = true,
  className = '',
  direction,
  percentage
}) => {

  // Handle direct trend usage vs calculated trend
  let trend: 'up' | 'down' | 'neutral';
  let percentageChange: number;
  let safeCurrent: number;
  let safePrevious: number;

  if (direction !== undefined && percentage !== undefined) {
    // Direct trend usage
    trend = direction;
    percentageChange = percentage;
    safeCurrent = 0;
    safePrevious = 0;
  } else {
    // Traditional calculated trend usage
    safeCurrent = current != null && isFinite(current) ? current : 0;
    safePrevious = previous != null && isFinite(previous) ? previous : 0;

    // Calculate trend
    const change = safeCurrent - safePrevious;
    percentageChange = safePrevious !== 0 ? (change / Math.abs(safePrevious)) * 100 : 0;
    trend = Math.abs(percentageChange) < 1 ? 'neutral' :
                    percentageChange > 0 ? 'up' : 'down';
  }

  // Format value based on type
  const formatValue = (value: number) => {
    // Handle undefined, null, or NaN values
    if (value == null || isNaN(value) || !isFinite(value)) {
      return '0';
    }

    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      default:
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toLocaleString();
    }
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const textSizes = {
    sm: { main: 'text-lg', label: 'text-xs', change: 'text-xs' },
    md: { main: 'text-xl', label: 'text-sm', change: 'text-xs' },
    lg: { main: 'text-2xl', label: 'text-base', change: 'text-sm' }
  };

  const trendColors = {
    up: 'text-accent-cyan',
    down: 'text-accent-red cyberpunk-pulse-critical',
    neutral: 'text-[#8A8D93]'
  };

  const trendBgColors = {
    up: 'bg-accent-cyan/10',
    down: 'bg-accent-red/10 cyberpunk-panel',
    neutral: 'bg-[#333]/30'
  };

  const getTrendIcon = () => {
    if (!showIcon) return null;

    const iconClass = cn('w-4 h-4', trendColors[trend]);

    if (trend === 'up') {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V8m0 0H8" />
        </svg>
      );
    } else if (trend === 'down') {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v9m0 0h9" />
        </svg>
      );
    } else {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      );
    }
  };

  // For direct trend usage, show a simple icon with percentage
  if (direction !== undefined && percentage !== undefined) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {getTrendIcon()}
        <div className={cn('text-xs font-medium', trendColors[trend])}>
          {trend === 'neutral' ? '—' : `${Math.abs(percentageChange).toFixed(1)}%`}
        </div>
      </div>
    );
  }

  // Traditional full card display
  return (
    <div
      className={cn(
        'border border-[#333] bg-[#111] rounded-sm',
        sizeClasses[size],
        className
      )}
    >
      <div className="flex flex-col">
        {/* Label */}
        {label && (
          <div className={cn(textSizes[size].label, 'text-[#8A8D93] font-medium mb-1')}>
            {label}
          </div>
        )}

        {/* Current Value */}
        <div className={cn(textSizes[size].main, 'text-white font-bold mb-2')}>
          {formatValue(safeCurrent)}
        </div>

        {/* Trend Indicator */}
        <div className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-sm',
          trendBgColors[trend],
          trend === 'down' && 'cyberpunk-glow-magenta'
        )}>
          {getTrendIcon()}
          <div className={cn(textSizes[size].change, trendColors[trend], 'font-medium')}>
            {trend === 'neutral' ? 'No change' :
             `${Math.abs(percentageChange).toFixed(1)}% ${trend === 'up' ? 'increase' : 'decrease'}`}
          </div>
        </div>

      </div>

    </div>
  );
};

export default TrendIndicator;