import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { saveContentItemWithMetrics } from '@/lib/storage';
import PlatformIcon from '../shared/PlatformIcon';

type QuickContentForm = {
  platform: 'youtube' | 'tiktok' | 'instagram';
  title: string;
  published_at: string;
  views?: number;
  follows?: number;
};

interface QuickEntryProps {
  onComplete?: () => void;
  className?: string;
}

const QuickEntry: React.FC<QuickEntryProps> = ({ onComplete, className = '' }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuickContentForm>({
    defaultValues: {
      platform: 'tiktok',
      published_at: new Date().toISOString().slice(0, 10)
    }
  });

  const onSubmit = async (data: QuickContentForm) => {
    setIsSubmitting(true);
    try {
      await saveContentItemWithMetrics(
        {
          platform: data.platform,
          format: data.platform === 'youtube' ? 'long_form' : 'short',
          account_handle: '',
          title: data.title,
          published_at: data.published_at
        },
        {
          views: data.views,
          follows: data.follows
        }
      );
      reset();
      onComplete?.();
    } catch (error) {
      console.error('Failed to save content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('border border-[#333] bg-[#111] rounded-sm p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">⚡</span>
        <h3 className="text-sm font-medium text-white">Quick Entry</h3>
        <div className="text-xs text-[#8A8D93]">For rapid data entry</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Platform Selection */}
        <div className="flex gap-2">
          {['youtube', 'tiktok', 'instagram'].map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-2 p-2 border border-[#333] rounded-sm hover:border-[#444] cursor-pointer transition-colors"
            >
              <PlatformIcon platform={platform as any} size="sm" />
              <span className="text-xs capitalize">{platform}</span>
              <input
                type="radio"
                value={platform}
                className="ml-auto"
                {...register('platform')}
              />
            </label>
          ))}
        </div>

        {/* Quick Fields */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <input
              className="w-full bg-[#0F0F0F] border border-[#333] p-2 rounded-sm text-white placeholder-[#666] text-sm"
              placeholder="Video title *"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <div className="text-red-400 text-xs mt-1">{errors.title.message}</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="date"
              className="bg-[#0F0F0F] border border-[#333] p-2 rounded-sm text-white text-xs"
              {...register('published_at')}
            />
            <input
              type="number"
              min="0"
              placeholder="Views"
              className="bg-[#0F0F0F] border border-[#333] p-2 rounded-sm text-white placeholder-[#666] text-xs"
              {...register('views', { valueAsNumber: true })}
            />
            <input
              type="number"
              min="0"
              placeholder="Follows"
              className="bg-[#0F0F0F] border border-[#333] p-2 rounded-sm text-white placeholder-[#666] text-xs"
              {...register('follows', { valueAsNumber: true })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-3 py-2 bg-terminal-accent text-black rounded-sm hover:bg-terminal-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isSubmitting ? 'Saving...' : 'Add Content'}
        </button>
      </form>
    </div>
  );
};

export default QuickEntry;