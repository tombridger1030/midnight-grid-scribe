import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';
import PlatformIcon from '../shared/PlatformIcon';

interface WeekInsightsProps {
  items: ContentListItem[];
  className?: string;
}

const WeekInsights: React.FC<WeekInsightsProps> = ({ items, className = '' }) => {
  if (items.length === 0) {
    return (
      <div className={cn('p-4 border border-[#333] bg-[#111] rounded-sm text-center text-[#8A8D93]', className)}>
        No content published this week
      </div>
    );
  }

  // Find best and worst performing content
  const itemsWithViews = items.filter(item => item.views && item.views > 0);
  const bestPerformer = itemsWithViews.length > 0
    ? itemsWithViews.reduce((best, current) => (current.views || 0) > (best.views || 0) ? current : best)
    : null;

  const worstPerformer = itemsWithViews.length > 1
    ? itemsWithViews.reduce((worst, current) => (current.views || 0) < (worst.views || 0) ? current : worst)
    : null;

  // Platform breakdown
  const platformStats = items.reduce((acc, item) => {
    const platform = item.platform;
    if (!acc[platform]) {
      acc[platform] = { count: 0, views: 0 };
    }
    acc[platform].count++;
    acc[platform].views += item.views || 0;
    return acc;
  }, {} as Record<string, { count: number; views: number }>);

  // Calculate average retention
  const retentionValues = items
    .map(item => item.retention_ratio)
    .filter(r => r !== null && r !== undefined) as number[];

  const avgRetention = retentionValues.length > 0
    ? retentionValues.reduce((sum, r) => sum + r, 0) / retentionValues.length
    : null;

  const InsightCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
      <div className="text-xs font-medium text-[#8A8D93] mb-2">{title}</div>
      {children}
    </div>
  );

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* Best Performer */}
      {bestPerformer && (
        <InsightCard title="🏆 Best Performer">
          <div className="flex items-center gap-2 mb-1">
            <PlatformIcon platform={bestPerformer.platform} size="sm" />
            <span className="text-sm font-medium text-white truncate">
              {bestPerformer.title}
            </span>
          </div>
          <div className="text-xs text-[#8A8D93]">
            {bestPerformer.views?.toLocaleString()} views
            {bestPerformer.retention_ratio && (
              <span className="ml-2">• {Math.round(bestPerformer.retention_ratio * 100)}% retention</span>
            )}
          </div>
        </InsightCard>
      )}

      {/* Platform Breakdown */}
      <InsightCard title="📱 Platform Breakdown">
        <div className="space-y-2">
          {Object.entries(platformStats).map(([platform, stats]) => (
            <div key={platform} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform as any} size="sm" />
                <span className="text-white capitalize">{platform}</span>
              </div>
              <div className="text-[#8A8D93]">
                {stats.count} videos • {stats.views.toLocaleString()} views
              </div>
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Performance Insights */}
      <InsightCard title="📊 Performance Insights">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#8A8D93]">Total Videos:</span>
            <span className="text-white">{items.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8D93]">Avg Views:</span>
            <span className="text-white">
              {itemsWithViews.length > 0
                ? Math.round(itemsWithViews.reduce((sum, item) => sum + (item.views || 0), 0) / itemsWithViews.length).toLocaleString()
                : '—'}
            </span>
          </div>
          {avgRetention && (
            <div className="flex justify-between">
              <span className="text-[#8A8D93]">Avg Retention:</span>
              <span className="text-white">{Math.round(avgRetention * 100)}%</span>
            </div>
          )}
        </div>
      </InsightCard>

      {/* Improvement Opportunities */}
      {worstPerformer && worstPerformer !== bestPerformer && (
        <InsightCard title="🎯 Room for Improvement">
          <div className="flex items-center gap-2 mb-1">
            <PlatformIcon platform={worstPerformer.platform} size="sm" />
            <span className="text-sm font-medium text-white truncate">
              {worstPerformer.title}
            </span>
          </div>
          <div className="text-xs text-[#8A8D93]">
            {worstPerformer.views?.toLocaleString()} views
            {worstPerformer.retention_ratio && (
              <span className="ml-2">• {Math.round(worstPerformer.retention_ratio * 100)}% retention</span>
            )}
          </div>
        </InsightCard>
      )}
    </div>
  );
};

export default WeekInsights;