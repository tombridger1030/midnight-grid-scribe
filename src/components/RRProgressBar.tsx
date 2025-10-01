import React from 'react';
import { RankTier, RANK_CONFIG } from '@/lib/rankingSystem';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RRProgressBarProps {
  rank: RankTier;
  rrPoints: number;
  recentChange?: number;
  showNextRank?: boolean;
  className?: string;
}

const RRProgressBar: React.FC<RRProgressBarProps> = ({
  rank,
  rrPoints,
  recentChange = 0,
  showNextRank = true,
  className = ''
}) => {
  const currentRankConfig = RANK_CONFIG[rank];

  // Calculate progress within current rank
  const progress = ((rrPoints - currentRankConfig.min_rr) / (currentRankConfig.max_rr - currentRankConfig.min_rr)) * 100;
  const progressClamped = Math.max(0, Math.min(100, progress));

  // Get next rank info
  const ranks: RankTier[] = ['bronze', 'gold', 'platinum', 'diamond', 'grandmaster'];
  const currentIndex = ranks.indexOf(rank);
  const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;
  const nextRankConfig = nextRank ? RANK_CONFIG[nextRank] : null;

  // Calculate RR needed for next rank
  const rrToNextRank = nextRankConfig ? nextRankConfig.min_rr - rrPoints : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress Bar Container */}
      <div className="relative">
        {/* Background Bar */}
        <div className="w-full h-3 bg-terminal-bg/40 rounded-full border border-terminal-accent/20">
          {/* Progress Fill */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out relative"
            style={{
              width: `${progressClamped}%`,
              background: `linear-gradient(90deg, ${currentRankConfig.color}80, ${currentRankConfig.color})`,
              boxShadow: `0 0 8px ${currentRankConfig.color}40`
            }}
          >
          </div>
        </div>

        {/* RR Points Display */}
        <div className="flex justify-between items-center mt-1 text-xs">
          {/* Current RR */}
          <div className="flex items-center gap-1">
            <span style={{ color: currentRankConfig.color }} className="font-mono font-bold">
              {rrPoints.toLocaleString()}
            </span>
            <span className="text-terminal-accent/60">RR</span>

            {/* Recent Change Indicator */}
            {recentChange !== 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  recentChange > 0 ? 'bg-green-900/30' : 'bg-red-900/30'
                }`}
              >
                {recentChange > 0 ? (
                  <TrendingUp size={10} className="text-green-400" />
                ) : (
                  <TrendingDown size={10} className="text-red-400" />
                )}
                <span className={recentChange > 0 ? 'text-green-400' : 'text-red-400'}>
                  {recentChange > 0 ? '+' : ''}{recentChange}
                </span>
              </div>
            )}
          </div>

          {/* Next Rank Info */}
          {showNextRank && nextRankConfig && (
            <div className="flex items-center gap-1 text-terminal-accent/60">
              <span>{nextRankConfig.icon}</span>
              <span className="text-xs">
                {rrToNextRank > 0 ? `${rrToNextRank.toLocaleString()} to ${nextRankConfig.name}` : nextRankConfig.name}
              </span>
            </div>
          )}

          {/* Max rank indicator */}
          {!nextRankConfig && (
            <div className="flex items-center gap-1 text-purple-400">
              <span>👑</span>
              <span className="text-xs">Max Rank</span>
            </div>
          )}
        </div>
      </div>

      {/* Rank Range Display */}
      <div className="flex justify-between text-xs text-terminal-accent/40">
        <span>{currentRankConfig.min_rr.toLocaleString()}</span>
        <span className="flex items-center gap-1">
          <span style={{ color: currentRankConfig.color }}>{currentRankConfig.name}</span>
          <span>({progressClamped.toFixed(0)}%)</span>
        </span>
        <span>
          {currentRankConfig.max_rr >= 9999 ? '∞' : currentRankConfig.max_rr.toLocaleString()}
        </span>
      </div>

    </div>
  );
};

export default RRProgressBar;