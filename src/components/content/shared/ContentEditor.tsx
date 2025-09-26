import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { loadContentItemDetail, updateContentItemWithMetrics, deleteContentItem } from '@/lib/storage';
import PlatformIcon from './PlatformIcon';

type ContentEditForm = {
  platform: 'youtube' | 'tiktok' | 'instagram';
  format: 'long_form' | 'short';
  account_handle: string;
  title: string;
  url?: string;
  published_at: string;
  video_length_seconds?: number;
  primary_hook?: string;
  caption?: string;
  script?: string;
  views?: number;
  shares?: number;
  saves?: number;
  follows?: number;
  average_watch_time_seconds?: number;
  retention_ratio?: number;
  followers_per_reach?: number;
  non_follower_reach_ratio?: number;
};

interface ContentEditorProps {
  contentId: string;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  contentId,
  onSave,
  onCancel,
  onDelete
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<ContentEditForm>();

  const selectedPlatform = watch('platform');
  const lengthSec = Number(watch('video_length_seconds') || 0);
  const awtSec = Number(watch('average_watch_time_seconds') || 0);
  const retention = lengthSec > 0 ? Math.min(1, Math.max(0, awtSec / lengthSec)) : undefined;

  // Load existing content data
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await loadContentItemDetail(contentId);
        if (!data) {
          throw new Error('Content not found');
        }

        // Populate form with existing data
        setValue('platform', data.item.platform as any);
        setValue('format', data.item.format as any);
        setValue('account_handle', data.item.account_handle || '');
        setValue('title', data.item.title);
        setValue('url', data.item.url || '');
        setValue('published_at', data.item.published_at);
        setValue('video_length_seconds', data.item.video_length_seconds || undefined);
        setValue('primary_hook', data.item.primary_hook || '');
        setValue('caption', data.item.caption || '');
        setValue('script', data.item.script || '');

        if (data.metrics) {
          setValue('views', data.metrics.views || undefined);
          setValue('shares', data.metrics.shares || undefined);
          setValue('saves', data.metrics.saves || undefined);
          setValue('follows', data.metrics.follows || undefined);
          setValue('average_watch_time_seconds', data.metrics.average_watch_time_seconds || undefined);
          setValue('retention_ratio', data.metrics.retention_ratio || undefined);
          setValue('followers_per_reach', data.metrics.followers_per_reach || undefined);
          setValue('non_follower_reach_ratio', data.metrics.non_follower_reach_ratio || undefined);
        }
      } catch (e) {
        console.error('Failed to load content:', e);
        setError(e instanceof Error ? e.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [contentId, setValue]);

  // Auto-set format for non-YouTube platforms
  useEffect(() => {
    if (selectedPlatform && selectedPlatform !== 'youtube') {
      setValue('format', 'short', { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedPlatform, setValue]);

  const onSubmit = async (data: ContentEditForm) => {
    setSaving(true);
    setError(null);

    try {
      await updateContentItemWithMetrics(
        contentId,
        {
          platform: data.platform,
          format: data.format,
          account_handle: data.account_handle,
          title: data.title,
          caption: data.caption,
          script: data.script,
          primary_hook: data.primary_hook,
          published_at: data.published_at,
          video_length_seconds: data.video_length_seconds,
          url: data.url
        },
        {
          views: data.views,
          shares: data.shares,
          saves: data.saves,
          follows: data.follows,
          average_watch_time_seconds: data.average_watch_time_seconds,
          retention_ratio: data.retention_ratio || retention,
          followers_per_reach: data.followers_per_reach,
          non_follower_reach_ratio: data.non_follower_reach_ratio
        }
      );

      onSave?.();
    } catch (error) {
      console.error('Failed to update content:', error);
      setError(error instanceof Error ? error.message : 'Failed to update content');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteContentItem(contentId);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete content:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete content');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#111] border border-[#333] rounded-sm p-6 max-w-md w-full mx-4">
          <div className="animate-pulse text-center">
            <div className="text-sm text-[#8A8D93]">Loading content...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !contentId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#111] border border-red-500/30 rounded-sm p-6 max-w-md w-full mx-4">
          <div className="text-red-400 text-sm mb-4">{error}</div>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 border border-[#333] text-[#8A8D93] rounded-sm hover:bg-[#2A2A2A]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#111] border border-[#333] rounded-sm w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="p-6 border-b border-[#333]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Edit Content</h2>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <div className="text-xs text-yellow-400">● Unsaved changes</div>
                )}
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-[#8A8D93] hover:text-white p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Content Form */}
          <div className="p-6 space-y-6">
            {/* Platform & Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {['youtube', 'tiktok', 'instagram'].map((platform) => (
                    <label
                      key={platform}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 border rounded-sm cursor-pointer transition-colors',
                        watch('platform') === platform
                          ? 'border-terminal-accent bg-terminal-accent/10'
                          : 'border-[#333] hover:border-[#444]'
                      )}
                    >
                      <PlatformIcon platform={platform as any} size="md" />
                      <span className="text-xs font-medium capitalize">{platform}</span>
                      <input
                        type="radio"
                        value={platform}
                        className="sr-only"
                        {...register('platform')}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cn(
                    'flex items-center gap-2 p-3 border rounded-sm cursor-pointer transition-colors',
                    watch('format') === 'short' ? 'border-terminal-accent bg-terminal-accent/10' : 'border-[#333] hover:border-[#444]',
                    selectedPlatform !== 'youtube' && 'opacity-50 cursor-not-allowed'
                  )}>
                    <input
                      type="radio"
                      value="short"
                      className="sr-only"
                      {...register('format')}
                    />
                    <span className="text-sm">Short Form</span>
                  </label>
                  <label className={cn(
                    'flex items-center gap-2 p-3 border rounded-sm cursor-pointer transition-colors',
                    watch('format') === 'long_form' ? 'border-terminal-accent bg-terminal-accent/10' : 'border-[#333] hover:border-[#444]',
                    selectedPlatform !== 'youtube' && 'opacity-50 cursor-not-allowed'
                  )}>
                    <input
                      type="radio"
                      value="long_form"
                      className="sr-only"
                      disabled={selectedPlatform !== 'youtube'}
                      {...register('format')}
                    />
                    <span className="text-sm">Long Form</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Title *</label>
                <input
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                  placeholder="Enter video title"
                  {...register('title', { required: 'Title is required' })}
                />
                {errors.title && (
                  <div className="text-red-400 text-xs mt-1">{errors.title.message}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Account Handle</label>
                <input
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                  placeholder="@username"
                  {...register('account_handle')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Published Date</label>
                <input
                  type="date"
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white"
                  {...register('published_at')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">URL</label>
                <input
                  type="url"
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                  placeholder="https://..."
                  {...register('url')}
                />
              </div>
            </div>

            {/* Creative Elements */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Creative Elements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Video Length (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="60"
                    {...register('video_length_seconds', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Primary Hook</label>
                  <input
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="Opening line that grabs attention"
                    {...register('primary_hook')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Caption</label>
                <textarea
                  rows={3}
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666] resize-none"
                  placeholder="Caption or description"
                  {...register('caption')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Script</label>
                <textarea
                  rows={4}
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666] resize-none"
                  placeholder="Full script or key talking points"
                  {...register('script')}
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Views</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="1000"
                    {...register('views', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Follows</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="50"
                    {...register('follows', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Shares</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="25"
                    {...register('shares', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Saves</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="75"
                    {...register('saves', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Avg Watch Time (s)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="30"
                    {...register('average_watch_time_seconds', { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-end">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-white mb-1">Retention Rate</label>
                    <div className="bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-terminal-accent">
                      {retention !== undefined ? `${Math.round(retention * 100)}%` : '—'}
                    </div>
                    <div className="text-xs text-[#8A8D93] mt-1">Auto-calculated</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Followers/Reach</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="0.05"
                    {...register('followers_per_reach', { valueAsNumber: true })}
                  />
                  <div className="text-xs text-[#8A8D93] mt-1">Decimal (0.0-1.0)</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Non-Follower Reach</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="0.8"
                    {...register('non_follower_reach_ratio', { valueAsNumber: true })}
                  />
                  <div className="text-xs text-[#8A8D93] mt-1">Decimal (0.0-1.0)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#333] flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="px-4 py-2 border border-red-500/30 text-red-400 rounded-sm hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-[#333] text-[#8A8D93] rounded-sm hover:bg-[#2A2A2A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-terminal-accent text-black rounded-sm hover:bg-terminal-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-[#111] border border-red-500/30 rounded-sm p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-white mb-4">Delete Content</h3>
              <p className="text-[#8A8D93] text-sm mb-6">
                Are you sure you want to delete this content? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-[#333] text-[#8A8D93] rounded-sm hover:bg-[#2A2A2A]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentEditor;