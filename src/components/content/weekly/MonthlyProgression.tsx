import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';
import MetricDisplay from '../shared/MetricDisplay';

interface MonthlyProgressionProps {
  items: ContentListItem[];
  className?: string;
}

const MonthlyProgression: React.FC<MonthlyProgressionProps> = ({ items, className = '' }) => {
  // Group content by month
  const monthlyData = items.reduce((acc, item) => {
    const date = new Date(item.published_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    if (!acc[monthKey]) {
      acc[monthKey] = {
        label: monthLabel,
        items: [],
        totalViews: 0,
        totalFollows: 0,
        avgRetention: 0,
        platforms: { instagram: 0, tiktok: 0, youtube: 0 }
      };
    }

    acc[monthKey].items.push(item);
    acc[monthKey].totalViews += item.views || 0;
    acc[monthKey].totalFollows += item.follows || 0;

    // Platform counts
    acc[monthKey].platforms[item.platform as keyof typeof acc[typeof monthKey]['platforms']]++;

    return acc;
  }, {} as Record<string, {
    label: string;
    items: ContentListItem[];
    totalViews: number;
    totalFollows: number;
    avgRetention: number;
    platforms: { instagram: number; tiktok: number; youtube: number };
  }>);

  // Calculate retention averages
  Object.keys(monthlyData).forEach(monthKey => {
    const retentionValues = monthlyData[monthKey].items
      .map(item => item.retention_ratio)
      .filter(r => r !== null && r !== undefined) as number[];

    monthlyData[monthKey].avgRetention = retentionValues.length > 0
      ? retentionValues.reduce((sum, r) => sum + r, 0) / retentionValues.length
      : 0;
  });

  // Sort months chronologically
  const sortedMonths = Object.entries(monthlyData).sort(([a], [b]) => b.localeCompare(a));

  // Calculate trends
  const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | 'neutral'; percentage: number } => {
    if (previous === 0) return { trend: 'neutral', percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
      percentage: Math.abs(change)
    };
  };

  // Benchmarks from your VIDEO TRACKING.xlsx analysis
  const monthlyBenchmarks = {
    october2024: { avgViews: 1038, posts: 10, retention: 0.209 }, // Peak performance
    november2024: { avgViews: 648, posts: 19, retention: 0.20 },  // Volume increase
    december2024: { avgViews: 859, posts: 3, retention: 0.22 }    // Limited data
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📈</span>
        <h3 className="text-lg font-medium text-white">Monthly Progression Analysis</h3>
      </div>

      {sortedMonths.length === 0 ? (
        <div className="text-center py-8 text-[#8A8D93] border border-[#333] bg-[#111] rounded-sm">
          <div className="text-sm">No monthly data available yet</div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map(([monthKey, data], index) => {
            const previousMonth = sortedMonths[index + 1]?.[1];
            const avgViews = data.totalViews / data.items.length;

            // Trend calculations
            const viewsTrend = previousMonth ? calculateTrend(avgViews, previousMonth.totalViews / previousMonth.items.length) : { trend: 'neutral' as const, percentage: 0 };
            const postsTrend = previousMonth ? calculateTrend(data.items.length, previousMonth.items.length) : { trend: 'neutral' as const, percentage: 0 };
            const retentionTrend = previousMonth ? calculateTrend(data.avgRetention, previousMonth.avgRetention) : { trend: 'neutral' as const, percentage: 0 };

            return (
              <div key={monthKey} className="border border-[#333] bg-[#111] rounded-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-white">{data.label}</h4>
                  {index === 0 && (
                    <div className="px-2 py-1 bg-terminal-accent/20 text-terminal-accent text-xs rounded-sm">
                      Current
                    </div>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <MetricDisplay
                    label="Posts Published"
                    value={data.items.length}
                    trend={postsTrend.trend}
                    trendValue={postsTrend.percentage}
                    size="sm"
                  />
                  <MetricDisplay
                    label="Avg Views/Post"
                    value={Math.round(avgViews)}
                    trend={viewsTrend.trend}
                    trendValue={Math.round(viewsTrend.percentage)}
                    size="sm"
                  />
                  <MetricDisplay
                    label="Total Follows"
                    value={data.totalFollows}
                    size="sm"
                  />
                  <MetricDisplay
                    label="Avg Retention"
                    value={data.avgRetention}
                    format="percentage"
                    trend={retentionTrend.trend}
                    size="sm"
                  />
                </div>

                {/* Platform Breakdown */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#8A8D93]">Platform Distribution</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(data.platforms).map(([platform, count]) => (
                      count > 0 && (
                        <div key={platform} className="flex items-center gap-2 p-2 bg-[#0F0F0F] rounded-sm">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            platform === 'instagram' ? 'bg-purple-500' :
                            platform === 'tiktok' ? 'bg-pink-500' :
                            'bg-red-500'
                          )}></div>
                          <div className="flex-1">
                            <div className="text-xs text-white capitalize">{platform}</div>
                            <div className="text-xs text-[#8A8D93]">{count} posts</div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Performance Insights */}
                <div className="mt-4 p-3 bg-[#0F0F0F] rounded-sm">
                  <div className="text-xs font-medium text-[#8A8D93] mb-2">Monthly Insights</div>
                  <div className="text-xs text-white">
                    {/* Based on your VIDEO TRACKING.xlsx patterns */}
                    {monthKey.includes('2024-10') && (
                      <span className="text-green-400">🏆 Peak performance month - highest avg views per post</span>
                    )}
                    {monthKey.includes('2024-11') && (
                      <span className="text-yellow-400">📈 Volume increase - more posts but lower individual performance</span>
                    )}
                    {monthKey.includes('2024-12') && (
                      <span className="text-blue-400">🔄 Recovery trend - fewer posts but improving avg performance</span>
                    )}
                    {!monthKey.includes('2024') && (
                      <span className="text-[#8A8D93]">
                        {avgViews > 800 ? '🟢 Strong performance' : avgViews > 500 ? '🟡 Moderate performance' : '🔴 Below target'}
                        {' • '}
                        {data.items.length >= 3 ? 'Good posting frequency' : 'Low posting frequency'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2025 Growth Targets Progress (from your Weekly AnalyticsOLD sheet) */}
      <div className="border border-terminal-accent/30 bg-terminal-accent/5 rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🎯</span>
          <h4 className="text-sm font-medium text-white">2025 Growth Targets</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-terminal-accent font-medium">Instagram Target</div>
            <div className="text-white">Q1 2025: 15,000 followers</div>
            <div className="text-[#8A8D93]">Q4 2025: 100,000 followers</div>
          </div>
          <div>
            <div className="text-terminal-accent font-medium">TikTok Target</div>
            <div className="text-white">Q1 2025: 10,000 followers</div>
            <div className="text-[#8A8D93]">Q4 2025: 100,000 followers</div>
          </div>
          <div>
            <div className="text-terminal-accent font-medium">YouTube Target</div>
            <div className="text-white">Q1 2025: 2,000 subscribers</div>
            <div className="text-[#8A8D93]">Q4 2025: 10,000 subscribers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyProgression;