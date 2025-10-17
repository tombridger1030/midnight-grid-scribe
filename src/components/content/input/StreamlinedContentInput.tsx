import React, { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { saveContentItemWithMetrics, handleContentCreation } from '@/lib/storage';
import { saveMultiPlatformContent } from '@/lib/multiPlatformStorage';
import PlatformIcon from '../shared/PlatformIcon';
import { Button, Input, Textarea, Select, SelectItem, Card, CardBody, CardHeader, Divider, Switch, Chip } from '@heroui/react';
import { Calendar, Link, Hash, FileText, BarChart3, Plus, X, Save, Eye, EyeOff } from 'lucide-react';

// Zod schema for validation
const baseContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  caption: z.string().optional(),
  script: z.string().optional(),
  primary_hook: z.string().optional(),
  published_at: z.string().min(1, 'Published date is required'),
  video_length_seconds: z.number().positive().optional(),
  format: z.enum(['short', 'long_form']),
  tags: z.string().optional(),
});

const platformMetricsSchema = z.object({
  url: z.string().url().optional().or(z.literal('')),
  views: z.number().min(0).optional(),
  likes: z.number().min(0).optional(),
  follows: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
  saves: z.number().min(0).optional(),
  comments: z.number().min(0).optional(),
  retention_ratio: z.number().min(0).max(1).optional(),
  average_watch_time_seconds: z.number().min(0).optional(),
  // YouTube specific
  subscribers: z.number().min(0).optional(),
  swipe_rate: z.number().min(0).max(1).optional(),
  new_viewers_percent: z.number().min(0).max(1).optional(),
  total_watch_time_minutes: z.number().min(0).optional(),
});

const multiPlatformSchema = z.object({
  ...baseContentSchema.shape,
  platforms: z.object({
    instagram: platformMetricsSchema.optional(),
    tiktok: platformMetricsSchema.optional(),
    youtube_short: platformMetricsSchema.optional(),
    youtube_long: platformMetricsSchema.optional(),
  }),
});

const singlePlatformSchema = z.object({
  ...baseContentSchema.shape,
  platform: z.enum(['youtube', 'tiktok', 'instagram']),
  account_handle: z.string().optional(),
  ...platformMetricsSchema.shape,
});

type MultiPlatformForm = z.infer<typeof multiPlatformSchema>;
type SinglePlatformForm = z.infer<typeof singlePlatformSchema>;

interface StreamlinedContentInputProps {
  onComplete?: () => void;
  initialMode?: 'single' | 'multi';
}

const StreamlinedContentInput: React.FC<StreamlinedContentInputProps> = ({
  onComplete,
  initialMode = 'multi'
}) => {
  const [mode, setMode] = useState<'single' | 'multi'>(initialMode);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['tiktok']));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedData, setSavedData] = useState<any>(null);

  // Multi-platform form
  const multiForm = useForm<MultiPlatformForm>({
    resolver: zodResolver(multiPlatformSchema),
    defaultValues: {
      title: '',
      caption: '',
      script: '',
      primary_hook: '',
      published_at: new Date().toISOString().slice(0, 10),
      video_length_seconds: undefined,
      format: 'short',
      tags: '',
      platforms: {
        instagram: {},
        tiktok: {},
        youtube_short: {},
        youtube_long: {},
      }
    }
  });

  // Single-platform form
  const singleForm = useForm<SinglePlatformForm>({
    resolver: zodResolver(singlePlatformSchema),
    defaultValues: {
      platform: 'tiktok',
      format: 'short',
      published_at: new Date().toISOString().slice(0, 10),
      title: '',
      caption: '',
      script: '',
      primary_hook: '',
      tags: '',
      account_handle: '',
      url: '',
      views: undefined,
      likes: undefined,
      follows: undefined,
      shares: undefined,
      saves: undefined,
      comments: undefined,
      retention_ratio: undefined,
      average_watch_time_seconds: undefined,
      subscribers: undefined,
      swipe_rate: undefined,
      new_viewers_percent: undefined,
      total_watch_time_minutes: undefined,
    }
  });

  const watchedMulti = multiForm.watch();
  const watchedSingle = singleForm.watch();

  // Auto-save functionality
  const saveDraft = useCallback(() => {
    if (!autoSave) return;

    const formData = mode === 'multi' ? watchedMulti : watchedSingle;
    setSavedData(formData);
    localStorage.setItem('content-input-draft', JSON.stringify({
      mode,
      data: formData,
      timestamp: Date.now()
    }));
  }, [mode, watchedMulti, watchedSingle, autoSave]);

  // Auto-save on form changes
  React.useEffect(() => {
    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  // Load saved draft on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('content-input-draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
          setMode(parsed.mode);
          if (parsed.mode === 'multi') {
            multiForm.reset(parsed.data);
          } else {
            singleForm.reset(parsed.data);
          }
        }
      } catch (error) {
        console.error('Failed to load saved draft:', error);
      }
    }
  }, []);

  const togglePlatform = (platform: string) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platform)) {
      newSelected.delete(platform);
    } else {
      newSelected.add(platform);
    }
    setSelectedPlatforms(newSelected);
  };

  const onSubmitMulti = async (data: MultiPlatformForm) => {
    if (selectedPlatforms.size === 0) {
      alert('Please select at least one platform');
      return;
    }

    setIsSubmitting(true);
    try {
      const platforms: any = {};

      for (const platform of selectedPlatforms) {
        const platformData = data.platforms[platform as keyof typeof data.platforms];
        if (platformData) {
          platforms[platform] = Object.fromEntries(
            Object.entries(platformData).filter(([_, value]) =>
              value !== undefined && value !== '' && value !== null
            )
          );
        }
      }

      const input = {
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

      // Handle KPI updates
      for (const platform of selectedPlatforms) {
        const { incrementContentShippedKPI } = await import('@/lib/weeklyKpi');
        await incrementContentShippedKPI(data.published_at);
      }

      // Create ship entry
      const platformNames = Array.from(selectedPlatforms);
      const description = `📱 ${data.title} (${platformNames.length} platforms: ${platformNames.join(', ')})`;

      const { logShip } = await import('@/lib/storage');
      logShip(description, '', 'content_input');

      // Clear draft and reset form
      localStorage.removeItem('content-input-draft');
      multiForm.reset();
      setSelectedPlatforms(new Set(['tiktok']));

      onComplete?.();
    } catch (error) {
      console.error('Failed to save content:', error);
      alert(`Failed to save content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitSingle = async (data: SinglePlatformForm) => {
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
          url: data.url || undefined
        },
        {
          views: data.views,
          likes: data.likes,
          shares: data.shares,
          saves: data.saves,
          follows: data.follows,
          average_watch_time_seconds: data.average_watch_time_seconds,
          retention_ratio: data.retention_ratio,
          comments: data.comments,
          subscribers: data.subscribers,
          swipe_rate: data.swipe_rate,
          new_viewers_percent: data.new_viewers_percent,
          total_watch_time_minutes: data.total_watch_time_minutes,
        }
      );

      await handleContentCreation(data.title, data.published_at, data.url, data.platform);

      // Clear draft and reset form
      localStorage.removeItem('content-input-draft');
      singleForm.reset();

      onComplete?.();
    } catch (error) {
      console.error('Failed to save content:', error);
      alert(`Failed to save content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentForm = mode === 'multi' ? multiForm : singleForm;
  const currentWatched = mode === 'multi' ? watchedMulti : watchedSingle;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with Mode Toggle */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">Add Content</h2>
              {savedData && (
                <Chip size="sm" color="primary" variant="flat">
                  Draft Saved
                </Chip>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  size="sm"
                  isSelected={autoSave}
                  onValueChange={setAutoSave}
                />
                <span className="text-sm text-[#8A8D93]">Auto-save</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  size="sm"
                  isSelected={showAdvanced}
                  onValueChange={setShowAdvanced}
                />
                <span className="text-sm text-[#8A8D93]">Advanced</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="flex gap-2">
            <Button
              size="sm"
              color={mode === 'multi' ? 'primary' : 'default'}
              variant={mode === 'multi' ? 'solid' : 'flat'}
              onClick={() => setMode('multi')}
              startContent={<Hash size={16} />}
            >
              Multi-Platform
            </Button>
            <Button
              size="sm"
              color={mode === 'single' ? 'primary' : 'default'}
              variant={mode === 'single' ? 'solid' : 'flat'}
              onClick={() => setMode('single')}
              startContent={<FileText size={16} />}
            >
              Single Platform
            </Button>
          </div>
        </CardBody>
      </Card>

      <FormProvider {...currentForm}>
        <form onSubmit={currentForm.handleSubmit(mode === 'multi' ? onSubmitMulti : onSubmitSingle)}>
          {/* Basic Content Info */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Content Details</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Title *"
                  placeholder="Enter your content title"
                  {...currentForm.register('title')}
                  isInvalid={!!currentForm.formState.errors.title}
                  errorMessage={currentForm.formState.errors.title?.message}
                  classNames={{
                    input: "bg-[#0F0F0F] text-white",
                    label: "text-[#8A8D93]",
                  }}
                />

                <Input
                  type="date"
                  label="Published Date *"
                  {...currentForm.register('published_at')}
                  isInvalid={!!currentForm.formState.errors.published_at}
                  errorMessage={currentForm.formState.errors.published_at?.message}
                  classNames={{
                    input: "bg-[#0F0F0F] text-white",
                    label: "text-[#8A8D93]",
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mode === 'single' ? (
                  <>
                    <Select
                      label="Platform"
                      {...currentForm.register('platform')}
                      selectedKeys={[currentWatched.platform]}
                      onSelectionChange={(keys) => currentForm.setValue('platform', Array.from(keys)[0] as any)}
                      classNames={{
                        trigger: "bg-[#0F0F0F] text-white",
                        label: "text-[#8A8D93]",
                      }}
                    >
                      <SelectItem key="youtube" value="youtube">
                        YouTube
                      </SelectItem>
                      <SelectItem key="tiktok" value="tiktok">
                        TikTok
                      </SelectItem>
                      <SelectItem key="instagram" value="instagram">
                        Instagram
                      </SelectItem>
                    </Select>

                    <Input
                      label="Account Handle"
                      placeholder="@username"
                      {...currentForm.register('account_handle')}
                      classNames={{
                        input: "bg-[#0F0F0F] text-white",
                        label: "text-[#8A8D93]",
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Select
                      label="Format"
                      {...currentForm.register('format')}
                      selectedKeys={[currentWatched.format]}
                      onSelectionChange={(keys) => currentForm.setValue('format', Array.from(keys)[0] as any)}
                      classNames={{
                        trigger: "bg-[#0F0F0F] text-white",
                        label: "text-[#8A8D93]",
                      }}
                    >
                      <SelectItem key="short" value="short">
                        Short Form
                      </SelectItem>
                      <SelectItem key="long_form" value="long_form">
                        Long Form
                      </SelectItem>
                    </Select>

                    <Input
                      type="number"
                      label="Video Length (seconds)"
                      placeholder="60"
                      {...currentForm.register('video_length_seconds', { valueAsNumber: true })}
                      classNames={{
                        input: "bg-[#0F0F0F] text-white",
                        label: "text-[#8A8D93]",
                      }}
                    />
                  </>
                )}
              </div>

              <Textarea
                label="Primary Hook"
                placeholder="Your opening line that grabs attention"
                {...currentForm.register('primary_hook')}
                classNames={{
                  input: "bg-[#0F0F0F] text-white",
                  label: "text-[#8A8D93]",
                }}
              />

              <Textarea
                label="Caption"
                placeholder="Content caption or description"
                {...currentForm.register('caption')}
                classNames={{
                  input: "bg-[#0F0F0F] text-white",
                  label: "text-[#8A8D93]",
                }}
              />

              {showAdvanced && (
                <>
                  <Textarea
                    label="Script"
                    placeholder="Full script or key talking points"
                    {...currentForm.register('script')}
                    classNames={{
                      input: "bg-[#0F0F0F] text-white",
                      label: "text-[#8A8D93]",
                    }}
                  />

                  <Input
                    label="Tags"
                    placeholder="e.g. coding, tutorial, web-dev (comma separated)"
                    {...currentForm.register('tags')}
                    classNames={{
                      input: "bg-[#0F0F0F] text-white",
                      label: "text-[#8A8D93]",
                    }}
                  />
                </>
              )}
            </CardBody>
          </Card>

          {/* Platform Selection for Multi-Platform */}
          {mode === 'multi' && (
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Select Platforms</h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['instagram', 'tiktok', 'youtube_short', 'youtube_long'].map((platform) => (
                    <Button
                      key={platform}
                      variant={selectedPlatforms.has(platform) ? 'solid' : 'flat'}
                      color={selectedPlatforms.has(platform) ? 'primary' : 'default'}
                      onClick={() => togglePlatform(platform)}
                      className="h-20 flex-col gap-2"
                    >
                      <PlatformIcon platform={platform as any} size="md" />
                      <span className="text-sm">
                        {platform === 'youtube_short' ? 'YouTube Shorts' :
                         platform === 'youtube_long' ? 'YouTube Long' :
                         platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Metrics Input */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-[#8A8D93]" />
                <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
                <span className="text-sm text-[#8A8D93]">(Optional - leave blank if unknown)</span>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              {mode === 'multi' ? (
                Array.from(selectedPlatforms).map((platform) => (
                  <div key={platform} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#333]">
                      <PlatformIcon platform={platform as any} size="sm" />
                      <h4 className="font-medium text-white">
                        {platform === 'youtube_short' ? 'YouTube Shorts' :
                         platform === 'youtube_long' ? 'YouTube Long Form' :
                         platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Input
                        type="url"
                        label="URL"
                        placeholder="https://..."
                        {...currentForm.register(`platforms.${platform}.url`)}
                        classNames={{
                          input: "bg-[#0F0F0F] text-white",
                          label: "text-[#8A8D93]",
                        }}
                      />

                      <Input
                        type="number"
                        label="Views"
                        placeholder="1000"
                        {...currentForm.register(`platforms.${platform}.views`, { valueAsNumber: true })}
                        classNames={{
                          input: "bg-[#0F0F0F] text-white",
                          label: "text-[#8A8D93]",
                        }}
                      />

                      <Input
                        type="number"
                        label="Likes"
                        placeholder="100"
                        {...currentForm.register(`platforms.${platform}.likes`, { valueAsNumber: true })}
                        classNames={{
                          input: "bg-[#0F0F0F] text-white",
                          label: "text-[#8A8D93]",
                        }}
                      />

                      <Input
                        type="number"
                        label="Followers"
                        placeholder="50"
                        {...currentForm.register(`platforms.${platform}.follows`, { valueAsNumber: true })}
                        classNames={{
                          input: "bg-[#0F0F0F] text-white",
                          label: "text-[#8A8D93]",
                        }}
                      />

                      {showAdvanced && (
                        <>
                          <Input
                            type="number"
                            label="Retention %"
                            placeholder="18.5"
                            {...currentForm.register(`platforms.${platform}.retention_ratio`, {
                              valueAsNumber: true,
                              setValueAs: (v) => v ? parseFloat(v) / 100 : undefined
                            })}
                            classNames={{
                              input: "bg-[#0F0F0F] text-white",
                              label: "text-[#8A8D93]",
                            }}
                          />

                          {(platform.includes('youtube')) && (
                            <Input
                              type="number"
                              label="Watch Time (min)"
                              placeholder="120"
                              {...currentForm.register(`platforms.${platform}.total_watch_time_minutes`, { valueAsNumber: true })}
                              classNames={{
                                input: "bg-[#0F0F0F] text-white",
                                label: "text-[#8A8D93]",
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Input
                    type="url"
                    label="URL"
                    placeholder="https://..."
                    {...currentForm.register('url')}
                    classNames={{
                      input: "bg-[#0F0F0F] text-white",
                      label: "text-[#8A8D93]",
                    }}
                  />

                  <Input
                    type="number"
                    label="Views"
                    placeholder="1000"
                    {...currentForm.register('views', { valueAsNumber: true })}
                    classNames={{
                      input: "bg-[#0F0F0F] text-white",
                      label: "text-[#8A8D93]",
                    }}
                  />

                  <Input
                    type="number"
                    label="Likes"
                    placeholder="100"
                    {...currentForm.register('likes', { valueAsNumber: true })}
                    classNames={{
                      input: "bg-[#0F0F0F] text-white",
                      label: "text-[#8A8D93]",
                    }}
                  />

                  <Input
                    type="number"
                    label="Followers"
                    placeholder="50"
                    {...currentForm.register('follows', { valueAsNumber: true })}
                    classNames={{
                      input: "bg-[#0F0F0F] text-white",
                      label: "text-[#8A8D93]",
                    }}
                  />

                  {showAdvanced && (
                    <>
                      <Input
                        type="number"
                        label="Retention %"
                        placeholder="18.5"
                        {...currentForm.register('retention_ratio', {
                          valueAsNumber: true,
                          setValueAs: (v) => v ? parseFloat(v) / 100 : undefined
                        })}
                        classNames={{
                          input: "bg-[#0F0F0F] text-white",
                          label: "text-[#8A8D93]",
                        }}
                      />

                      <Input
                        type="number"
                        label="Watch Time (sec)"
                        placeholder="30"
                        {...currentForm.register('average_watch_time_seconds', { valueAsNumber: true })}
                        classNames={{
                          input: "bg-[#0F0F0F] text-white",
                          label: "text-[#8A8D93]",
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Submit Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-[#8A8D93]">
              {autoSave && 'Draft is automatically saved'}
            </div>
            <div className="flex gap-2">
              {savedData && (
                <Button
                  variant="flat"
                  color="danger"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('content-input-draft');
                    setSavedData(null);
                    currentForm.reset();
                  }}
                >
                  Clear Draft
                </Button>
              )}
              <Button
                type="submit"
                color="primary"
                isLoading={isSubmitting}
                startContent={<Save size={16} />}
              >
                {isSubmitting ? 'Saving...' : 'Save Content'}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default StreamlinedContentInput;