/**
 * RankBar Component
 * 
 * Valorant-style rank display with progress bar.
 * Shows current rank, RR, progress to next rank, and weekly change.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Rank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface RankBarProps {
  rank: Rank;
  rrPoints: number;
  rrToNextRank: number;
  nextRank: Rank | null;
  rrChangeThisWeek: number;
  rankProgress: number;
  onClick?: () => void;
  className?: string;
}

const RANK_CONFIG: Record<Rank, { color: string; icon: string; name: string }> = {
  bronze: { color: '#CD7F32', icon: '🥉', name: 'Bronze' },
  silver: { color: '#C0C0C0', icon: '🥈', name: 'Silver' },
  gold: { color: '#FFD700', icon: '🥇', name: 'Gold' },
  platinum: { color: '#E5E4E2', icon: '🏅', name: 'Platinum' },
  diamond: { color: '#B9F2FF', icon: '👑', name: 'Diamond' },
};

export const RankBar: React.FC<RankBarProps> = ({
  rank,
  rrPoints,
  rrToNextRank,
  nextRank,
  rrChangeThisWeek,
  rankProgress,
  onClick,
  className,
}) => {
  const config = RANK_CONFIG[rank];
  const nextConfig = nextRank ? RANK_CONFIG[nextRank] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg cursor-pointer",
        "bg-terminal-bg/50 border border-terminal-accent/30",
        "hover:border-terminal-accent/50 transition-colors duration-200",
        className
      )}
    >
      {/* Top row: Rank name and RR */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <span 
            className="text-xl font-bold uppercase tracking-wide"
            style={{ color: config.color }}
          >
            {config.name}
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-terminal-accent">
            {rrPoints.toLocaleString()}
          </span>
          <span className="text-terminal-accent/60 text-sm ml-1">RR</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-terminal-accent/20 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: config.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, rankProgress)}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>

      {/* Bottom row: RR to next rank and weekly change */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-terminal-accent/60">
          {nextConfig ? (
            <>
              <span className="font-mono">{rrToNextRank}</span>
              <span> RR to </span>
              <span style={{ color: nextConfig.color }}>{nextConfig.name}</span>
            </>
          ) : (
            <span style={{ color: config.color }}>Max Rank!</span>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-1 font-mono",
          rrChangeThisWeek >= 0 ? "text-[#5FE3B3]" : "text-[#FF6B6B]"
        )}>
          {rrChangeThisWeek >= 0 ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}
          <span>
            {rrChangeThisWeek >= 0 ? '+' : ''}{rrChangeThisWeek} this week
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default RankBar;
