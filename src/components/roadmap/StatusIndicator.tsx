import React from 'react';

export type GoalStatus = 'on-pace' | 'slightly-behind' | 'behind';

interface StatusIndicatorProps {
  status: GoalStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  'on-pace': {
    icon: '●',
    label: 'ON PACE',
    color: 'text-[#5FE3B3]',
    bgColor: 'bg-[#5FE3B3]',
  },
  'slightly-behind': {
    icon: '◐',
    label: 'SLIGHTLY BEHIND',
    color: 'text-[#FFD700]',
    bgColor: 'bg-[#FFD700]',
  },
  'behind': {
    icon: '○',
    label: 'BEHIND',
    color: 'text-[#FF6B6B]',
    bgColor: 'bg-[#FF6B6B]',
  },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showLabel = false,
  size = 'md',
}) => {
  const config = STATUS_CONFIG[status];
  const sizeClasses = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex items-center gap-1.5 ${sizeClasses}`}>
      <span className={config.color}>{config.icon}</span>
      {showLabel && (
        <span className={`${config.color} font-medium tracking-wide`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
