import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';
import ContentCard from '../shared/ContentCard';

interface TopPerformersProps {
  items: ContentListItem[];
  className?: string;
}

const TopPerformers: React.FC<TopPerformersProps> = ({ items, className = '' }) => {
  // Filter items with views and sort by performance
  const itemsWithViews = items.filter(item => item.views && item.views > 0);

  if (itemsWithViews.length === 0) {
    return (
      <div className={cn('border border-[#333] bg-[#111] rounded-sm p-6 text-center', className)}>
        <div className="text-[#8A8D93] text-sm">No performance data available</div>
        <div className="text-[#666] text-xs mt-1">Publish content with metrics to see top performers</div>
      </div>
    );
  }

  // Sort by views (best performers first)
  const sortedByViews = [...itemsWithViews].sort((a, b) => (b.views || 0) - (a.views || 0));

  // Get best performers (top 3)
  const bestPerformers = sortedByViews.slice(0, 3);

  // Get worst performers (bottom 2, only if we have more than 3 items)
  const worstPerformers = sortedByViews.length > 3
    ? sortedByViews.slice(-2).reverse()
    : [];

  const SectionHeader: React.FC<{ title: string; emoji: string }> = ({ title, emoji }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm">{emoji}</span>
      <h3 className="text-sm font-medium text-white">{title}</h3>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Best Performers */}
      <div>
        <SectionHeader title="Top Performers" emoji="🏆" />
        <div className="space-y-2">
          {bestPerformers.map((item, index) => (
            <div key={item.id} className="relative">
              {index === 0 && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#5FE3B3] rounded-full"></div>
              )}
              <ContentCard
                content={item}
                variant="compact"
                showMetrics={true}
                className={cn(
                  index === 0 && 'border-[#5FE3B3]/30 bg-[#5FE3B3]/5'
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Worst Performers - Room for Improvement */}
      {worstPerformers.length > 0 && (
        <div>
          <SectionHeader title="Room for Improvement" emoji="🎯" />
          <div className="space-y-2">
            {worstPerformers.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                variant="compact"
                showMetrics={true}
                className="border-orange-500/30 bg-orange-500/5"
              />
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      {itemsWithViews.length >= 3 && (
        <div className="p-3 border border-[#333] bg-[#111] rounded-sm">
          <SectionHeader title="Quick Insights" emoji="💡" />
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#8A8D93]">Best performing video:</span>
              <span className="text-white">{bestPerformers[0].views?.toLocaleString()} views</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8D93]">Average views:</span>
              <span className="text-white">
                {Math.round(itemsWithViews.reduce((sum, item) => sum + (item.views || 0), 0) / itemsWithViews.length).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8D93]">Performance spread:</span>
              <span className="text-white">
                {bestPerformers[0].views && worstPerformers[0]?.views
                  ? `${Math.round(bestPerformers[0].views / worstPerformers[0].views)}x difference`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopPerformers;