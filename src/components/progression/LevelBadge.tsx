/**
 * LevelBadge Component
 * 
 * Compact display of level, rank, and streak for dashboard header.
 * Clickable to open ProgressionPanel modal.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useLevelBadge } from '@/hooks/useProgression';
import { Flame } from 'lucide-react';

interface LevelBadgeProps {
  onClick?: () => void;
  className?: string;
  showStreak?: boolean;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  onClick,
  className,
  showStreak = true,
}) => {
  const { level, rankIcon, rankName, rankColor, streak, isLoading } = useLevelBadge();

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terminal-bg/50 border border-terminal-accent/20",
        "animate-pulse",
        className
      )}>
        <div className="w-16 h-4 bg-terminal-accent/20 rounded" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-terminal-bg/50 border border-terminal-accent/20",
        "hover:bg-terminal-accent/10 hover:border-terminal-accent/40",
        "transition-all duration-200 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-terminal-accent/50",
        className
      )}
    >
      {/* Level */}
      <span className="text-sm font-mono text-terminal-accent">
        Lv.<span className="font-bold">{level}</span>
      </span>

      {/* Divider */}
      <span className="text-terminal-accent/30">|</span>

      {/* Rank */}
      <span className="flex items-center gap-1">
        <span>{rankIcon}</span>
        <span 
          className="text-sm font-medium"
          style={{ color: rankColor }}
        >
          {rankName}
        </span>
      </span>

      {/* Streak */}
      {showStreak && streak > 0 && (
        <>
          <span className="text-terminal-accent/30">|</span>
          <span className="flex items-center gap-1 text-orange-400">
            <Flame size={14} />
            <span className="text-sm font-mono">{streak}</span>
          </span>
        </>
      )}
    </button>
  );
};

export default LevelBadge;
