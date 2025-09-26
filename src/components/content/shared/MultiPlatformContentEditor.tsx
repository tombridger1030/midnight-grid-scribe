import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { loadMultiPlatformContent, updatePlatformMetrics, deleteMultiPlatformContent, MultiPlatformContentItem, PlatformMetrics } from '@/lib/multiPlatformStorage';
import PlatformIcon from './PlatformIcon';

type PlatformType = 'instagram' | 'tiktok' | 'youtube';

interface PlatformFormData extends PlatformMetrics {
  enabled: boolean;
  // YouTube Shorts specific fields
  swipe_rate?: number;
  new_viewers_percent?: number;
}

interface MultiPlatformEditForm {
  // Shared content details (read-only)
  title: string;
  caption: string;
  script: string;
  primary_hook: string;
  published_at: string;
  video_length_seconds: number;
  format: 'long_form' | 'short';
  tags: string;

  // Platform-specific data (editable)
  instagram: PlatformFormData;
  tiktok: PlatformFormData;
  youtube: PlatformFormData;
}

interface MultiPlatformContentEditorProps {
  contentTitle: string;
  publishedAt: string;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

const MultiPlatformContentEditor: React.FC<MultiPlatformContentEditorProps> = ({
  contentTitle,
  publishedAt,
  onSave,
  onCancel,
  onDelete
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentData, setContentData] = useState<MultiPlatformContentItem | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformType>('instagram');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<MultiPlatformEditForm>();

  const availablePlatforms = contentData ? Object.keys(contentData.platforms) as PlatformType[] : [];

  useEffect(() => {
    loadContentData();
  }, [contentTitle, publishedAt]);

  const loadContentData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load multi-platform content and find matching item
      const allContent = await loadMultiPlatformContent(50);
      const matchingContent = allContent.find(
        item => item.title === contentTitle && item.published_at === publishedAt
      );

      if (!matchingContent) {
        throw new Error('Content not found');
      }

      setContentData(matchingContent);

      // Set form default values
      setValue('title', matchingContent.title);
      setValue('caption', matchingContent.caption || '');
      setValue('script', matchingContent.script || '');
      setValue('primary_hook', matchingContent.primary_hook || '');
      setValue('published_at', matchingContent.published_at);
      setValue('video_length_seconds', matchingContent.video_length_seconds || 0);
      setValue('format', matchingContent.format);
      setValue('tags', matchingContent.tags?.join(', ') || '');

      // Set platform data
      for (const platform of ['instagram', 'tiktok', 'youtube'] as const) {
        const platformData = matchingContent.platforms[platform];
        if (platformData) {
          setValue(`${platform}.enabled`, true);
          setValue(`${platform}.account_handle`, platformData.account_handle || '');
          setValue(`${platform}.url`, platformData.url || '');
          setValue(`${platform}.platform_video_id`, platformData.platform_video_id || '');
          setValue(`${platform}.views`, platformData.views || undefined);
          setValue(`${platform}.shares`, platformData.shares || undefined);
          setValue(`${platform}.saves`, platformData.saves || undefined);
          setValue(`${platform}.follows`, platformData.follows || undefined);
          setValue(`${platform}.average_watch_time_seconds`, platformData.average_watch_time_seconds || undefined);
          setValue(`${platform}.retention_ratio`, platformData.retention_ratio || undefined);
          setValue(`${platform}.reach`, platformData.reach || undefined);
          setValue(`${platform}.likes`, platformData.likes || undefined);
          setValue(`${platform}.comments`, platformData.comments || undefined);
          setValue(`${platform}.followers_per_reach`, platformData.followers_per_reach || undefined);
          setValue(`${platform}.non_follower_reach_ratio`, platformData.non_follower_reach_ratio || undefined);
          setValue(`${platform}.swipe_rate`, platformData.swipe_rate || undefined);
          setValue(`${platform}.new_viewers_percent`, platformData.new_viewers_percent || undefined);
        } else {
          setValue(`${platform}.enabled`, false);
        }
      }

      // Set first available platform as active tab
      if (availablePlatforms.length > 0) {
        setActiveTab(availablePlatforms[0]);
      }
    } catch (e) {
      console.error('Error loading content:', e);
      setError(e instanceof Error ? e.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: MultiPlatformEditForm) => {
    if (!contentData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Update metrics for each platform
      for (const platform of availablePlatforms) {
        const platformData = data[platform];
        const contentId = contentData.platforms[platform]?.content_id;

        if (contentId) {
          const metrics: Partial<PlatformMetrics> = {
            account_handle: platformData.account_handle,
            url: platformData.url,
            platform_video_id: platformData.platform_video_id,
            views: platformData.views,
            shares: platformData.shares,
            saves: platformData.saves,
            follows: platformData.follows,
            average_watch_time_seconds: platformData.average_watch_time_seconds,
            retention_ratio: platformData.retention_ratio,
            reach: platformData.reach,
            likes: platformData.likes,
            comments: platformData.comments,
            followers_per_reach: platformData.followers_per_reach,
            non_follower_reach_ratio: platformData.non_follower_reach_ratio,
            swipe_rate: platformData.swipe_rate,
            new_viewers_percent: platformData.new_viewers_percent
          };

          await updatePlatformMetrics(contentId, platform, metrics);
        }
      }

      onSave?.();
    } catch (e) {
      console.error('Error updating content:', e);
      setError(e instanceof Error ? e.message : 'Failed to update content');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!contentData) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteMultiPlatformContent(contentData.title, contentData.published_at);
      onDelete?.();
    } catch (e) {
      console.error('Error deleting content:', e);
      setError(e instanceof Error ? e.message : 'Failed to delete content');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#111] border border-[#333] rounded-sm p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
            <div className="ml-3 text-white">Loading content...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#111] border border-red-500/30 rounded-sm p-6 max-w-md w-full">
          <div className="text-red-400 text-sm font-medium mb-2">Error Loading Content</div>
          <div className="text-red-300 text-xs mb-4">{error}</div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-[#8A8D93] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={loadContentData}
              className="px-4 py-2 bg-terminal-accent text-black rounded-sm hover:bg-terminal-accent/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#111] border border-[#333] rounded-sm max-w-5xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Edit Multi-Platform Content</h2>
            <button
              onClick={onCancel}
              className="text-[#8A8D93] hover:text-white transition-colors p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-sm text-[#8A8D93]">
            Editing: <span className="text-white font-medium">{contentData?.title}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6">
            {/* Content Overview (Read-only) */}
            <div className="mb-8 p-4 bg-[#0F0F0F] border border-[#333] rounded-sm">
              <h3 className="text-lg font-medium text-white mb-4">Content Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[#8A8D93] mb-1">Title</div>
                  <div className="text-white">{contentData?.title}</div>
                </div>
                <div>
                  <div className="text-[#8A8D93] mb-1">Published Date</div>
                  <div className="text-white">{new Date(contentData?.published_at || '').toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-[#8A8D93] mb-1">Format</div>
                  <div className="text-white capitalize">{contentData?.format.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-[#8A8D93] mb-1">Platforms</div>
                  <div className="flex items-center gap-2">
                    {availablePlatforms.map(platform => (
                      <div key={platform} className="flex items-center gap-1">
                        <PlatformIcon platform={platform} size="sm" />
                        <span className="text-white text-xs capitalize">{platform}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Tabs */}
            <div className="mb-6">
              <div className="cyberpunk-slash-divider mb-2"></div>
              <div className="flex border-b border-accent-cyan/30">
                {availablePlatforms.map(platform => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActiveTab(platform)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cyberpunk-tab',
                      activeTab === platform
                        ? 'text-accent-cyan border-accent-cyan cyberpunk-glow-cyan'
                        : 'text-[#8A8D93] border-transparent hover:text-accent-cyan'
                    )}
                  >
                    <PlatformIcon platform={platform} size="sm" />
                    <span className="capitalize">{platform}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform-specific Metrics */}
            <div className="space-y-6">
              {availablePlatforms.map(platform => (
                <div
                  key={platform}
                  className={cn(
                    'space-y-6',
                    activeTab !== platform && 'hidden'
                  )}
                >
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <PlatformIcon platform={platform} size="md" />
                    <span className="capitalize">{platform} Metrics</span>
                  </h3>

                  {/* Render fields based on platform and format */}
                  {platform === 'youtube' && contentData?.format === 'short' ? (
                    /* YouTube Shorts - Only 5 specific fields */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Views */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Views</label>
                        <input
                          {...register(`${platform}.views`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      {/* Likes */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Likes</label>
                        <input
                          {...register(`${platform}.likes`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      {/* Retention % */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Retention %</label>
                        <input
                          {...register(`${platform}.retention_ratio`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="25.5"
                        />
                      </div>

                      {/* Swipe Rate % */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Swipe Rate %</label>
                        <input
                          {...register(`${platform}.swipe_rate`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="12.5"
                        />
                      </div>

                      {/* New Viewers % */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">New Viewers %</label>
                        <input
                          {...register(`${platform}.new_viewers_percent`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="65.0"
                        />
                      </div>
                    </div>
                  ) : (
                    /* All other platforms and formats - Full fields */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Account Handle */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Account Handle</label>
                        <input
                          {...register(`${platform}.account_handle`)}
                          type="text"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder={`@your_${platform}_handle`}
                        />
                      </div>

                      {/* URL */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Content URL</label>
                        <input
                          {...register(`${platform}.url`)}
                          type="url"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder={`${platform}.com/...`}
                        />
                      </div>

                      {/* Platform Video ID */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Video ID</label>
                        <input
                          {...register(`${platform}.platform_video_id`)}
                          type="text"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="Platform video ID"
                        />
                      </div>

                      {/* Core Metrics */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Views</label>
                        <input
                          {...register(`${platform}.views`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Likes</label>
                        <input
                          {...register(`${platform}.likes`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Comments</label>
                        <input
                          {...register(`${platform}.comments`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Shares</label>
                        <input
                          {...register(`${platform}.shares`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Saves</label>
                        <input
                          {...register(`${platform}.saves`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">New Follows</label>
                        <input
                          {...register(`${platform}.follows`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      {/* Advanced Metrics */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Avg Watch Time (sec)</label>
                        <input
                          {...register(`${platform}.average_watch_time_seconds`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="0.1"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0.0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Retention Ratio</label>
                        <input
                          {...register(`${platform}.retention_ratio`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0.25 (25%)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Reach</label>
                        <input
                          {...register(`${platform}.reach`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 p-4 border border-red-500/30 bg-red-500/10 rounded-sm">
                <div className="text-red-400 text-sm font-medium">Error</div>
                <div className="text-red-300 text-xs mt-1">{error}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#333] flex justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-[#8A8D93] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-400 hover:text-red-300 border border-red-500/30 rounded-sm transition-colors"
              >
                Delete All Platforms
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-terminal-accent hover:bg-terminal-accent/90 text-black font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Metrics'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-red-500/30 rounded-sm p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-red-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white">Delete Multi-Platform Content</h3>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-white text-sm">
                  Are you sure you want to delete <strong>"{contentData?.title}"</strong>?
                </p>
                <p className="text-[#8A8D93] text-xs">
                  This will permanently delete the content and all metrics from:
                </p>
                <div className="flex items-center gap-2 ml-4">
                  {availablePlatforms.map(platform => (
                    <div key={platform} className="flex items-center gap-1">
                      <PlatformIcon platform={platform} size="sm" />
                      <span className="text-xs text-white capitalize">{platform}</span>
                    </div>
                  ))}
                </div>
                <p className="text-red-400 text-xs font-medium">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-[#8A8D93] hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiPlatformContentEditor;