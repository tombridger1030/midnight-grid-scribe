import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { loadPendingMetricUpdates, completeMetricUpdate, MetricUpdate } from '@/lib/multiPlatformStorage';

interface MetricUpdateForm {
  ctr?: number;
  retention_30s?: number;
}

interface MetricUpdatePromptProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

const MetricUpdatePrompt: React.FC<MetricUpdatePromptProps> = ({ onComplete, onDismiss }) => {
  const [pendingUpdates, setPendingUpdates] = useState<MetricUpdate[]>([]);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MetricUpdateForm>();

  const currentUpdate = pendingUpdates[currentUpdateIndex];
  const hasMore = currentUpdateIndex < pendingUpdates.length - 1;

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      const updates = await loadPendingMetricUpdates();
      setPendingUpdates(updates);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load pending updates:', error);
      setLoading(false);
    }
  };

  const onSubmit = async (data: MetricUpdateForm) => {
    if (!currentUpdate) return;

    setIsSubmitting(true);

    try {
      await completeMetricUpdate(
        currentUpdate.id,
        data.ctr,
        data.retention_30s
      );

      // Move to next update or complete
      if (hasMore) {
        setCurrentUpdateIndex(prev => prev + 1);
        reset(); // Clear form for next update
      } else {
        onComplete?.();
      }
    } catch (error) {
      console.error('Failed to complete metric update:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (hasMore) {
      setCurrentUpdateIndex(prev => prev + 1);
      reset();
    } else {
      onDismiss?.();
    }
  };

  const handleSkipAll = () => {
    onDismiss?.();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#111] border border-[#333] rounded-sm p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent mx-auto mb-4"></div>
          <div className="text-white">Checking for metric updates...</div>
        </div>
      </div>
    );
  }

  if (pendingUpdates.length === 0) {
    return null; // No updates needed
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysAfterPost = () => {
    const publishedDate = new Date(currentUpdate.published_at);
    const dueDate = new Date(currentUpdate.due_date);
    const diffTime = dueDate.getTime() - publishedDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#111] border border-[#333] rounded-sm max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-[#333]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">📊 Metric Update Reminder</h2>
            <button
              onClick={handleSkipAll}
              className="text-[#8A8D93] hover:text-white transition-colors p-1"
              title="Skip all updates"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-sm text-[#8A8D93]">
            Update {currentUpdateIndex + 1} of {pendingUpdates.length}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6">
            {/* Content Info */}
            <div className="mb-6 p-4 bg-[#0F0F0F] border border-[#333] rounded-sm">
              <h3 className="text-sm font-medium text-white mb-2">{currentUpdate.content_title}</h3>
              <div className="text-xs text-[#8A8D93] space-y-1">
                <div>📅 Published: {formatDate(currentUpdate.published_at)}</div>
                <div>🎥 Platform: YouTube</div>
                <div>⏰ Update: {getDaysAfterPost()} days after post ({currentUpdate.update_type.replace('_', ' ')})</div>
              </div>
            </div>

            {/* Metrics Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Click-Through Rate (CTR) %
                </label>
                <input
                  {...register('ctr', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'CTR must be positive' },
                    max: { value: 100, message: 'CTR cannot exceed 100%' }
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                  placeholder="e.g. 12.5"
                />
                {errors.ctr && (
                  <div className="mt-1 text-sm text-red-400">{errors.ctr.message}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Retention at 30 seconds %
                </label>
                <input
                  {...register('retention_30s', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Retention must be positive' },
                    max: { value: 100, message: 'Retention cannot exceed 100%' }
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                  placeholder="e.g. 67.3"
                />
                {errors.retention_30s && (
                  <div className="mt-1 text-sm text-red-400">{errors.retention_30s.message}</div>
                )}
              </div>

              <div className="text-xs text-[#8A8D93] p-3 bg-[#0F0F0F] rounded-sm">
                💡 <strong>Tip:</strong> Check your YouTube Analytics for the most accurate {currentUpdate.update_type.replace('_', '-')} metrics.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#333] flex justify-between">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 text-[#8A8D93] hover:text-white transition-colors"
            >
              {hasMore ? 'Skip This One' : 'Skip All'}
            </button>

            <div className="flex gap-3">
              {hasMore && (
                <button
                  type="button"
                  onClick={handleSkipAll}
                  className="px-4 py-2 border border-[#333] text-[#8A8D93] rounded-sm hover:bg-[#2A2A2A] transition-colors"
                >
                  Skip All ({pendingUpdates.length - currentUpdateIndex})
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-terminal-accent hover:bg-terminal-accent/90 text-black font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : hasMore ? 'Save & Next' : 'Complete'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetricUpdatePrompt;