import React, { useState, useEffect } from 'react';
import { rankingManager, RankChange, RANK_CONFIG } from '@/lib/rankingSystem';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Trophy, Calendar, TrendingUp, TrendingDown, BarChart3, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import RankBadge from './RankBadge';

interface RankHistoryProps {
  maxEntries?: number;
  showChart?: boolean;
  className?: string;
}

const RankHistory: React.FC<RankHistoryProps> = ({
  maxEntries = 10,
  showChart = true,
  className = ''
}) => {
  const [rankHistory, setRankHistory] = useState<RankChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'4w' | '12w' | 'all'>('12w');
  const [viewMode, setViewMode] = useState<'timeline' | 'weekly'>('timeline');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [allWeeks, setAllWeeks] = useState<string[]>([]);

  useEffect(() => {
    loadRankHistory();
  }, []);

  const loadRankHistory = async () => {
    try {
      setLoading(true);
      const history = await rankingManager.getRankHistory();
      setRankHistory(history);
      
      // Create array of all weeks for navigation
      const weeks = [...new Set(history.map(change => change.week_key))].sort().reverse();
      setAllWeeks(weeks);
      
      // Set selected week to the most recent
      if (weeks.length > 0 && selectedWeekIndex === 0) {
        setSelectedWeekIndex(0);
      }
    } catch (error) {
      console.error('Failed to load rank history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter history based on timeframe
  const getFilteredHistory = () => {
    if (timeframe === 'all') return rankHistory;

    const weeksToShow = timeframe === '4w' ? 4 : 12;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeksToShow * 7));

    return rankHistory.filter(change =>
      new Date(change.timestamp) >= cutoffDate
    );
  };

  // Prepare chart data
  const getChartData = () => {
    const filteredHistory = getFilteredHistory();

    if (filteredHistory.length === 0) return [];

    // Create a data point for each rank change
    return filteredHistory.reverse().map((change, index) => ({
      week: `W${change.week_key.split('-W')[1]}`,
      weekKey: change.week_key,
      rrPoints: change.new_rr,
      rankName: RANK_CONFIG[change.new_rank].name,
      completion: change.completion_percentage,
      change: change.new_rr - change.old_rr
    }));
  };

  // Navigation functions for weekly view
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
    const weekChange = rankHistory.find(change => change.week_key === weekKey);
    
    if (!weekChange) return null;
    
    return {
      weekKey,
      weekNumber: weekKey.split('-W')[1],
      year: weekKey.split('-W')[0],
      change: weekChange,
      isFirstWeek: selectedWeekIndex === allWeeks.length - 1,
      isLatestWeek: selectedWeekIndex === 0
    };
  };

  const filteredHistory = getFilteredHistory();
  const chartData = getChartData();
  const selectedWeekData = getSelectedWeekData();

  if (loading) {
    return (
      <div className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-terminal-accent/10 rounded mb-4"></div>
          <div className="h-24 bg-terminal-accent/10 rounded mb-3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-terminal-accent/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (rankHistory.length === 0) {
    return (
      <div className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}>
        <div className="text-center text-terminal-accent/60">
          <Trophy size={32} className="mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-bold text-terminal-accent mb-2">No Rank History</h3>
          <p className="text-sm">
            Complete a few weeks to see your ranking progression!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-terminal-accent/30 p-4 bg-terminal-bg/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-terminal-accent" size={20} />
          <h3 className="text-lg font-bold text-terminal-accent">Rank History</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'timeline'
                  ? 'bg-terminal-accent text-black'
                  : 'text-terminal-accent/60 hover:text-terminal-accent'
              }`}
            >
              <BarChart3 size={12} />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                viewMode === 'weekly'
                  ? 'bg-terminal-accent text-black'
                  : 'text-terminal-accent/60 hover:text-terminal-accent'
              }`}
            >
              <Eye size={12} />
              Weekly
            </button>
          </div>

          {/* Timeframe Selector (only show in timeline mode) */}
          {viewMode === 'timeline' && (
            <div className="flex gap-1 text-xs">
              {(['4w', '12w', 'all'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded transition-colors ${
                    timeframe === tf
                      ? 'bg-terminal-accent/20 text-terminal-accent'
                      : 'text-terminal-accent/40 hover:text-terminal-accent/60'
                  }`}
                >
                  {tf === 'all' ? 'All' : tf.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart (only show in timeline mode) */}
      {viewMode === 'timeline' && showChart && chartData.length > 1 && (
        <div className="mb-6">
          <div style={{ height: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--line-faint)',
                    fontSize: '11px',
                    borderRadius: '4px'
                  }}
                  labelFormatter={(week) => `Week ${week.replace('W', '')}`}
                  formatter={(value: number, name: string) => [
                    name === 'rrPoints' ? `${value} RR` : value,
                    name === 'rrPoints' ? 'Rating' : name
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rrPoints"
                  stroke="#5FE3B3"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#5FE3B3', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#5FE3B3' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly Navigation View */}
      {viewMode === 'weekly' && selectedWeekData && (
        <div className="mb-6">
          {/* Week Navigation Controls */}
          <div className="flex items-center justify-between mb-4 p-3 border border-terminal-accent/20 rounded bg-terminal-bg/10">
            <button
              onClick={() => navigateWeek('next')}
              disabled={selectedWeekIndex >= allWeeks.length - 1}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                selectedWeekIndex >= allWeeks.length - 1
                  ? 'text-terminal-accent/30 cursor-not-allowed'
                  : 'text-terminal-accent/70 hover:text-terminal-accent hover:bg-terminal-accent/10'
              }`}
            >
              <ChevronLeft size={16} />
              Older
            </button>

            <div className="text-center">
              <div className="text-lg font-bold text-terminal-accent">
                Week {selectedWeekData.weekNumber}
              </div>
              <div className="text-xs text-terminal-accent/60">
                {selectedWeekData.year} • {selectedWeekIndex + 1} of {allWeeks.length} weeks
                {selectedWeekData.isLatestWeek && <span className="ml-2 text-green-400">● Latest</span>}
              </div>
            </div>

            <button
              onClick={() => navigateWeek('prev')}
              disabled={selectedWeekIndex <= 0}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                selectedWeekIndex <= 0
                  ? 'text-terminal-accent/30 cursor-not-allowed'
                  : 'text-terminal-accent/70 hover:text-terminal-accent hover:bg-terminal-accent/10'
              }`}
            >
              Newer
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week Details */}
          <div className="border border-terminal-accent/30 rounded p-4 bg-terminal-bg/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Rank Display */}
              <div className="text-center">
                <div className="text-sm text-terminal-accent/60 mb-2">Rank After Week</div>
                <RankBadge
                  rank={selectedWeekData.change.new_rank}
                  rrPoints={selectedWeekData.change.new_rr}
                  size="large"
                  showRR={true}
                  showProgress={true}
                  className="mx-auto"
                />
              </div>

              {/* Performance */}
              <div className="text-center">
                <div className="text-sm text-terminal-accent/60 mb-2">Week Performance</div>
                <div className="text-3xl font-bold text-terminal-accent mb-1">
                  {selectedWeekData.change.completion_percentage}%
                </div>
                <div className={`text-sm px-2 py-1 rounded ${
                  selectedWeekData.change.completion_percentage >= 80 ? 'text-green-400 bg-green-400/10' :
                  selectedWeekData.change.completion_percentage >= 50 ? 'text-yellow-400 bg-yellow-400/10' :
                  'text-red-400 bg-red-400/10'
                }`}>
                  {selectedWeekData.change.completion_percentage >= 80 ? 'Excellent' :
                   selectedWeekData.change.completion_percentage >= 50 ? 'Good' : 'Needs Improvement'}
                </div>
              </div>

              {/* RR Change */}
              <div className="text-center">
                <div className="text-sm text-terminal-accent/60 mb-2">RR Change</div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  {selectedWeekData.change.new_rr - selectedWeekData.change.old_rr > 0 ? (
                    <TrendingUp size={20} className="text-green-400" />
                  ) : selectedWeekData.change.new_rr - selectedWeekData.change.old_rr < 0 ? (
                    <TrendingDown size={20} className="text-red-400" />
                  ) : (
                    <div className="w-5 h-5 border border-terminal-accent/40 rounded-full" />
                  )}
                  <span className={`text-2xl font-bold ${
                    selectedWeekData.change.new_rr - selectedWeekData.change.old_rr > 0 ? 'text-green-400' :
                    selectedWeekData.change.new_rr - selectedWeekData.change.old_rr < 0 ? 'text-red-400' : 'text-terminal-accent/60'
                  }`}>
                    {selectedWeekData.change.new_rr - selectedWeekData.change.old_rr > 0 ? '+' : ''}
                    {selectedWeekData.change.new_rr - selectedWeekData.change.old_rr}
                  </span>
                </div>
                <div className="text-xs text-terminal-accent/60">
                  {selectedWeekData.change.old_rr} → {selectedWeekData.change.new_rr} RR
                </div>
              </div>
            </div>

            {/* Rank Change Indicator */}
            {selectedWeekData.change.old_rank !== selectedWeekData.change.new_rank && (
              <div className={`p-3 rounded border mb-4 ${
                RANK_CONFIG[selectedWeekData.change.new_rank].min_rr > RANK_CONFIG[selectedWeekData.change.old_rank].min_rr
                  ? 'border-green-400/30 bg-green-900/20'
                  : 'border-red-400/30 bg-red-900/20'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <RankBadge
                    rank={selectedWeekData.change.old_rank}
                    rrPoints={0}
                    size="small"
                    showRR={false}
                  />
                  <div className="text-terminal-accent/60">→</div>
                  <RankBadge
                    rank={selectedWeekData.change.new_rank}
                    rrPoints={0}
                    size="small"
                    showRR={false}
                  />
                  <div className="text-sm font-bold ml-2">
                    {RANK_CONFIG[selectedWeekData.change.new_rank].min_rr > RANK_CONFIG[selectedWeekData.change.old_rank].min_rr
                      ? '🎉 Rank Up!'
                      : '📉 Rank Down'}
                  </div>
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="text-center text-xs text-terminal-accent/60">
              <Calendar size={12} className="inline mr-1" />
              Data saved on {new Date(selectedWeekData.change.timestamp).toLocaleDateString()}
              <span className="ml-2 text-green-400">● Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Changes List (only show in timeline mode) */}
      {viewMode === 'timeline' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-terminal-accent/70 mb-3">
            Recent Changes ({filteredHistory.length})
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredHistory.slice(0, maxEntries).map((change, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-terminal-accent/20 rounded bg-terminal-bg/10">
                {/* Left: Week and Performance */}
                <div className="flex items-center gap-3">
                  <div className="text-xs text-terminal-accent/60">
                    <Calendar size={12} className="inline mr-1" />
                    W{change.week_key.split('-W')[1]}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{
                      backgroundColor: change.completion_percentage >= 80 ? '#5FE3B3' :
                                     change.completion_percentage >= 50 ? '#FFD700' : '#FF6B6B'
                    }} />
                    <span className="text-sm font-mono">
                      {change.completion_percentage}%
                    </span>
                  </div>
                </div>

                {/* Center: Rank Change */}
                <div className="flex items-center gap-2">
                  {change.old_rank !== change.new_rank && (
                    <>
                      <RankBadge
                        rank={change.old_rank}
                        rrPoints={0}
                        size="small"
                        showRR={false}
                      />
                      <div className="text-terminal-accent/40">→</div>
                    </>
                  )}
                  <RankBadge
                    rank={change.new_rank}
                    rrPoints={0}
                    size="small"
                    showRR={false}
                  />
                </div>

                {/* Right: RR Change */}
                <div className="flex items-center gap-1">
                  {change.new_rr - change.old_rr > 0 ? (
                    <TrendingUp size={14} className="text-green-400" />
                  ) : change.new_rr - change.old_rr < 0 ? (
                    <TrendingDown size={14} className="text-red-400" />
                  ) : (
                    <div className="w-3 h-3 border border-terminal-accent/40 rounded-full" />
                  )}
                  <span className={`text-sm font-mono font-bold ${
                    change.new_rr - change.old_rr > 0 ? 'text-green-400' :
                    change.new_rr - change.old_rr < 0 ? 'text-red-400' : 'text-terminal-accent/60'
                  }`}>
                    {change.new_rr - change.old_rr > 0 ? '+' : ''}
                    {change.new_rr - change.old_rr}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Weekly Mode when no data */}
      {viewMode === 'weekly' && !selectedWeekData && allWeeks.length === 0 && (
        <div className="text-center text-terminal-accent/60 py-8">
          <Trophy size={32} className="mx-auto mb-3 opacity-50" />
          <h4 className="text-lg font-bold text-terminal-accent mb-2">No Week Data</h4>
          <p className="text-sm">
            Complete a few weeks to see your detailed weekly progression!
          </p>
        </div>
      )}

      {/* Summary Stats (only show in timeline mode) */}
      {viewMode === 'timeline' && filteredHistory.length > 0 && (
        <div className="mt-4 pt-3 border-t border-terminal-accent/20 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-lg font-bold text-green-400">
              {filteredHistory.filter(c => (c.new_rr - c.old_rr) > 0).length}
            </div>
            <div className="text-terminal-accent/60">Gains</div>
          </div>

          <div>
            <div className="text-lg font-bold text-red-400">
              {filteredHistory.filter(c => (c.new_rr - c.old_rr) < 0).length}
            </div>
            <div className="text-terminal-accent/60">Losses</div>
          </div>

          <div>
            <div className="text-lg font-bold text-terminal-accent">
              {Math.round(
                filteredHistory.reduce((sum, c) => sum + c.completion_percentage, 0) / filteredHistory.length
              )}%
            </div>
            <div className="text-terminal-accent/60">Avg. Performance</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankHistory;