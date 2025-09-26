import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/chartUtils';

interface PerformanceBarProps {
  label: string;
  value: number;
  maxValue?: number;
  target?: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  showValue?: boolean;
  showTarget?: boolean;
  className?: string;
}

const PerformanceBar: React.FC<PerformanceBarProps> = ({
  label,
  value,
  maxValue,
  target,
  color = '#5FE3B3',
  backgroundColor = '#333',
  height = 20,
  showValue = true,
  showTarget = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const max = maxValue || Math.max(value, target || 0) * 1.2;
  const progress = Math.min(value / max, 1);
  const targetProgress = target ? Math.min(target / max, 1) : 0;

  return (
    <div
      className={cn('space-y-2', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Label and Value */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-white">{label}</div>
        {showValue && (
          <div className="text-xs text-[#8A8D93]">
            {formatNumber(value)}
            {target && ` / ${formatNumber(target)}`}
          </div>
        )}
      </div>

      {/* Bar Container */}
      <div className="relative">
        {/* Background Bar */}
        <div
          className="w-full rounded-sm transition-all duration-300"
          style={{
            height: height,
            backgroundColor: backgroundColor,
            opacity: isHovered ? 0.8 : 0.6
          }}
        />

        {/* Progress Bar */}
        <div
          className="absolute top-0 left-0 rounded-sm transition-all duration-500 ease-out"
          style={{
            height: height,
            width: `${progress * 100}%`,
            backgroundColor: color,
            boxShadow: isHovered ? `0 0 8px ${color}40` : 'none',
            filter: isHovered ? 'brightness(1.1)' : 'none'
          }}
        />

        {/* Target Indicator */}
        {target && showTarget && targetProgress > 0 && (
          <div
            className="absolute top-0 w-0.5 bg-white rounded-full transition-all duration-300"
            style={{
              height: height,
              left: `${targetProgress * 100}%`,
              boxShadow: isHovered ? '0 0 4px rgba(255,255,255,0.8)' : 'none'
            }}
          />
        )}

        {/* Glow Effect on Hover */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-sm pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${color}20 ${progress * 100}%, transparent ${progress * 100}%)`,
              filter: 'blur(2px)'
            }}
          />
        )}
      </div>

      {/* Status Text */}
      <div className="flex items-center justify-between text-xs">
        <div className={cn(
          'font-medium transition-colors duration-300',
          target && value >= target ? 'text-green-400' :
          target && value >= target * 0.8 ? 'text-yellow-400' :
          target && value >= target * 0.6 ? 'text-orange-400' :
          target ? 'text-red-400' :
          'text-[#8A8D93]'
        )}>
          {target && value >= target ? '✓ Target reached' :
           target && value >= target * 0.8 ? '⚡ Almost there' :
           target && value >= target * 0.6 ? '📈 Good progress' :
           target ? '🔥 Needs boost' :
           'Tracking...'}
        </div>
        <div className="text-[#8A8D93]">
          {(progress * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default PerformanceBar;