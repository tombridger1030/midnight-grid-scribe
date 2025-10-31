import React, { useState, useEffect } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import { loadMultiPlatformContent, MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { loadPendingMetricUpdates, completeMetricUpdate } from '@/lib/multiPlatformStorage';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Chip, Divider, Tabs, Tab } from '@heroui/react';
import { Calendar, TrendingUp, Users, Eye, Heart, MessageCircle, Share2, Clock, BarChart3, Save, RefreshCw } from 'lucide-react';
import { formatNumber } from '@/lib/chartUtils';
import PlatformIcon from '@/components/content/shared/PlatformIcon';
import UnifiedContentCard from '@/components/content/shared/UnifiedContentCard';
import ContentEditor from '@/components/content/shared/ContentEditor';
import MultiPlatformContentEditor from '@/components/content/shared/MultiPlatformContentEditor';

interface ContentMetricsItem {
  id: string;
  title: string;
  platform: string;
  format: string;
  published_at: string;
  daysSincePublished: number;
  updateType?: '2_days' | '7_days' | '30_days';
  currentMetrics?: {
    views?: number;
    likes?: number;
    shares?: number;
    follows?: number;
    comments?: number;
    ctr?: number;
    retention_30s?: number;
    average_watch_time?: number;
  };
  formMetrics: {
    views?: string;
    likes?: string;
    shares?: string;
    follows?: string;
    comments?: string;
    ctr?: string;
    retention_30s?: string;
    average_watch_time?: string;
  };
}

const ContentMetrics: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [multiPlatformContent, setMultiPlatformContent] = useState<MultiPlatformContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('short-form');
  const [contentItems, setContentItems] = useState<ContentMetricsItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'success' | 'error' | null }>({});
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingMultiPlatform, setEditingMultiPlatform] = useState<{ title: string; publishedAt: string } | null>(null);

  // Load content data
  const loadContent = async () => {
    setLoading(true);
    try {
      const [singlePlatformData, multiPlatformData] = await Promise.all([
        loadRecentContent(100),
        loadMultiPlatformContent(50)
      ]);

      setAllContent(singlePlatformData);
      setMultiPlatformContent(multiPlatformData);
    } catch (e) {
      console.error('Failed to load content:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  // Process content items for different timeframes
  useEffect(() => {
    const processContentItems = () => {
      const now = new Date();
      const items: ContentMetricsItem[] = [];

      // Process single-platform content
      allContent.forEach(item => {
        const publishedDate = new Date(item.published_at);
        const daysSince = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

        let updateType: '2_days' | '7_days' | '30_days' | undefined;

        if (item.format === 'short' && daysSince >= 2 && daysSince < 7) {
          updateType = '2_days';
        } else if (item.platform === 'youtube' && item.format === 'long_form') {
          if (daysSince >= 7 && daysSince < 30) {
            updateType = '7_days';
          } else if (daysSince >= 30) {
            updateType = '30_days';
          }
        }

        if (updateType) {
          items.push({
            id: item.id,
            title: item.title,
            platform: item.platform,
            format: item.format,
            published_at: item.published_at,
            daysSincePublished: daysSince,
            updateType,
            currentMetrics: {
              views: item.views,
              likes: item.likes,
              shares: item.shares,
              follows: item.follows,
              comments: item.comments,
              ctr: item.ctr,
              retention_30s: item.retention_30s,
              average_watch_time: item.average_watch_time_seconds
            },
            formMetrics: {}
          });
        }
      });

      // Process multi-platform content
      multiPlatformContent.forEach(item => {
        const publishedDate = new Date(item.published_at);
        const daysSince = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

        Object.entries(item.platforms).forEach(([platform, data]) => {
          let updateType: '2_days' | '7_days' | '30_days' | undefined;

          if (item.format === 'short' && daysSince >= 2 && daysSince < 7) {
            updateType = '2_days';
          } else if (platform.includes('youtube') && item.format === 'long_form') {
            if (daysSince >= 7 && daysSince < 30) {
              updateType = '7_days';
            } else if (daysSince >= 30) {
              updateType = '30_days';
            }
          }

          if (updateType) {
            items.push({
              id: `${item.id}-${platform}`,
              title: item.title,
              platform,
              format: item.format,
              published_at: item.published_at,
              daysSincePublished: daysSince,
              updateType,
              currentMetrics: {
                views: data.views,
                likes: data.likes,
                shares: data.shares,
                follows: data.follows,
                comments: data.comments,
                ctr: data.ctr,
                retention_30s: data.retention_30s,
                average_watch_time: data.average_watch_time_seconds
              },
              formMetrics: {}
            });
          }
        });
      });

      setContentItems(items);
    };

    if (allContent.length > 0 || multiPlatformContent.length > 0) {
      processContentItems();
    }
  }, [allContent, multiPlatformContent]);

  // Filter items by active tab
  const getFilteredItems = () => {
    return contentItems.filter(item => {
      if (activeTab === 'short-form') {
        return item.format === 'short' && item.updateType === '2_days';
      } else if (activeTab === 'youtube-7-days') {
        return item.platform === 'youtube' && item.format === 'long_form' && item.updateType === '7_days';
      } else if (activeTab === 'youtube-30-days') {
        return item.platform === 'youtube' && item.format === 'long_form' && item.updateType === '30_days';
      }
      return false;
    });
  };

  const handleMetricChange = (itemId: string, field: string, value: string) => {
    setContentItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, formMetrics: { ...item.formMetrics, [field]: value } }
        : item
    ));
  };

  const handleSave = async (itemId: string) => {
    setSaving(itemId);
    setSaveStatus(prev => ({ ...prev, [itemId]: null }));

    try {
      const item = contentItems.find(i => i.id === itemId);
      if (!item) return;

      // Convert form values to numbers
      const metricsData: any = {};
      Object.entries(item.formMetrics).forEach(([key, value]) => {
        if (value && value.trim()) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            metricsData[key] = numValue;
          }
        }
      });

      // Update the content in storage (this would need to be implemented)
      console.log('Saving metrics for item:', itemId, metricsData);

      // For now, just show success state
      setSaveStatus(prev => ({ ...prev, [itemId]: 'success' }));

      // Clear form values
      setContentItems(prev => prev.map(i =>
        i.id === itemId
          ? { ...i, formMetrics: {} }
          : i
      ));

      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [itemId]: null }));
      }, 2000);

    } catch (error) {
      console.error('Failed to save metrics:', error);
      setSaveStatus(prev => ({ ...prev, [itemId]: 'error' }));
    } finally {
      setSaving(null);
    }
  };

  const filteredItems = getFilteredItems();

  // Edit handlers
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

  // Get latest posts for display
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

  const latestContent = allCombinedContent.slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-16 bg-[#111] rounded-sm mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-[#111] rounded-sm"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#111] border-[#333]">
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Content Metrics Management</h1>
              <p className="text-[#8A8D93]">
                Update performance metrics for your content at key intervals
              </p>
            </div>
            <Button
              variant="flat"
              color="default"
              startContent={<RefreshCw size={16} />}
              onClick={loadContent}
            >
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Card className="bg-[#111] border-[#333]">
        <CardBody className="p-6">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            color="primary"
            variant="underlined"
          >
            <Tab
              key="short-form"
              title={
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} />
                  <span>Short Form (2 Days)</span>
                  <Chip size="sm" variant="flat">
                    {contentItems.filter(item => item.format === 'short' && item.updateType === '2_days').length}
                  </Chip>
                </div>
              }
            />
            <Tab
              key="youtube-7-days"
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} />
                  <span>YouTube Long Form (7 Days)</span>
                  <Chip size="sm" variant="flat">
                    {contentItems.filter(item => item.platform === 'youtube' && item.format === 'long_form' && item.updateType === '7_days').length}
                  </Chip>
                </div>
              }
            />
            <Tab
              key="youtube-30-days"
              title={
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>YouTube Long Form (30 Days)</span>
                  <Chip size="sm" variant="flat">
                    {contentItems.filter(item => item.platform === 'youtube' && item.format === 'long_form' && item.updateType === '30_days').length}
                  </Chip>
                </div>
              }
            />
          </Tabs>
        </CardBody>
      </Card>

      {/* Latest Posts */}
      {latestContent.length > 0 && (
        <Card className="bg-[#111] border-[#333]">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Latest Posts</h3>
              <div className="text-xs text-[#8A8D93]">Most recent content</div>
            </div>
            <div className="space-y-3">
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
          </CardBody>
        </Card>
      )}

      {/* Content Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card className="bg-[#111] border-[#333]">
            <CardBody className="text-center py-12">
              <div className="text-lg mb-2 text-[#8A8D93]">📊 No Metrics to Update</div>
              <div className="text-sm mb-4 text-[#8A8D93]">
                {activeTab === 'short-form' && 'No short-form content ready for 2-day metrics update'}
                {activeTab === 'youtube-7-days' && 'No YouTube long-form content ready for 7-day metrics update'}
                {activeTab === 'youtube-30-days' && 'No YouTube long-form content ready for 30-day metrics update'}
              </div>
              <div className="text-xs opacity-70 text-[#8A8D93]">
                Check back later or add more content through the input page
              </div>
            </CardBody>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="bg-[#111] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={item.platform as any} size="md" />
                    <div>
                      <h3 className="text-white font-medium">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#8A8D93]">
                        <span>{item.format === 'short' ? 'Short Form' : 'Long Form'}</span>
                        <span>•</span>
                        <span>Published {item.daysSincePublished} days ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {saveStatus[item.id] === 'success' && (
                      <Chip size="sm" color="success" variant="flat">
                        Saved
                      </Chip>
                    )}
                    {saveStatus[item.id] === 'error' && (
                      <Chip size="sm" color="danger" variant="flat">
                        Error
                      </Chip>
                    )}
                    <Button
                      size="sm"
                      color="primary"
                      startContent={<Save size={14} />}
                      isLoading={saving === item.id}
                      onClick={() => handleSave(item.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {/* Views */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8D93] flex items-center gap-1">
                      <Eye size={12} />
                      Views
                    </label>
                    <Input
                      type="number"
                      placeholder={item.currentMetrics?.views?.toString() || '0'}
                      value={item.formMetrics.views || ''}
                      onChange={(e) => handleMetricChange(item.id, 'views', e.target.value)}
                      size="sm"
                      classNames={{
                        input: "bg-[#0F0F0F] text-white text-sm",
                        inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                      }}
                    />
                  </div>

                  {/* Likes */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8D93] flex items-center gap-1">
                      <Heart size={12} />
                      Likes
                    </label>
                    <Input
                      type="number"
                      placeholder={item.currentMetrics?.likes?.toString() || '0'}
                      value={item.formMetrics.likes || ''}
                      onChange={(e) => handleMetricChange(item.id, 'likes', e.target.value)}
                      size="sm"
                      classNames={{
                        input: "bg-[#0F0F0F] text-white text-sm",
                        inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                      }}
                    />
                  </div>

                  {/* Comments */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8D93] flex items-center gap-1">
                      <MessageCircle size={12} />
                      Comments
                    </label>
                    <Input
                      type="number"
                      placeholder={item.currentMetrics?.comments?.toString() || '0'}
                      value={item.formMetrics.comments || ''}
                      onChange={(e) => handleMetricChange(item.id, 'comments', e.target.value)}
                      size="sm"
                      classNames={{
                        input: "bg-[#0F0F0F] text-white text-sm",
                        inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                      }}
                    />
                  </div>

                  {/* Shares */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8D93] flex items-center gap-1">
                      <Share2 size={12} />
                      Shares
                    </label>
                    <Input
                      type="number"
                      placeholder={item.currentMetrics?.shares?.toString() || '0'}
                      value={item.formMetrics.shares || ''}
                      onChange={(e) => handleMetricChange(item.id, 'shares', e.target.value)}
                      size="sm"
                      classNames={{
                        input: "bg-[#0F0F0F] text-white text-sm",
                        inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                      }}
                    />
                  </div>

                  {/* Follows */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8D93] flex items-center gap-1">
                      <Users size={12} />
                      New Followers
                    </label>
                    <Input
                      type="number"
                      placeholder={item.currentMetrics?.follows?.toString() || '0'}
                      value={item.formMetrics.follows || ''}
                      onChange={(e) => handleMetricChange(item.id, 'follows', e.target.value)}
                      size="sm"
                      classNames={{
                        input: "bg-[#0F0F0F] text-white text-sm",
                        inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                      }}
                    />
                  </div>

                  {/* CTR (YouTube Long Form Only) */}
                  {(item.platform === 'youtube' && item.format === 'long_form') && (
                    <div className="space-y-2">
                      <label className="text-xs text-[#8A8D93]">CTR (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={item.currentMetrics?.ctr?.toString() || '0.0'}
                        value={item.formMetrics.ctr || ''}
                        onChange={(e) => handleMetricChange(item.id, 'ctr', e.target.value)}
                        size="sm"
                        classNames={{
                          input: "bg-[#0F0F0F] text-white text-sm",
                          inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                        }}
                      />
                    </div>
                  )}

                  {/* Retention @ 30s (YouTube Long Form Only) */}
                  {(item.platform === 'youtube' && item.format === 'long_form') && (
                    <div className="space-y-2">
                      <label className="text-xs text-[#8A8D93]">Retention @ 30s (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={item.currentMetrics?.retention_30s?.toString() || '0.0'}
                        value={item.formMetrics.retention_30s || ''}
                        onChange={(e) => handleMetricChange(item.id, 'retention_30s', e.target.value)}
                        size="sm"
                        classNames={{
                          input: "bg-[#0F0F0F] text-white text-sm",
                          inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                        }}
                      />
                    </div>
                  )}

                  {/* Average Watch Time */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8D93] flex items-center gap-1">
                      <Clock size={12} />
                      Avg Watch Time
                    </label>
                    <Input
                      type="number"
                      placeholder={item.currentMetrics?.average_watch_time?.toString() || '0'}
                      value={item.formMetrics.average_watch_time || ''}
                      onChange={(e) => handleMetricChange(item.id, 'average_watch_time', e.target.value)}
                      size="sm"
                      classNames={{
                        input: "bg-[#0F0F0F] text-white text-sm",
                        inputWrapper: "bg-[#0F0F0F] border-[#333] hover:border-[#444] min-h-0"
                      }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Content Editor Modals */}
      {editingContentId && (
        <ContentEditor
          contentId={editingContentId}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          onDelete={() => {
            setEditingContentId(null);
            loadContent();
          }}
        />
      )}

      {editingMultiPlatform && (
        <MultiPlatformContentEditor
          contentTitle={editingMultiPlatform.title}
          publishedAt={editingMultiPlatform.publishedAt}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          onDelete={() => {
            setEditingMultiPlatform(null);
            loadContent();
          }}
        />
      )}
    </div>
  );
};

export default ContentMetrics;