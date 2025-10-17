import React, { useEffect, useState } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import { loadMultiPlatformContent, MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { generateDailyData, generatePlatformDistributionData, generateFormatDistributionData, calculateTrend } from '@/lib/chartUtils';
import QuickMetrics from '@/components/content/dashboard/QuickMetrics';
import CurrentWeekOverview from '@/components/content/dashboard/CurrentWeekOverview';
import UnifiedContentCard from '@/components/content/shared/UnifiedContentCard';
import ContentEditor from '@/components/content/shared/ContentEditor';
import MultiPlatformContentEditor from '@/components/content/shared/MultiPlatformContentEditor';
import LineChart from '@/components/content/charts/LineChart';
import PieChart from '@/components/content/charts/PieChart';
import MetricGauge from '@/components/content/charts/MetricGauge';
import TrendIndicator from '@/components/content/charts/TrendIndicator';
import PerformanceBar from '@/components/content/charts/PerformanceBar';
import EnhancedContentDashboard from '@/components/content/dashboard/EnhancedContentDashboard';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { BarChart3 } from 'lucide-react';

const ContentDashboard: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [multiPlatformContent, setMultiPlatformContent] = useState<MultiPlatformContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingMultiPlatform, setEditingMultiPlatform] = useState<{ title: string; publishedAt: string } | null>(null);

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

      <EnhancedContentDashboard />

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

export default ContentDashboard;


