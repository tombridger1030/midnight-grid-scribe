import React, { useEffect, useState } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import { loadMultiPlatformContent, MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { generateDailyData, generatePlatformDistributionData, generateFormatDistributionData, calculateTrend } from '@/lib/chartUtils';
import QuickMetrics from '@/components/content/dashboard/QuickMetrics';
import CurrentWeekOverview from '@/components/content/dashboard/CurrentWeekOverview';
import UnifiedContentCard from '@/components/content/shared/UnifiedContentCard';
import ContentEditor from '@/components/content/shared/ContentEditor';
import MultiPlatformContentEditor from '@/components/content/shared/MultiPlatformContentEditor';
import MetricUpdatePrompt from '@/components/content/shared/MetricUpdatePrompt';
import LineChart from '@/components/content/charts/LineChart';
import PieChart from '@/components/content/charts/PieChart';
import MetricGauge from '@/components/content/charts/MetricGauge';
import TrendIndicator from '@/components/content/charts/TrendIndicator';
import PerformanceBar from '@/components/content/charts/PerformanceBar';

const ContentDashboard: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [multiPlatformContent, setMultiPlatformContent] = useState<MultiPlatformContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingMultiPlatform, setEditingMultiPlatform] = useState<{ title: string; publishedAt: string } | null>(null);
  const [showMetricUpdates, setShowMetricUpdates] = useState(false);

  // Load recent content for real-time overview
  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load both single-platform and multi-platform content
      const [singlePlatformData, multiPlatformData] = await Promise.all([
        loadRecentContent(50),
        loadMultiPlatformContent(25)
      ]);

      setAllContent(singlePlatformData);
      setMultiPlatformContent(multiPlatformData);
    } catch (e) {
      console.error('Failed to load content:', e);
      setError(e instanceof Error ? e.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
    // Show metric update prompts after loading content
    setTimeout(() => setShowMetricUpdates(true), 1000);
  }, []);

  const handleEdit = (contentId: string) => {
    setEditingContentId(contentId);
  };

  const handleEditMultiPlatform = (title: string, publishedAt: string) => {
    setEditingMultiPlatform({ title, publishedAt });
  };

  const handleEditSave = () => {
    setEditingContentId(null);
    setEditingMultiPlatform(null);
    loadContent(); // Refresh data
  };

  const handleEditCancel = () => {
    setEditingContentId(null);
    setEditingMultiPlatform(null);
  };

  const handleDelete = () => {
    setEditingContentId(null);
    setEditingMultiPlatform(null);
    loadContent(); // Refresh data
  };

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

  // Flatten multi-platform content for chart generation
  const flattenedContent = [
    ...allContent,
    ...multiPlatformContent.flatMap(item =>
      Object.entries(item.platforms).map(([platform, data]) => ({
        id: `${item.id}-${platform}`,
        platform,
        format: item.format,
        account_handle: data.account_handle || null,
        title: item.title,
        published_at: item.published_at,
        tags: item.tags,
        url: data.url,
        views: data.views,
        follows: data.follows,
        retention_ratio: data.retention_ratio
      }))
    )
  ];

  // Generate chart data using flattened content
  const last30DaysData = generateDailyData(flattenedContent, 30);
  const platformDistribution = generatePlatformDistributionData(flattenedContent);
  const formatDistribution = generateFormatDistributionData(flattenedContent);

  // Calculate key metrics
  const totalViews = flattenedContent.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalFollows = flattenedContent.reduce((sum, item) => sum + (item.follows || 0), 0);
  const avgRetention = flattenedContent.length > 0
    ? flattenedContent.filter(item => item.retention_ratio).reduce((sum, item) => sum + (item.retention_ratio || 0), 0) / flattenedContent.filter(item => item.retention_ratio).length
    : 0;

  // Calculate trends (compare last 15 days vs previous 15) using flattened data for views
  const recent15Days = flattenedContent.filter(item => {
    const daysAgo = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 15;
  });
  const previous15Days = flattenedContent.filter(item => {
    const daysAgo = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 15 && daysAgo <= 30;
  });

  const currentAvgViews = recent15Days.length > 0 ? recent15Days.reduce((sum, item) => sum + (item.views || 0), 0) / recent15Days.length : 0;
  const previousAvgViews = previous15Days.length > 0 ? previous15Days.reduce((sum, item) => sum + (item.views || 0), 0) / previous15Days.length : 0;

  // Combine and sort all content by published date
  const allCombinedContent = [
    ...allContent.map(item => ({ ...item, type: 'single' as const })),
    ...multiPlatformContent.map(item => ({
      ...item,
      type: 'multi' as const,
      platform: Object.keys(item.platforms).join(', '),
      // Use the best performing platform's metrics for display
      views: Math.max(...Object.values(item.platforms).map(p => p.views || 0)),
      follows: Object.values(item.platforms).reduce((sum, p) => sum + (p.follows || 0), 0)
    }))
  ].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  // Calculate post counts using unique posts (not platform instances)
  const recent15DaysUnique = allCombinedContent.filter(item => {
    const daysAgo = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 15;
  });
  const previous15DaysUnique = allCombinedContent.filter(item => {
    const daysAgo = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 15 && daysAgo <= 30;
  });

  // Calculate posts this month (last 30 days)
  const postsThisMonth = allCombinedContent.filter(item => {
    const daysAgo = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 30;
  }).length;

  // Get last 3 posted videos for quick view
  const latestContent = allCombinedContent.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-sm text-[#8A8D93]">
        Visual overview of all your accounts (@konavus). Check Weekly Review for detailed progression analysis.
      </div>

      {/* Performance Trends - Visual First */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <TrendIndicator
          label="Avg Views/Post"
          current={currentAvgViews}
          previous={previousAvgViews}
          size="sm"
        />
        <TrendIndicator
          label="Total Follows"
          current={totalFollows}
          previous={0}
          size="sm"
        />
        <TrendIndicator
          label="Retention Rate"
          current={avgRetention}
          previous={20}
          format="percentage"
          size="sm"
        />
        <TrendIndicator
          label="Posts This Month"
          current={postsThisMonth}
          previous={previous15DaysUnique.length}
          size="sm"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          data={last30DaysData}
          title="Views Over Time (30 Days)"
          color="#5FE3B3"
          height={200}
          yAxisLabel="Views"
          showGrid={true}
        />
        <div className="grid grid-cols-2 gap-4">
          <PieChart
            data={platformDistribution}
            title="Platform Distribution"
            size={180}
            showPercentages={true}
          />
          <PieChart
            data={formatDistribution}
            title="Content Format"
            size={180}
            showPercentages={true}
          />
        </div>
      </div>

      {/* Performance Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricGauge
          label="Views Target"
          value={totalViews}
          target={50000}
          color="#5FE3B3"
          size={120}
        />
        <MetricGauge
          label="Followers Goal"
          value={totalFollows}
          target={1000}
          color="#8B5CF6"
          size={120}
        />
        <MetricGauge
          label="Retention Rate"
          value={avgRetention}
          target={35}
          color="#EC4899"
          unit="%"
          size={120}
        />
        <MetricGauge
          label="Monthly Posts"
          value={postsThisMonth}
          target={20}
          color="#EF4444"
          size={120}
        />
      </div>

      {/* Performance Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#333] bg-[#111] rounded-sm p-4 space-y-4">
          <h3 className="text-sm font-medium text-white mb-4">Growth Progress</h3>
          <PerformanceBar
            label="Instagram Target 2025"
            value={totalFollows * 0.4}
            target={100000}
            color="#8B5CF6"
            height={16}
          />
          <PerformanceBar
            label="TikTok Target 2025"
            value={totalFollows * 0.35}
            target={100000}
            color="#EC4899"
            height={16}
          />
          <PerformanceBar
            label="YouTube Target 2025"
            value={totalFollows * 0.25}
            target={10000}
            color="#EF4444"
            height={16}
          />
        </div>

        <div className="border border-[#333] bg-[#111] rounded-sm p-4 space-y-4">
          <h3 className="text-sm font-medium text-white mb-4">Monthly Metrics</h3>
          <PerformanceBar
            label="Views This Month"
            value={totalViews}
            target={50000}
            color="#5FE3B3"
            height={16}
          />
          <PerformanceBar
            label="Posts This Month"
            value={postsThisMonth}
            target={20}
            color="#F59E0B"
            height={16}
          />
          <PerformanceBar
            label="Avg Retention Rate"
            value={avgRetention}
            target={35}
            color="#06B6D4"
            height={16}
          />
        </div>
      </div>

      {/* Latest Posts - Compact */}
      {latestContent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Latest Posts</h3>
            <div className="text-xs text-[#8A8D93]">Most recent content</div>
          </div>

          <div className="space-y-2">
            {latestContent.map((item) => (
              <UnifiedContentCard
                key={`${item.type}-${item.id}`}
                content={item}
                variant="compact"
                showMetrics={true}
                showEditButton={true}
                onEdit={handleEdit}
                onEditMultiPlatform={handleEditMultiPlatform}
              />
            ))}
          </div>
        </div>
      )}

      {allCombinedContent.length === 0 && (
        <div className="text-center py-12 text-[#8A8D93] border border-[#333] bg-[#111] rounded-sm">
          <div className="text-lg mb-2">📊 Dashboard Empty</div>
          <div className="text-sm mb-4">No content data available yet</div>
          <div className="text-xs opacity-70">
            Add some content through the input page to see your dashboard metrics
          </div>
        </div>
      )}

      {/* Content Editor Modals */}
      {editingContentId && (
        <ContentEditor
          contentId={editingContentId}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          onDelete={handleDelete}
        />
      )}

      {editingMultiPlatform && (
        <MultiPlatformContentEditor
          contentTitle={editingMultiPlatform.title}
          publishedAt={editingMultiPlatform.publishedAt}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          onDelete={handleDelete}
        />
      )}

      {/* Metric Update Prompts */}
      {showMetricUpdates && (
        <MetricUpdatePrompt
          onComplete={() => setShowMetricUpdates(false)}
          onDismiss={() => setShowMetricUpdates(false)}
        />
      )}
    </div>
  );
};

export default ContentDashboard;


