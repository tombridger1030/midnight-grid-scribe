import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';
import MetricDisplay from '../shared/MetricDisplay';
import PlatformIcon from '../shared/PlatformIcon';

interface CurrentWeekOverviewProps {
  items: ContentListItem[];
  className?: string;
}

const CurrentWeekOverview: React.FC<CurrentWeekOverviewProps> = ({ items, className = '' }) => {
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); // Monday
  const currentWeekStartStr = currentWeekStart.toISOString().slice(0, 10);

  // Filter current week content
  const currentWeekContent = items.filter(item => {
    const publishedDate = new Date(item.published_at);
    return publishedDate >= currentWeekStart;
  });

  // Platform breakdown for current week
  const platformStats = currentWeekContent.reduce((acc, item) => {
    if (!acc[item.platform]) {
      acc[item.platform] = { count: 0, views: 0, retention: [] };
    }
    acc[item.platform].count++;
    acc[item.platform].views += item.views || 0;
    if (item.retention_ratio) {
      acc[item.platform].retention.push(item.retention_ratio);
    }
    return acc;
  }, {} as Record<string, { count: number; views: number; retention: number[] }>);

  // Calculate weekly targets (3-4 posts per week based on your tracking)
  const targetPostsPerWeek = 3.5;
  const postingProgress = currentWeekContent.length / targetPostsPerWeek;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Status Header */}
      <div className="flex items-center justify-between p-4 border border-[#333] bg-[#111] rounded-sm">
        <div>
          <div className="text-sm font-medium text-white">This Week Status</div>
          <div className="text-xs text-[#8A8D93]">
            {currentWeekContent.length} posts • Target: {targetPostsPerWeek}/week
          </div>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-sm text-xs font-medium',
          postingProgress >= 1
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : postingProgress >= 0.7
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        )}>
          {postingProgress >= 1 ? '✅ On Track' : postingProgress >= 0.7 ? '⚠️ Behind' : '🚨 Way Behind'}
        </div>
      </div>

      {/* Platform Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(platformStats).map(([platform, stats]) => {
          const avgRetention = stats.retention.length > 0
            ? stats.retention.reduce((sum, r) => sum + r, 0) / stats.retention.length
            : 0;

          return (
            <div key={platform} className="p-3 border border-[#333] bg-[#111] rounded-sm">
              <div className="flex items-center gap-2 mb-2">
                <PlatformIcon platform={platform as any} size="sm" />
                <span className="text-sm font-medium text-white capitalize">{platform}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[#8A8D93]">Posts</div>
                  <div className="text-terminal-accent font-medium">{stats.count}</div>
                </div>
                <div>
                  <div className="text-[#8A8D93]">Views</div>
                  <div className="text-terminal-accent font-medium">
                    {stats.views > 0 ? stats.views.toLocaleString() : '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[#8A8D93]">Avg Retention</div>
                  <div className="text-terminal-accent font-medium">
                    {avgRetention > 0 ? `${Math.round(avgRetention * 100)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add empty platform cards if less than 3 platforms posted this week */}
        {Object.keys(platformStats).length === 0 && (
          <div className="col-span-3 text-center py-8 text-[#8A8D93] border border-[#333] bg-[#111] rounded-sm">
            <div className="text-sm mb-1">No content posted this week</div>
            <div className="text-xs opacity-70">Time to create some content!</div>
          </div>
        )}
      </div>

      {/* Latest Performance */}
      {currentWeekContent.length > 0 && (
        <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
          <div className="text-sm font-medium text-white mb-3">Latest Performance</div>
          <div className="space-y-2">
            {currentWeekContent.slice(-2).reverse().map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-[#0F0F0F] rounded-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <PlatformIcon platform={item.platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{item.title}</div>
                    <div className="text-xs text-[#8A8D93]">
                      {new Date(item.published_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="text-right">
                    <div className="text-[#8A8D93]">Views</div>
                    <div className="text-white">{item.views?.toLocaleString() || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#8A8D93]">Retention</div>
                    <div className="text-white">
                      {item.retention_ratio ? `${Math.round(item.retention_ratio * 100)}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentWeekOverview;