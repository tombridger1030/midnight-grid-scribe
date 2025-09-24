import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';
import PlatformIcon from '../shared/PlatformIcon';

interface PlatformBreakdownProps {
  items: ContentListItem[];
  className?: string;
}

const PlatformBreakdown: React.FC<PlatformBreakdownProps> = ({ items, className = '' }) => {
  // Calculate platform stats
  const platformStats = items.reduce((acc, item) => {
    const platform = item.platform;
    if (!acc[platform]) {
      acc[platform] = {
        count: 0,
        views: 0,
        follows: 0,
        totalRetention: 0,
        retentionCount: 0
      };
    }

    acc[platform].count++;
    acc[platform].views += item.views || 0;
    acc[platform].follows += item.follows || 0;

    if (item.retention_ratio !== null && item.retention_ratio !== undefined) {
      acc[platform].totalRetention += item.retention_ratio;
      acc[platform].retentionCount++;
    }

    return acc;
  }, {} as Record<string, {
    count: number;
    views: number;
    follows: number;
    totalRetention: number;
    retentionCount: number;
  }>);

  const platforms = Object.entries(platformStats).sort(([,a], [,b]) => b.count - a.count);

  if (platforms.length === 0) {
    return (
      <div className={cn('border border-[#333] bg-[#111] rounded-sm p-6 text-center', className)}>
        <div className="text-[#8A8D93] text-sm">No platform data available</div>
      </div>
    );
  }

  const maxViews = Math.max(...platforms.map(([, stats]) => stats.views));

  return (
    <div className={cn('border border-[#333] bg-[#111] rounded-sm p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">📱</span>
        <h3 className="text-sm font-medium text-white">Platform Performance</h3>
      </div>

      <div className="space-y-4">
        {platforms.map(([platform, stats]) => {
          const avgRetention = stats.retentionCount > 0
            ? stats.totalRetention / stats.retentionCount
            : null;

          const avgViews = stats.count > 0 ? stats.views / stats.count : 0;
          const viewsPercentage = maxViews > 0 ? (stats.views / maxViews) * 100 : 0;

          return (
            <div key={platform} className="space-y-2">
              {/* Platform Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform as any} size="md" />
                  <div>
                    <div className="text-sm font-medium text-white capitalize">{platform}</div>
                    <div className="text-xs text-[#8A8D93]">{stats.count} videos</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-terminal-accent">
                    {stats.views.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#8A8D93]">total views</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#222] rounded-full h-1.5">
                <div
                  className="bg-terminal-accent h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, viewsPercentage)}%` }}
                />
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[#8A8D93]">Avg Views</div>
                  <div className="text-white font-medium">
                    {Math.round(avgViews).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[#8A8D93]">Follows</div>
                  <div className="text-white font-medium">
                    {stats.follows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[#8A8D93]">Retention</div>
                  <div className="text-white font-medium">
                    {avgRetention ? `${Math.round(avgRetention * 100)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {platforms.length > 1 && (
        <div className="mt-4 pt-4 border-t border-[#333]">
          <div className="text-xs text-[#8A8D93] mb-2">Platform Summary</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#8A8D93]">Most Active: </span>
              <span className="text-white capitalize">{platforms[0][0]} ({platforms[0][1].count} videos)</span>
            </div>
            <div>
              <span className="text-[#8A8D93]">Best Performance: </span>
              <span className="text-white capitalize">
                {platforms.sort(([,a], [,b]) => b.views - a.views)[0][0]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformBreakdown;