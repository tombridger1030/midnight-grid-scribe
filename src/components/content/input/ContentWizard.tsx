import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { saveContentItemWithMetrics, handleContentCreation } from '@/lib/storage';
import PlatformIcon from '../shared/PlatformIcon';

type ContentForm = {
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
  likes?: number;
  shares?: number;
  saves?: number;
  follows?: number;
  average_watch_time_seconds?: number;
  retention_ratio?: number;
  followers_per_reach?: number;
  non_follower_reach_ratio?: number;
  // YouTube Shorts specific fields
  swipe_rate?: number;
  new_viewers_percent?: number;
};

const steps = [
  { id: 'meta', title: 'Content Details', description: 'Basic information about your content' },
  { id: 'creative', title: 'Creative Elements', description: 'Hooks, captions, and scripts' },
  { id: 'metrics', title: 'Performance Metrics', description: 'Views, engagement, and analytics' }
] as const;

type StepId = typeof steps[number]['id'];

interface ContentWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const ContentWizard: React.FC<ContentWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<StepId>('meta');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, trigger, setValue, reset } = useForm<ContentForm>({
    defaultValues: {
      platform: 'tiktok',
      format: 'short',
      published_at: new Date().toISOString().slice(0, 10)
    }
  });

  const selectedPlatform = watch('platform');
  const lengthSec = Number(watch('video_length_seconds') || 0);
  const awtSec = Number(watch('average_watch_time_seconds') || 0);
  const retention = lengthSec > 0 ? Math.min(1, Math.max(0, awtSec / lengthSec)) : undefined;

  // Auto-set format for non-YouTube platforms
  React.useEffect(() => {
    if (selectedPlatform !== 'youtube') {
      setValue('format', 'short');
    }
  }, [selectedPlatform, setValue]);

  const onSubmit = async (data: ContentForm) => {
    setIsSubmitting(true);
    try {
      await saveContentItemWithMetrics(
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
          likes: data.likes,
          shares: data.shares,
          saves: data.saves,
          follows: data.follows,
          average_watch_time_seconds: data.average_watch_time_seconds,
          retention_ratio: data.retention_ratio || retention,
          followers_per_reach: data.followers_per_reach,
          non_follower_reach_ratio: data.non_follower_reach_ratio,
          swipe_rate: data.swipe_rate,
          new_viewers_percent: data.new_viewers_percent
        }
      );
      
      // Handle KPI update and ship feed entry
      await handleContentCreation(
        data.title,
        data.published_at,
        data.url,
        data.platform
      );
      
      reset();
      onComplete?.();
    } catch (error) {
      console.error('Failed to save content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const currentStepIndex = steps.findIndex(step => step.id === currentStep);
    const nextStepId = steps[currentStepIndex + 1]?.id;

    if (nextStepId) {
      const isValid = await trigger();
      if (isValid) {
        setCurrentStep(nextStepId);
      }
    } else {
      handleSubmit(onSubmit)();
    }
  };

  const prevStep = () => {
    const currentStepIndex = steps.findIndex(step => step.id === currentStep);
    const prevStepId = steps[currentStepIndex - 1]?.id;
    if (prevStepId) {
      setCurrentStep(prevStepId);
    }
  };

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'meta':
        return (
          <div className="space-y-4">
            {/* Platform Selection */}
            <div className="grid grid-cols-3 gap-3">
              {['youtube', 'tiktok', 'instagram'].map((platform) => (
                <label
                  key={platform}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 border rounded-sm cursor-pointer transition-colors',
                    selectedPlatform === platform
                      ? 'border-terminal-accent bg-terminal-accent/10'
                      : 'border-[#333] hover:border-[#444]'
                  )}
                >
                  <PlatformIcon platform={platform as any} size="lg" />
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

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Format</label>
              <div className="grid grid-cols-2 gap-3">
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

            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-white mb-1">URL</label>
                  <input
                    type="url"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="https://..."
                    {...register('url')}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'creative':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Primary Hook</label>
              <input
                className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                placeholder="Your opening line that grabs attention"
                {...register('primary_hook')}
              />
              <div className="text-xs text-[#8A8D93] mt-1">The first thing viewers hear/see</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Caption</label>
              <textarea
                rows={4}
                className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666] resize-none"
                placeholder="Caption or description for your content"
                {...register('caption')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Script</label>
              <textarea
                rows={6}
                className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666] resize-none"
                placeholder="Full script or key talking points"
                {...register('script')}
              />
            </div>
          </div>
        );

      case 'metrics':
        // YouTube Shorts specific metrics
        if (selectedPlatform === 'youtube' && watch('format') === 'short') {
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-white mb-1">Likes</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="100"
                    {...register('likes', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Retention %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="18.5"
                    {...register('retention_ratio', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Swipe Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="12.3"
                    {...register('swipe_rate', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">New Viewers %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                    placeholder="75.2"
                    {...register('new_viewers_percent', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          );
        }

        // Default metrics form for other platforms/formats
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-white mb-1">Followers Gained</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-[#0F0F0F] border border-[#333] p-3 rounded-sm text-white placeholder-[#666]"
                  placeholder="50"
                  {...register('follows', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Average Watch Time (s)</label>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Followers per Reach</label>
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors',
                currentStepIndex >= index
                  ? 'border-terminal-accent bg-terminal-accent text-black'
                  : 'border-[#333] text-[#666]'
              )}>
                {index + 1}
              </div>
              <div className="hidden sm:block">
                <div className={cn(
                  'text-sm font-medium',
                  currentStepIndex >= index ? 'text-white' : 'text-[#666]'
                )}>
                  {step.title}
                </div>
                <div className="text-xs text-[#8A8D93]">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-8 h-px mx-2',
                  currentStepIndex > index ? 'bg-terminal-accent' : 'bg-[#333]'
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="border border-[#333] bg-[#111] rounded-sm p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 border border-[#333] text-[#8A8D93] rounded-sm hover:bg-[#2A2A2A] transition-colors"
              >
                Previous
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-[#333] text-[#8A8D93] rounded-sm hover:bg-[#2A2A2A] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={nextStep}
            disabled={isSubmitting}
            className="px-6 py-2 bg-terminal-accent text-black rounded-sm hover:bg-terminal-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isLastStep ? 'Save Content' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContentWizard;