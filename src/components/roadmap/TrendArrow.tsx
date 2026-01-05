import React from 'react';

interface TrendArrowProps {
  percentChange: number;
  size?: 'sm' | 'md';
}

const TrendArrow: React.FC<TrendArrowProps> = ({ percentChange, size = 'md' }) => {
  const isUp = percentChange > 5;
  const isDown = percentChange < -5;
  const isFlat = !isUp && !isDown;

  const arrow = isUp ? '▲' : isDown ? '▼' : '─';
  const color = isUp ? 'text-[#5FE3B3]' : isDown ? 'text-[#FF6B6B]' : 'text-terminal-accent/50';
  const sizeClasses = size === 'sm' ? 'text-xs' : 'text-sm';

  const displayValue = isFlat
    ? '0%'
    : `${percentChange > 0 ? '+' : ''}${Math.round(percentChange)}%`;

  return (
    <span className={`flex items-center gap-1 ${color} ${sizeClasses} font-mono`}>
      <span>{arrow}</span>
      <span>{displayValue}</span>
    </span>
  );
};

export default TrendArrow;
