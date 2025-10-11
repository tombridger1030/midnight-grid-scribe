import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/chartUtils';

interface MetricGaugeProps {
  label: string;
  value: number;
  target?: number;
  maxValue?: number;
  color?: string;
  size?: number;
  unit?: string;
  className?: string;
}

const MetricGauge: React.FC<MetricGaugeProps> = ({
  label,
  value,
  target,
  maxValue,
  color = '#5FE3B3',
  size = 120,
  unit = '',
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Ensure value is a valid number to prevent NaN
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeTarget = Number.isFinite(target) ? target : undefined;
  const safeMaxValue = Number.isFinite(maxValue) ? maxValue : undefined;
  
  const max = safeTarget || safeMaxValue || Math.max(safeValue * 1.5, 100);
  const progress = Math.min(safeValue / max, 1);
  const targetProgress = safeTarget ? Math.min(safeTarget / max, 1) : 0;

  // Simple semicircle gauge (180 degrees)
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;
  const center = size / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - progress);

  // Target indicator position for semicircle
  const targetAngle = Math.PI * targetProgress; // 0 to PI for semicircle
  const targetX = center - Math.cos(targetAngle) * radius;
  const targetY = center - Math.sin(targetAngle) * radius;

  const primaryDisplay = safeTarget !== undefined && safeTarget !== null
    ? `${Math.round(progress * 100)}%`
    : `${formatNumber(safeValue)}${unit}`;

  return (
    <div
      className={cn('border border-[#333] bg-[#111] rounded-sm p-4 relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col items-center">
        <div className="text-xs font-medium text-white mb-2 text-center">{label}</div>

        <div className="relative">
          <svg
            width={size}
            height={size * 0.6}
            viewBox={`0 0 ${size} ${size * 0.6}`}
            className="overflow-visible"
          >
            {/* Background arc - semicircle */}
            <path
              d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
              fill="none"
              stroke="#333"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Progress arc - semicircle */}
            <path
              d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-500',
                isHovered && 'drop-shadow-[0_0_6px_rgba(95,227,179,0.5)]'
              )}
              style={{
                filter: isHovered ? `drop-shadow(0 0 6px ${color}80)` : 'none'
              }}
            />

            {/* Target indicator */}
            {safeTarget && (
              <circle
                cx={targetX}
                cy={targetY}
                r={strokeWidth / 3}
                fill="#FFF"
                stroke={color}
                strokeWidth="1"
                className="drop-shadow-sm"
              />
            )}
          </svg>

          {/* Center value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
            <div
              className={cn(
                'text-lg font-bold transition-all duration-300',
                isHovered ? 'text-white scale-110' : 'text-white'
              )}
            >
              {primaryDisplay}
            </div>
            {safeTarget !== undefined && safeTarget !== null && (
              <div className="text-xs text-[#8A8D93]">
                {formatNumber(safeValue)}{unit} of {formatNumber(safeTarget)}{unit}
              </div>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-2 flex items-center gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            progress >= 0.9 ? 'bg-green-500' :
            progress >= 0.7 ? 'bg-yellow-500' :
            progress >= 0.4 ? 'bg-orange-500' :
            'bg-red-500'
          )}></div>
          <div className="text-xs text-[#8A8D93]">
            {progress >= 0.9 ? 'Excellent' :
             progress >= 0.7 ? 'Good' :
             progress >= 0.4 ? 'Fair' :
             'Needs Improvement'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricGauge;