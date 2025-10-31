import React, { useEffect, useState } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import { loadMultiPlatformContent, MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { generateDailyData, generatePlatformDistributionData, generateFormatDistributionData, calculateTrend } from '@/lib/chartUtils';
import UnifiedContentCard from '@/components/content/shared/UnifiedContentCard';
import ContentEditor from '@/components/content/shared/ContentEditor';
import MultiPlatformContentEditor from '@/components/content/shared/MultiPlatformContentEditor';
import {
  ShadcnBarChartComponent,
  ShadcnLineChartComponent,
  ShadcnPieChartComponent,
  ShadcnStackedBarChartComponent,
  ShadcnAreaChartComponent,
  ShadcnSparkline,
  ShadcnMetricGauge
} from '@/components/content/charts/ShadcnCharts';
import { Card, CardBody, CardHeader, Button, Chip, Divider } from '@heroui/react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart3, PieChart, Activity } from 'lucide-react';

interface EnhancedContentDashboardProps {
  className?: string;
}

const EnhancedContentDashboard: React.FC<EnhancedContentDashboardProps> = ({ className = '' }) => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [multiPlatformContent, setMultiPlatformContent] = useState<MultiPlatformContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingMultiPlatform, setEditingMultiPlatform] = useState<{ title: string; publishedAt: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load recent content for real-time overview
  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadContent();
  };

  const handleEdit = (contentId: string) => {
    setEditingContentId(contentId);
  };

  const handleEditMultiPlatform = (title: string, publishedAt: string) => {
    setEditingMultiPlatform({ title, publishedAt });
  };

  const handleEditSave = () => {
    setEditingContentId(null);
    setEditingMultiPlatform(null);
    loadContent();
  };

  const handleEditCancel = () => {
    setEditingContentId(null);
    setEditingMultiPlatform(null);
  };

  const handleDelete = () => {
    setEditingContentId(null);
    setEditingMultiPlatform(null);
    loadContent();
  };

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

  // Calculate trends (compare last 15 days vs previous 15)
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
      views: Math.max(...Object.values(item.platforms).map(p => p.views || 0)),
      follows: Object.values(item.platforms).reduce((sum, p) => sum + (p.follows || 0), 0)
    }))
  ].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  const postsThisMonth = allCombinedContent.filter(item => {
    const daysAgo = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 30;
  }).length;

  const latestContent = allCombinedContent.slice(0, 3);

  // Prepare multi-line chart data for platform comparison
  const platformLineData = last30DaysData.map(day => {
    const dayContent = flattenedContent.filter(item =>
      new Date(item.published_at).toDateString() === new Date(day.date).toDateString()
    );

    const platformViews = {
      date: day.label,
      YouTube: dayContent.filter(item => item.platform === 'youtube').reduce((sum, item) => sum + (item.views || 0), 0),
      Instagram: dayContent.filter(item => item.platform === 'instagram').reduce((sum, item) => sum + (item.views || 0), 0),
      TikTok: dayContent.filter(item => item.platform === 'tiktok').reduce((sum, item) => sum + (item.views || 0), 0),
    };

    return platformViews;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
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
      <div className={`space-y-3 ${className}`}>
        <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-sm">
          <div className="text-red-400 text-sm">Error loading dashboard</div>
          <div className="text-red-300 text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#8A8D93]">
          Visual overview of all your accounts (@konavus). Check Weekly Review for detailed progression analysis.
        </div>
        <Button
          size="sm"
          variant="flat"
          color="default"
          onClick={handleRefresh}
          isLoading={refreshing}
          startContent={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {/* Key Metrics with Trend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ShadcnSparkline
          title="Avg Views/Post"
          data={last30DaysData}
          color="#5FE3B3"
          value={currentAvgViews}
        />
        <ShadcnSparkline
          title="Total Followers"
          data={last30DaysData}
          color="#8B5CF6"
          value={totalFollows}
        />
        <ShadcnSparkline
          title="Retention Rate"
          data={last30DaysData}
          color="#EC4899"
          value={avgRetention * 100}
          format="percentage"
        />
        <ShadcnSparkline
          title="Posts This Month"
          data={last30DaysData}
          color="#F59E0B"
          value={postsThisMonth}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShadcnBarChartComponent
          data={last30DaysData}
          title="Views Over Time (30 Days)"
          color="#5FE3B3"
          yAxisLabel="Views"
        />
        <div className="grid grid-cols-2 gap-4">
          <ShadcnPieChartComponent
            data={platformDistribution}
            title="Platform Distribution"
            showPercentages={true}
          />
          <ShadcnPieChartComponent
            data={formatDistribution}
            title="Content Format"
            showPercentages={true}
          />
        </div>
      </div>

      {/* Platform Performance Chart */}
      <ShadcnStackedBarChartComponent
        data={platformLineData}
        title="Platform Performance Comparison"
        bars={[
          { key: 'YouTube', color: '#EF4444', name: 'YouTube' },
          { key: 'Instagram', color: '#8B5CF6', name: 'Instagram' },
          { key: 'TikTok', color: '#EC4899', name: 'TikTok' }
        ]}
      />

      {/* Performance Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ShadcnMetricGauge
          label="Views Target"
          value={totalViews}
          target={50000}
          color="#5FE3B3"
        />
        <ShadcnMetricGauge
          label="Followers Goal"
          value={totalFollows}
          target={1000}
          color="#8B5CF6"
        />
        <ShadcnMetricGauge
          label="Retention Rate"
          value={avgRetention * 100}
          target={35}
          color="#EC4899"
          unit="%"
          format="percentage"
        />
        <ShadcnMetricGauge
          label="Monthly Posts"
          value={postsThisMonth}
          target={20}
          color="#F59E0B"
        />
      </div>

  
      {/* Empty State */}
      {allCombinedContent.length === 0 && (
        <Card className="bg-[#111] border-[#333]">
          <CardBody className="text-center py-12">
            <div className="text-lg mb-2 text-[#8A8D93]">📊 Dashboard Empty</div>
            <div className="text-sm mb-4 text-[#8A8D93]">No content data available yet</div>
            <div className="text-xs opacity-70 text-[#8A8D93]">
              Add some content through the input page to see your dashboard metrics
            </div>
          </CardBody>
        </Card>
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

          </div>
  );
};

export default EnhancedContentDashboard;