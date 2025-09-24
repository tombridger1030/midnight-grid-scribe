import React, { useEffect, useState } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import QuickMetrics from '@/components/content/dashboard/QuickMetrics';
import CurrentWeekOverview from '@/components/content/dashboard/CurrentWeekOverview';
import ContentCard from '@/components/content/shared/ContentCard';

const ContentDashboard: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recent content for real-time overview
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load last 30 days for dashboard overview
        const data = await loadRecentContent(50);
        setAllContent(data);
      } catch (e) {
        console.error('Failed to load content:', e);
        setError(e instanceof Error ? e.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[#111] rounded-sm"></div>
            ))}
          </div>
          <div className="h-48 bg-[#111] rounded-sm mb-6"></div>
          <div className="h-32 bg-[#111] rounded-sm"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-sm">
          <div className="text-red-400 text-sm">Error loading dashboard</div>
          <div className="text-red-300 text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  // Get last 3 posted videos for quick view
  const latestContent = allContent.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-sm text-[#8A8D93]">
        Real-time overview of all your accounts (@konavus). Check Weekly Review for detailed progression analysis.
      </div>

      {/* Quick Metrics - Simple overview */}
      <QuickMetrics items={allContent} />

      {/* Current Week Status */}
      <CurrentWeekOverview items={allContent} />

      {/* Latest Posts - Just the most recent ones */}
      {latestContent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Latest Posts</h3>
            <div className="text-xs text-[#8A8D93]">Most recent content</div>
          </div>

          <div className="space-y-2">
            {latestContent.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                variant="compact"
                showMetrics={true}
              />
            ))}
          </div>
        </div>
      )}

      {allContent.length === 0 && (
        <div className="text-center py-12 text-[#8A8D93] border border-[#333] bg-[#111] rounded-sm">
          <div className="text-lg mb-2">📊 Dashboard Empty</div>
          <div className="text-sm mb-4">No content data available yet</div>
          <div className="text-xs opacity-70">
            Add some content through the input page to see your dashboard metrics
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDashboard;


