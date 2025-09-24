import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';

interface ProgressionChartProps {
  items: ContentListItem[];
  className?: string;
}

const ProgressionChart: React.FC<ProgressionChartProps> = ({ items, className = '' }) => {
  // Group by weeks for the last 12 weeks
  const last12Weeks = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));
    // Get Monday of that week
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    return monday;
  }).reverse();

  const weeklyData = last12Weeks.map(weekStart => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekItems = items.filter(item => {
      const publishedDate = new Date(item.published_at);
      return publishedDate >= weekStart && publishedDate <= weekEnd;
    });

    const totalViews = weekItems.reduce((sum, item) => sum + (item.views || 0), 0);
    const avgViews = weekItems.length > 0 ? totalViews / weekItems.length : 0;

    return {
      weekStart,
      weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      postCount: weekItems.length,
      totalViews,
      avgViews: Math.round(avgViews),
      items: weekItems
    };
  });

  // Find max values for scaling
  const maxPosts = Math.max(...weeklyData.map(w => w.postCount), 1);
  const maxAvgViews = Math.max(...weeklyData.map(w => w.avgViews), 1);

  // Target posting frequency (3.5 posts/week from your data)
  const targetPosts = 3.5;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="text-lg font-medium text-white">12-Week Progression</h3>
      </div>

      {/* Posting Frequency Chart */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white">Weekly Posting Frequency</h4>
          <div className="text-xs text-[#8A8D93]">Target: {targetPosts}/week</div>
        </div>

        <div className="space-y-2">
          {weeklyData.map((week, index) => {
            const percentage = (week.postCount / Math.max(maxPosts, targetPosts)) * 100;
            const isOnTarget = week.postCount >= targetPosts;

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-xs text-[#8A8D93] text-right">
                  {week.weekLabel}
                </div>
                <div className="flex-1 relative">
                  <div className="w-full bg-[#222] rounded-full h-4">
                    <div
                      className={cn(
                        'h-4 rounded-full transition-all duration-500',
                        isOnTarget ? 'bg-terminal-accent' : 'bg-yellow-500'
                      )}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  {/* Target line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/50"
                    style={{ left: `${(targetPosts / Math.max(maxPosts, targetPosts)) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-xs text-white text-right">
                  {week.postCount}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-terminal-accent rounded-full"></div>
            <span className="text-[#8A8D93]">On Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-[#8A8D93]">Below Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-px h-3 bg-white/50"></div>
            <span className="text-[#8A8D93]">Target Line</span>
          </div>
        </div>
      </div>

      {/* Average Views Trend */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white">Average Views per Post</h4>
          <div className="text-xs text-[#8A8D93]">12-week trend</div>
        </div>

        <div className="space-y-2">
          {weeklyData.map((week, index) => {
            const percentage = maxAvgViews > 0 ? (week.avgViews / maxAvgViews) * 100 : 0;
            const previousWeek = weeklyData[index - 1];
            const trend = previousWeek
              ? week.avgViews > previousWeek.avgViews ? 'up' : week.avgViews < previousWeek.avgViews ? 'down' : 'neutral'
              : 'neutral';

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-xs text-[#8A8D93] text-right">
                  {week.weekLabel}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-[#222] rounded-full h-3">
                    <div
                      className={cn(
                        'h-3 rounded-full transition-all duration-500',
                        trend === 'up' ? 'bg-green-500' :
                        trend === 'down' ? 'bg-red-500' :
                        'bg-[#8A8D93]'
                      )}
                      style={{ width: `${Math.max(2, percentage)}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-xs text-white text-right">
                  {week.postCount > 0 ? week.avgViews.toLocaleString() : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-[#8A8D93]">Improving</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-[#8A8D93]">Declining</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#8A8D93] rounded-full"></div>
            <span className="text-[#8A8D93]">Stable</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
          <div className="text-xs text-[#8A8D93] mb-1">12-Week Average</div>
          <div className="text-sm text-white font-medium">
            {(weeklyData.reduce((sum, w) => sum + w.postCount, 0) / weeklyData.length).toFixed(1)} posts/week
          </div>
          <div className="text-xs text-[#8A8D93]">
            {weeklyData.reduce((sum, w) => sum + w.postCount, 0) / weeklyData.length >= targetPosts
              ? 'Above target' : 'Below target'}
          </div>
        </div>

        <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
          <div className="text-xs text-[#8A8D93] mb-1">Best Week</div>
          <div className="text-sm text-white font-medium">
            {Math.max(...weeklyData.map(w => w.postCount))} posts
          </div>
          <div className="text-xs text-[#8A8D93]">
            {weeklyData.find(w => w.postCount === Math.max(...weeklyData.map(w => w.postCount)))?.weekLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressionChart;