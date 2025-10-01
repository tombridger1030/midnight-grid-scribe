import React from 'react';
import { RankTier, RANK_CONFIG } from '@/lib/rankingSystem';

interface RankBadgeProps {
  rank: RankTier;
  rrPoints: number;
  size?: 'small' | 'medium' | 'large';
  showRR?: boolean;
  showProgress?: boolean;
  className?: string;
}

const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  rrPoints,
  size = 'medium',
  showRR = true,
  showProgress = false,
  className = ''
}) => {
  const rankConfig = RANK_CONFIG[rank];

  // Calculate progress within current rank
  const progress = ((rrPoints - rankConfig.min_rr) / (rankConfig.max_rr - rankConfig.min_rr)) * 100;
  const progressClamped = Math.max(0, Math.min(100, progress));

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-16 h-8 text-xs',
      icon: 'text-sm',
      text: 'text-xs',
      rr: 'text-xs'
    },
    medium: {
      container: 'w-24 h-12 text-sm',
      icon: 'text-lg',
      text: 'text-sm',
      rr: 'text-xs'
    },
    large: {
      container: 'w-32 h-16 text-base',
      icon: 'text-2xl',
      text: 'text-base',
      rr: 'text-sm'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`relative ${className}`}>
      {/* Main Badge */}
      <div
        className={`
          ${config.container}
          relative border-2 rounded-lg flex items-center justify-center
          bg-gradient-to-br from-transparent to-black/20
          transition-all duration-300 hover:scale-105
          ${config.text}
        `}
        style={{
          borderColor: rankConfig.color,
          background: `linear-gradient(135deg, ${rankConfig.color}20, ${rankConfig.color}10)`
        }}
      >
        {/* Rank Icon */}
        <div className={`${config.icon} mr-1`}>
          {rankConfig.icon}
        </div>

        {/* Rank Name */}
        <div
          className={`font-bold ${config.text}`}
          style={{ color: rankConfig.color }}
        >
          {rankConfig.name.toUpperCase()}
        </div>

        {/* Progress Bar (if enabled) */}
        {showProgress && (
          <div
            className="absolute bottom-0 left-0 h-1 rounded-b-md transition-all duration-500"
            style={{
              width: `${progressClamped}%`,
              backgroundColor: rankConfig.color,
              boxShadow: `0 0 8px ${rankConfig.color}40`
            }}
          />
        )}
      </div>

      {/* RR Points Display */}
      {showRR && (
        <div
          className={`
            mt-1 text-center font-mono ${config.rr}
            opacity-80
          `}
          style={{ color: rankConfig.color }}
        >
          {rrPoints.toLocaleString()} RR
        </div>
      )}

      {/* Progress Tooltip */}
      {showProgress && size !== 'small' && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-terminal-accent/60">
          {progressClamped.toFixed(0)}%
        </div>
      )}
    </div>
  );
};

export default RankBadge;