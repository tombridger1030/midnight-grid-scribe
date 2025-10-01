import React, { useState, useEffect } from 'react';
import { rankingManager, UserRank, WeeklyAssessment } from '@/lib/rankingSystem';
import { kpiManager } from '@/lib/configurableKpis';
import { getCurrentWeek, getWeeklyKPIRecord } from '@/lib/weeklyKpi';
import RankBadge from './RankBadge';
import RRProgressBar from './RRProgressBar';
import { Calendar, TrendingUp, Target, Trophy, Timer } from 'lucide-react';

interface RankingWidgetProps {
  className?: string;
  showPreview?: boolean;
}

const RankingWidget: React.FC<RankingWidgetProps> = ({
  className = '',
  showPreview = true
}) => {
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [currentWeekPreview, setCurrentWeekPreview] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [recentRRChange, setRecentRRChange] = useState(0);

  // Load user ranking data
  useEffect(() => {
    const loadRankingData = async () => {
      try {
        setLoading(true);

        // Get or initialize user rank
        let rank = await rankingManager.getUserRank();
        if (!rank) {
          rank = await rankingManager.initializeUserRank();
        }

        setUserRank(rank);

        // Get recent RR changes
        const history = await rankingManager.getRankHistory();
        if (history.length > 0) {
          const latestChange = history[0];
          setRecentRRChange(latestChange.new_rr - latestChange.old_rr);
        }

        // Calculate current week preview
        if (showPreview) {
          const preview = await calculateCurrentWeekPreview();
          setCurrentWeekPreview(preview);
        }
      } catch (error) {
        console.error('Failed to load ranking data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRankingData();
  }, [showPreview]);

  // Calculate what the current week's performance looks like so far
  const calculateCurrentWeekPreview = async (): Promise<number> => {
    try {
      const currentWeek = getCurrentWeek();
      const assessment = await rankingManager.calculateWeeklyCompletion(currentWeek);
      return assessment.completion_percentage;
    } catch (error) {
      console.error('Failed to calculate current week preview:', error);
      return 0;
    }
  };

  // Calculate estimated RR change for current week
  const getEstimatedRRChange = (): number => {
    if (!userRank || currentWeekPreview === 0) return 0;
    return rankingManager.calculateRRChange(currentWeekPreview, userRank.current_rank);
  };

  const estimatedRRChange = getEstimatedRRChange();

  if (loading) {
    return (
      <div className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}>
        <div className="animate-pulse">
          <div className="h-16 bg-terminal-accent/10 rounded mb-3"></div>
          <div className="h-4 bg-terminal-accent/10 rounded mb-2"></div>
          <div className="h-4 bg-terminal-accent/10 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!userRank) {
    return (
      <div className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}>
        <div className="text-center text-terminal-accent/60">
          <Trophy size={24} className="mx-auto mb-2 opacity-50" />
          <p>Unable to load ranking data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-terminal-accent" size={20} />
          <h3 className="text-lg font-bold text-terminal-accent">Your Rank</h3>
        </div>
        <div className="text-xs text-terminal-accent/60 flex items-center gap-1">
          <Calendar size={12} />
          Week {getCurrentWeek().split('-W')[1]}
        </div>
      </div>

      {/* Main Ranking Display */}
      <div className="flex items-start justify-between mb-4">
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          <RankBadge
            rank={userRank.current_rank}
            rrPoints={userRank.rr_points}
            size="large"
            showRR={false}
            showProgress
            className="mb-2"
          />
        </div>

        {/* Stats */}
        <div className="text-right text-sm space-y-1">
          <div className="text-terminal-accent/70">
            <span className="font-mono text-lg font-bold text-terminal-accent">
              {userRank.rr_points.toLocaleString()}
            </span>
            <span className="ml-1">RR</span>
          </div>
          <div className="text-terminal-accent/60 text-xs">
            {userRank.weeks_completed}/{userRank.total_weeks} weeks completed
          </div>
          {userRank.total_weeks > 0 && (
            <div className="text-terminal-accent/60 text-xs">
              {Math.round((userRank.weeks_completed / userRank.total_weeks) * 100)}% success rate
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <RRProgressBar
        rank={userRank.current_rank}
        rrPoints={userRank.rr_points}
        recentChange={recentRRChange}
        className="mb-4"
      />

      {/* Current Week Preview */}
      {showPreview && (
        <div className="border-t border-terminal-accent/20 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-terminal-accent/60" />
              <span className="text-sm text-terminal-accent/70">This Week</span>
            </div>
            <div className="text-sm font-mono">
              {currentWeekPreview.toFixed(0)}% complete
            </div>
          </div>

          {/* Current week progress bar */}
          <div className="w-full h-2 bg-terminal-accent/20 rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, currentWeekPreview)}%`,
                backgroundColor: currentWeekPreview >= 80 ? '#5FE3B3' :
                                currentWeekPreview >= 50 ? '#FFD700' : '#FF6B6B'
              }}
            />
          </div>

          {/* Estimated RR change */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-terminal-accent/60">Estimated change:</span>
            <div className={`flex items-center gap-1 font-mono font-bold ${
              estimatedRRChange > 0 ? 'text-green-400' :
              estimatedRRChange < 0 ? 'text-red-400' : 'text-terminal-accent/60'
            }`}>
              {estimatedRRChange > 0 ? (
                <TrendingUp size={12} />
              ) : estimatedRRChange < 0 ? (
                <TrendingUp size={12} className="rotate-180" />
              ) : (
                <Target size={12} />
              )}
              {estimatedRRChange > 0 ? '+' : ''}{estimatedRRChange} RR
            </div>
          </div>

          {/* Motivational message */}
          <div className="text-center text-xs text-terminal-accent/50 italic">
            {currentWeekPreview >= 80 ? "🔥 Excellent progress!" :
             currentWeekPreview >= 50 ? "⚡ Keep pushing!" :
             currentWeekPreview >= 20 ? "💪 You can do it!" :
             "🎯 Time to focus!"}
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingWidget;