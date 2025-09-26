import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { saveMultiPlatformContent, MultiPlatformContentInput, InstagramMetrics, TikTokMetrics, YouTubeShortMetrics, YouTubeLongFormMetrics } from '@/lib/multiPlatformStorage';
import { handleContentCreation } from '@/lib/storage';
import PlatformIcon from '../shared/PlatformIcon';
import PlatformMetricsForm from './PlatformMetricsForm';

type PlatformType = 'instagram' | 'tiktok' | 'youtube_short' | 'youtube_long';

interface PlatformFormData {
  enabled: boolean;
  // Common fields
  account_handle?: string;
  url?: string;
  platform_video_id?: string;
  views?: number;
  likes?: number;
  follows?: number;

  // Instagram specific
  shares?: number;
  comments?: number;
  saves?: number;
  engagement_total?: number;
  average_watch_time_seconds?: number;
  non_follower_percent?: number;
  skip_rate?: number;

  // TikTok specific (some overlap with Instagram)
  retention_ratio?: number;

  // YouTube Short specific
  swipe_rate?: number;
  subscribers?: number;
  new_viewers_percent?: number;

  // YouTube Long Form specific
  total_retention_percent?: number;
  ctr?: number;
  retention_10s?: number;
  retention_30s?: number;
  returning_viewers_percent?: number;
  total_watch_time_minutes?: number;
  thumbnails?: string;
}

interface MultiPlatformForm {
  // Shared content details
  title: string;
  caption: string;
  script: string;
  primary_hook: string;
  published_at: string;
  video_length_seconds: number;
  format: 'long_form' | 'short';
  tags: string;

  // Platform-specific data
  instagram: PlatformFormData;
  tiktok: PlatformFormData;
  youtube_short: PlatformFormData;
  youtube_long: PlatformFormData;
}

const steps = [
  { id: 'content', title: 'Content Details', description: 'Shared details for all platforms' },
  { id: 'platforms', title: 'Platform Selection', description: 'Choose which platforms to post on' },
  { id: 'metrics', title: 'Platform Metrics', description: 'Add performance data for each platform' }
] as const;

type StepId = typeof steps[number]['id'];

interface MultiPlatformContentWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const MultiPlatformContentWizard: React.FC<MultiPlatformContentWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<StepId>('content');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(new Set(['tiktok']));

  const { register, handleSubmit, watch, formState: { errors }, trigger, setValue, control } = useForm<MultiPlatformForm>({
    defaultValues: {
      format: 'short',
      published_at: new Date().toISOString().slice(0, 10),
      instagram: { enabled: false },
      tiktok: { enabled: true },
      youtube_short: { enabled: false },
      youtube_long: { enabled: false }
    }
  });

  const watchedData = watch();

  const togglePlatform = (platform: PlatformType) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platform)) {
      newSelected.delete(platform);
      setValue(`${platform}.enabled`, false);
    } else {
      newSelected.add(platform);
      setValue(`${platform}.enabled`, true);
    }
    setSelectedPlatforms(newSelected);
  };

  const nextStep = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    let fieldsToValidate: string[] = [];

    switch (currentStep) {
      case 'content':
        fieldsToValidate = ['title', 'published_at', 'format'];
        break;
      case 'platforms':
        if (selectedPlatforms.size === 0) {
          alert('Please select at least one platform');
          return;
        }
        break;
      case 'metrics':
        // No validation needed for metrics
        break;
    }

    if (fieldsToValidate.length > 0) {
      try {
        const isValid = await trigger(fieldsToValidate as any);
        if (!isValid) {
          console.log('Validation failed for fields:', fieldsToValidate);
          return;
        }
      } catch (error) {
        console.error('Validation error:', error);
        return;
      }
    }

    const stepOrder: StepId[] = ['content', 'platforms', 'metrics'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const stepOrder: StepId[] = ['content', 'platforms', 'metrics'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const onSubmit = async (data: MultiPlatformForm) => {
    setIsSubmitting(true);

    try {
      const platforms: MultiPlatformContentInput['platforms'] = {};

      // Build platforms object with only selected platforms
      for (const platform of selectedPlatforms) {
        const platformData = data[platform];
        if (platformData.enabled) {
          // Filter out undefined values and enabled flag
          const cleanedData = Object.entries(platformData)
            .filter(([key, value]) => key !== 'enabled' && value !== undefined && value !== null && value !== '')
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

          platforms[platform] = cleanedData;
        }
      }

      const input: MultiPlatformContentInput = {
        title: data.title,
        caption: data.caption || undefined,
        script: data.script || undefined,
        primary_hook: data.primary_hook || undefined,
        published_at: data.published_at,
        video_length_seconds: data.video_length_seconds || undefined,
        format: data.format,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        platforms
      };

      await saveMultiPlatformContent(input);
      
      // Handle KPI update for each platform
      for (const platform of selectedPlatforms) {
        const platformData = data[platform];
        if (platformData.enabled) {
          // Import here to avoid circular dependency
          const { incrementContentShippedKPI } = await import('@/lib/weeklyKpi');
          await incrementContentShippedKPI(data.published_at);
        }
      }
      
      // Create single consolidated ship for multi-platform post
      const platformNames = Array.from(selectedPlatforms);
      const description = platformNames.length > 1 
        ? `📱 ${data.title} (${platformNames.length} platforms: ${platformNames.join(', ')})`
        : `📱 ${data.title} (${platformNames[0]})`;
      
      // Get the best URL (prefer YouTube if available)
      let bestUrl: string | undefined;
      for (const platform of ['youtube_long', 'youtube_short', 'tiktok', 'instagram']) {
        const platformData = data[platform as keyof typeof data];
        if (platformData?.enabled && platformData.url) {
          bestUrl = platformData.url;
          break;
        }
      }
      
      // Import and create ship
      const { logShip } = await import('@/lib/storage');
      logShip(description, bestUrl, 'content_input');
      
      console.log(`📱 Multi-platform content ship created: ${data.title} (${platformNames.join(', ')})`);
      
      
      onComplete?.();
    } catch (error) {
      console.error('Error saving multi-platform content:', error);
      alert(`Failed to save content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#111] border border-[#333] rounded-sm max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add Multi-Platform Content</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-[#8A8D93] hover:text-white transition-colors p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  currentStep === step.id ? 'bg-terminal-accent text-black' :
                  steps.findIndex(s => s.id === currentStep) > index ? 'bg-green-500 text-white' :
                  'bg-[#333] text-[#8A8D93]'
                )}>
                  {steps.findIndex(s => s.id === currentStep) > index ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <div className={cn(
                    'text-sm font-medium',
                    currentStep === step.id ? 'text-white' : 'text-[#8A8D93]'
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-[#8A8D93]">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-12 h-px bg-[#333] mx-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6">
            {/* Step 1: Content Details */}
            {currentStep === 'content' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white mb-4">Content Details</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Title */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">
                      Title *
                    </label>
                    <input
                      {...register('title', { required: 'Title is required' })}
                      type="text"
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                      placeholder="Enter your content title"
                    />
                    {errors.title && (
                      <div className="mt-1 text-sm text-red-400">{errors.title.message}</div>
                    )}
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Format *</label>
                    <select
                      {...register('format', { required: 'Format is required' })}
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white focus:border-terminal-accent focus:outline-none"
                    >
                      <option value="short">Short Form</option>
                      <option value="long_form">Long Form</option>
                    </select>
                  </div>

                  {/* Published Date */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Published Date *</label>
                    <input
                      {...register('published_at', { required: 'Published date is required' })}
                      type="date"
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white focus:border-terminal-accent focus:outline-none"
                    />
                  </div>

                  {/* Video Length */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Video Length (seconds)</label>
                    <input
                      {...register('video_length_seconds', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                      placeholder="e.g. 30"
                    />
                  </div>

                  {/* Primary Hook */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Primary Hook</label>
                    <input
                      {...register('primary_hook')}
                      type="text"
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                      placeholder="Main hook or opening line"
                    />
                  </div>

                  {/* Caption */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">Caption</label>
                    <textarea
                      {...register('caption')}
                      rows={3}
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none resize-none"
                      placeholder="Content caption or description"
                    />
                  </div>

                  {/* Script */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">Script</label>
                    <textarea
                      {...register('script')}
                      rows={4}
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none resize-none"
                      placeholder="Full script or talking points"
                    />
                  </div>

                  {/* Tags */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">Tags</label>
                    <input
                      {...register('tags')}
                      type="text"
                      className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
                      placeholder="e.g. coding, tutorial, web-dev (comma separated)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Platform Selection */}
            {currentStep === 'platforms' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white mb-4">Select Platforms</h3>
                <div className="text-sm text-[#8A8D93] mb-6">
                  Choose which platforms you posted this content to. You'll add platform-specific metrics in the next step.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['instagram', 'tiktok', 'youtube_short', 'youtube_long'] as const).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        'p-6 border rounded-sm transition-all duration-200 text-left',
                        selectedPlatforms.has(platform)
                          ? 'border-terminal-accent bg-terminal-accent/10 shadow-lg'
                          : 'border-[#333] bg-[#0F0F0F] hover:border-[#555]'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <PlatformIcon platform={platform} size="md" />
                        <div className="font-medium text-white">
                          {platform === 'youtube_short' ? 'YouTube Shorts' :
                           platform === 'youtube_long' ? 'YouTube Long Form' :
                           platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </div>
                        {selectedPlatforms.has(platform) && (
                          <div className="ml-auto text-terminal-accent">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-[#8A8D93]">
                        {platform === 'instagram' && 'Stories, Reels, and Posts'}
                        {platform === 'tiktok' && 'Short-form vertical videos'}
                        {platform === 'youtube_short' && 'YouTube Shorts (vertical videos)'}
                        {platform === 'youtube_long' && 'Long-form YouTube videos'}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedPlatforms.size === 0 && (
                  <div className="text-center py-8 text-[#8A8D93] border border-[#333] bg-[#0F0F0F] rounded-sm">
                    <div className="text-sm">Select at least one platform to continue</div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Platform Metrics */}
            {currentStep === 'metrics' && (
              <div className="space-y-8">
                <h3 className="text-lg font-medium text-white mb-4">Platform Metrics</h3>
                <div className="text-sm text-[#8A8D93] mb-6">
                  Add performance metrics for each platform. You can leave fields empty if you don't have the data yet.
                </div>

                {Array.from(selectedPlatforms).map((platform) => (
                  <div key={platform} className="border border-[#333] bg-[#0F0F0F] rounded-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <PlatformIcon platform={platform} size="md" />
                      <h4 className="text-lg font-medium text-white">
                        {platform === 'youtube_short' ? 'YouTube Shorts' :
                         platform === 'youtube_long' ? 'YouTube Long Form' :
                         platform.charAt(0).toUpperCase() + platform.slice(1)} Metrics
                      </h4>
                    </div>

                    <PlatformMetricsForm platform={platform} register={register} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#333] flex justify-between">
            <button
              type="button"
              onClick={currentStep === 'content' ? onCancel : prevStep}
              className="px-4 py-2 text-[#8A8D93] hover:text-white transition-colors"
            >
              {currentStep === 'content' ? 'Cancel' : 'Previous'}
            </button>

            <div className="flex gap-3">
              {currentStep !== 'metrics' ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-terminal-accent hover:bg-terminal-accent/90 text-black font-medium rounded-sm transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-terminal-accent hover:bg-terminal-accent/90 text-black font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Content'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiPlatformContentWizard;