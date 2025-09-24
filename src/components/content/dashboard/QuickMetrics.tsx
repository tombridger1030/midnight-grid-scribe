import React from 'react';
import { cn } from '@/lib/utils';
import MetricDisplay from '../shared/MetricDisplay';
import { ContentListItem } from '@/lib/storage';

interface QuickMetricsProps {
  items: ContentListItem[];
  className?: string;
}

const QuickMetrics: React.FC<QuickMetricsProps> = ({ items, className = '' }) => {
  // Last 7 days data
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const recentContent = items.filter(item => {
    const publishedDate = new Date(item.published_at);
    return publishedDate >= last7Days;
  });

  // Calculate key metrics
  const totalViews = recentContent.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalFollows = recentContent.reduce((sum, item) => sum + (item.follows || 0), 0);

  const retentionValues = recentContent
    .map(item => item.retention_ratio)
    .filter(r => r !== null && r !== undefined) as number[];

  const avgRetention = retentionValues.length > 0
    ? retentionValues.reduce((sum, r) => sum + r, 0) / retentionValues.length
    : null;

  // Platform performance (Instagram: 20.9% avg, TikTok: 27.9% avg from your data)
  const platformBenchmarks = {
    instagram: 0.209,
    tiktok: 0.279,
    youtube: 0.55 // From Sheet6 benchmarks
  };

  const instagramContent = recentContent.filter(item => item.platform === 'instagram');
  const tiktokContent = recentContent.filter(item => item.platform === 'tiktok');
  const youtubeContent = recentContent.filter(item => item.platform === 'youtube');

  const avgViewsPerPost = recentContent.length > 0 ? totalViews / recentContent.length : 0;

  // Performance status based on your benchmarks
  const getRetentionStatus = (actual: number | null, platform: string) => {
    if (!actual) return 'neutral';
    const benchmark = platformBenchmarks[platform as keyof typeof platformBenchmarks] || 0.3;
    return actual > benchmark ? 'up' : actual < benchmark * 0.8 ? 'down' : 'neutral';
  };

  const overallRetentionStatus = avgRetention ? getRetentionStatus(avgRetention, 'overall') : 'neutral';

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {/* Posts This Week */}
      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Posts (7 days)"
          value={recentContent.length}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          Target: 3-4/week
        </div>
      </div>

      {/* Total Views */}
      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Total Views"
          value={totalViews}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          Avg: {avgViewsPerPost > 0 ? Math.round(avgViewsPerPost).toLocaleString() : '—'}/post
        </div>
      </div>

      {/* New Follows */}
      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="New Follows"
          value={totalFollows}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          Last 7 days
        </div>
      </div>

      {/* Retention Rate */}
      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Avg Retention"
          value={avgRetention}
          format="percentage"
          trend={overallRetentionStatus}
          size="md"
        />
        <div className="mt-2 text-xs text-[#8A8D93]">
          {retentionValues.length} videos tracked
        </div>
      </div>

      {/* Platform Breakdown - Instagram */}
      {instagramContent.length > 0 && (
        <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-xs font-medium text-white">Instagram</span>
          </div>
          <div className="text-sm text-terminal-accent font-medium">
            {instagramContent.length} posts
          </div>
          <div className="text-xs text-[#8A8D93]">
            {instagramContent.reduce((sum, item) => sum + (item.views || 0), 0).toLocaleString()} views
          </div>
        </div>
      )}

      {/* Platform Breakdown - TikTok */}
      {tiktokContent.length > 0 && (
        <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            <span className="text-xs font-medium text-white">TikTok</span>
          </div>
          <div className="text-sm text-terminal-accent font-medium">
            {tiktokContent.length} posts
          </div>
          <div className="text-xs text-[#8A8D93]">
            {tiktokContent.reduce((sum, item) => sum + (item.views || 0), 0).toLocaleString()} views
          </div>
        </div>
      )}

      {/* Platform Breakdown - YouTube */}
      {youtubeContent.length > 0 && (
        <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-white">YouTube</span>
          </div>
          <div className="text-sm text-terminal-accent font-medium">
            {youtubeContent.length} posts
          </div>
          <div className="text-xs text-[#8A8D93]">
            {youtubeContent.reduce((sum, item) => sum + (item.views || 0), 0).toLocaleString()} views
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickMetrics;