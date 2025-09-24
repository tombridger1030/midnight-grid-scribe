import React from 'react';
import { cn } from '@/lib/utils';
import MetricDisplay from '../shared/MetricDisplay';
import { ContentListItem } from '@/lib/storage';

interface MetricsOverviewProps {
  items: ContentListItem[];
  timeRange: string;
  className?: string;
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ items, timeRange, className = '' }) => {
  // Calculate metrics
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalFollows = items.reduce((sum, item) => sum + (item.follows || 0), 0);

  const retentionValues = items
    .map(item => item.retention_ratio)
    .filter(r => r !== null && r !== undefined) as number[];

  const avgRetention = retentionValues.length > 0
    ? retentionValues.reduce((sum, r) => sum + r, 0) / retentionValues.length
    : null;

  // Calculate engagement rate (simplified formula)
  const avgViews = items.length > 0 ? totalViews / items.length : 0;
  const engagementRate = avgViews > 0 && totalFollows > 0 ? (totalFollows / totalViews) * 100 : 0;

  // Platform breakdown
  const platformCounts = items.reduce((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPlatform = Object.entries(platformCounts).sort(([,a], [,b]) => b - a)[0];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Total Views"
          value={totalViews}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          {timeRange.replace('d', ' days')}
        </div>
      </div>

      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Followers Gained"
          value={totalFollows}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          {timeRange.replace('d', ' days')}
        </div>
      </div>

      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Avg Retention"
          value={avgRetention}
          format="percentage"
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          Across {retentionValues.length} videos
        </div>
      </div>

      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Content Published"
          value={items.length}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          {topPlatform ? `Most: ${topPlatform[0]} (${topPlatform[1]})` : 'No content'}
        </div>
      </div>
    </div>
  );
};

export default MetricsOverview;