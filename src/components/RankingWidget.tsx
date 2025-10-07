import React, { useState, useEffect } from 'react';
import { rankingManager, UserRank, WeeklyAssessment, RankChange } from '@/lib/rankingSystem';
import { kpiManager } from '@/lib/configurableKpis';
import { getCurrentWeek, getWeeklyKPIRecord, loadWeeklyKPIs } from '@/lib/weeklyKpi';
import RankBadge from './RankBadge';
import RRProgressBar from './RRProgressBar';
import { Calendar, TrendingUp, Target, Trophy, Timer, ChevronLeft, ChevronRight, RotateCcw, Bug } from 'lucide-react';

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
  const [rankHistory, setRankHistory] = useState<RankChange[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [allWeeks, setAllWeeks] = useState<string[]>([]);
  const [userKPIs, setUserKPIs] = useState<any[]>([]);

  // Refresh rank history when KPI data changes
  const refreshRankHistory = async () => {
    try {
      console.log('🔄 Refreshing rank history...');
      const history = await rankingManager.getRankHistory();
      setRankHistory(history);
      
      // Update week navigation
      if (history.length > 0) {
        const latestChange = history[0];
        setRecentRRChange(latestChange.new_rr - latestChange.old_rr);
        
        // Set up weeks for navigation (include current week if not in history)
        const currentWeek = getCurrentWeek();
        const weeks = [...new Set([currentWeek, ...history.map(change => change.week_key)])].sort().reverse();
        setAllWeeks(weeks);
        setSelectedWeekIndex(0); // Reset to current/latest week
      }
    } catch (error) {
      console.error('Failed to refresh rank history:', error);
    }
  };

  // Debug rank history regeneration
  const debugRankHistory = async () => {
    try {
      console.log('🔍 DEBUG: Starting detailed rank history regeneration...');
      await rankingManager.debugRegenerateRankHistory();
      await refreshRankHistory(); // Refresh the UI after debug regeneration
    } catch (error) {
      console.error('Failed to debug regenerate rank history:', error);
    }
  };

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

        // Load user KPIs for accurate calculations
        const activeKPIs = await kpiManager.getActiveKPIs();
        setUserKPIs(activeKPIs);

        // Get recent RR changes and history
        const history = await rankingManager.getRankHistory();
        setRankHistory(history);
        
        if (history.length > 0) {
          const latestChange = history[0];
          setRecentRRChange(latestChange.new_rr - latestChange.old_rr);
          
          // Set up weeks for navigation (include current week if not in history)
          const currentWeek = getCurrentWeek();
          const weeks = [...new Set([currentWeek, ...history.map(change => change.week_key)])].sort().reverse();
          setAllWeeks(weeks);
          setSelectedWeekIndex(0); // Start with current/latest week
        } else {
          // If no history, just show current week
          const currentWeek = getCurrentWeek();
          setAllWeeks([currentWeek]);
          setSelectedWeekIndex(0);
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

  // Periodically check for rank history updates (when KPI data changes)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Simple check: if we have KPI data but limited rank history, try regenerating
        const localData = loadWeeklyKPIs();
        const kpiWeeksCount = localData.records.filter(r => r.values && Object.keys(r.values).length > 0).length;
        
        if (kpiWeeksCount > 1 && rankHistory.length < kpiWeeksCount) {
          console.log(`🔄 KPI weeks (${kpiWeeksCount}) > rank history weeks (${rankHistory.length}), refreshing...`);
          await refreshRankHistory();
        }
      } catch (error) {
        console.error('Failed to check for rank history updates:', error);
      }
    };

    if (!loading && rankHistory.length > 0) {
      checkForUpdates();
    }
  }, [loading, rankHistory.length]);

  // Listen for storage changes (when KPI data is updated)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'noctisium-weekly-kpis' && e.newValue !== e.oldValue) {
        console.log('📊 KPI data changed, refreshing rank history...');
        setTimeout(() => refreshRankHistory(), 1000); // Delay to ensure data is fully saved
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Calculate what the current week's performance looks like so far
  const calculateCurrentWeekPreview = async (): Promise<number> => {
    try {
      const currentWeek = getCurrentWeek();
      const weekRecord = getWeeklyKPIRecord(currentWeek);
      const activeKPIs = await kpiManager.getActiveKPIs();
      
      if (!weekRecord || !weekRecord.values || activeKPIs.length === 0) {
        return 0;
      }
      
      // Use the same calculation method as WeeklyKPI components
      return kpiManager.calculateWeekCompletion(weekRecord.values, activeKPIs);
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

  // Navigation functions for week browsing
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    } else if (direction === 'next' && selectedWeekIndex < allWeeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    }
  };

  // Get data for the currently selected week
  const getSelectedWeekData = () => {
    if (allWeeks.length === 0 || selectedWeekIndex >= allWeeks.length) return null;
    
    const weekKey = allWeeks[selectedWeekIndex];
    const currentWeek = getCurrentWeek();
    const isCurrentWeek = weekKey === currentWeek;
    
    if (isCurrentWeek) {
      // For current week, show live preview
      return {
        weekKey,
        weekNumber: weekKey.split('-W')[1],
        year: weekKey.split('-W')[0],
        completion: currentWeekPreview,
        estimatedChange: getEstimatedRRChange(),
        isCurrentWeek: true,
        isLatestWeek: selectedWeekIndex === 0
      };
    } else {
      // For past weeks, show actual data from history
      const weekChange = rankHistory.find(change => change.week_key === weekKey);
      if (weekChange) {
        return {
          weekKey,
          weekNumber: weekKey.split('-W')[1],
          year: weekKey.split('-W')[0],
          completion: weekChange.completion_percentage,
          actualChange: weekChange.new_rr - weekChange.old_rr,
          rankBefore: weekChange.old_rank,
          rankAfter: weekChange.new_rank,
          isCurrentWeek: false,
          isLatestWeek: selectedWeekIndex === 0
        };
      }
      
      // If no rank history, calculate from KPI data directly (synchronously)
      try {
        const weekRecord = getWeeklyKPIRecord(weekKey);
        
        if (!weekRecord || !weekRecord.values) {
          return null;
        }
        
        // Use the same calculation as WeekStreakChart (with proper KPI logic)
        const completion = userKPIs.length > 0 ? 
          Math.round(kpiManager.calculateWeekCompletion(weekRecord.values, userKPIs)) : 0;
        
        return {
          weekKey,
          weekNumber: weekKey.split('-W')[1],
          year: weekKey.split('-W')[0],
          completion,
          actualChange: 0, // No RR change calculated for weeks without history
          isCurrentWeek: false,
          isLatestWeek: selectedWeekIndex === 0
        };
      } catch (error) {
        console.error(`Failed to calculate completion for week ${weekKey}:`, error);
        return null;
      }
    }
  };

  const estimatedRRChange = getEstimatedRRChange();
  const selectedWeekData = getSelectedWeekData();

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
        <div className="flex items-center gap-3">
          <button
            onClick={refreshRankHistory}
            className="p-1 rounded transition-colors text-terminal-accent/50 hover:text-terminal-accent hover:bg-terminal-accent/10"
            title="Refresh rank history"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={debugRankHistory}
            className="p-1 rounded transition-colors text-terminal-accent/30 hover:text-terminal-accent hover:bg-terminal-accent/10"
            title="Debug rank history (check console)"
          >
            <Bug size={14} />
          </button>
          <div className="text-xs text-terminal-accent/60 flex items-center gap-1">
            <Calendar size={12} />
            Week {getCurrentWeek().split('-W')[1]}
          </div>
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

      {/* Week Preview with Navigation */}
      {showPreview && selectedWeekData && (
        <div className="border-t border-terminal-accent/20 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-terminal-accent/60" />
              <span className="text-sm text-terminal-accent/70">
                {selectedWeekData.isCurrentWeek ? 'This Week' : `Week ${selectedWeekData.weekNumber}`}
                {selectedWeekData.isCurrentWeek && <span className="ml-1 text-green-400">● Live</span>}
              </span>
            </div>
            
            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('next')}
                disabled={selectedWeekIndex >= allWeeks.length - 1}
                className={`p-1 rounded transition-colors ${
                  selectedWeekIndex >= allWeeks.length - 1
                    ? 'text-terminal-accent/20 cursor-not-allowed'
                    : 'text-terminal-accent/50 hover:text-terminal-accent hover:bg-terminal-accent/10'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="text-sm font-mono min-w-[80px] text-center">
                {selectedWeekData.completion.toFixed(0)}% complete
              </div>
              
              <button
                onClick={() => navigateWeek('prev')}
                disabled={selectedWeekIndex <= 0}
                className={`p-1 rounded transition-colors ${
                  selectedWeekIndex <= 0
                    ? 'text-terminal-accent/20 cursor-not-allowed'
                    : 'text-terminal-accent/50 hover:text-terminal-accent hover:bg-terminal-accent/10'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Week progress bar */}
          <div className="w-full h-2 bg-terminal-accent/20 rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, selectedWeekData.completion)}%`,
                backgroundColor: selectedWeekData.completion >= 80 ? '#5FE3B3' :
                                selectedWeekData.completion >= 50 ? '#FFD700' : '#FF6B6B'
              }}
            />
          </div>

          {/* RR change - estimated for current week, actual for past weeks */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-terminal-accent/60">
              {selectedWeekData.isCurrentWeek ? 'Estimated change:' : 'Actual change:'}
            </span>
            {(() => {
              const change = selectedWeekData.isCurrentWeek ? 
                (selectedWeekData.estimatedChange || 0) : 
                (selectedWeekData.actualChange || 0);
              
              return (
                <div className={`flex items-center gap-1 font-mono font-bold ${
                  change > 0 ? 'text-green-400' :
                  change < 0 ? 'text-red-400' : 'text-terminal-accent/60'
                }`}>
                  {change > 0 ? (
                    <TrendingUp size={12} />
                  ) : change < 0 ? (
                    <TrendingUp size={12} className="rotate-180" />
                  ) : (
                    <Target size={12} />
                  )}
                  {change > 0 ? '+' : ''}{change} RR
                </div>
              );
            })()}
          </div>

          {/* Week indicator and motivational message */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-terminal-accent/50">
              {selectedWeekIndex + 1} of {allWeeks.length} weeks
            </span>
            <div className="text-terminal-accent/50 italic">
              {selectedWeekData.isCurrentWeek ? (
                selectedWeekData.completion >= 80 ? "🔥 Excellent!" :
                selectedWeekData.completion >= 50 ? "⚡ Keep going!" :
                selectedWeekData.completion >= 20 ? "💪 You got this!" :
                "🎯 Focus time!"
              ) : (
                selectedWeekData.completion >= 80 ? "🔥 Great week!" :
                selectedWeekData.completion >= 50 ? "✅ Solid week" :
                "📈 Room to grow"
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingWidget;