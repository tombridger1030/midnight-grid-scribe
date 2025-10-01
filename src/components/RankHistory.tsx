import React, { useState, useEffect } from 'react';
import { rankingManager, RankChange, RANK_CONFIG } from '@/lib/rankingSystem';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Trophy, Calendar, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
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

  useEffect(() => {
    loadRankHistory();
  }, []);

  const loadRankHistory = async () => {
    try {
      setLoading(true);
      const history = await rankingManager.getRankHistory();
      setRankHistory(history);
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

  const filteredHistory = getFilteredHistory();
  const chartData = getChartData();

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

        {/* Timeframe Selector */}
        <div className="flex gap-1 text-xs">
          {(['4w', '12w', 'all'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 rounded transition-colors ${
                timeframe === tf
                  ? 'bg-terminal-accent text-black'
                  : 'text-terminal-accent/60 hover:text-terminal-accent'
              }`}
            >
              {tf === 'all' ? 'All' : tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {showChart && chartData.length > 1 && (
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

      {/* Recent Changes List */}
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

      {/* Summary Stats */}
      {filteredHistory.length > 0 && (
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