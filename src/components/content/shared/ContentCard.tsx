import React from 'react';
import { cn } from '@/lib/utils';
import PlatformIcon from './PlatformIcon';
import MetricDisplay from './MetricDisplay';

interface ContentItem {
  id: string;
  title: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  format: 'long_form' | 'short';
  published_at: string;
  account_handle?: string;
  views?: number;
  follows?: number;
  retention_ratio?: number;
  url?: string;
}

interface ContentCardProps {
  content: ContentItem;
  variant?: 'compact' | 'detailed';
  showMetrics?: boolean;
  className?: string;
  onClick?: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  variant = 'detailed',
  showMetrics = true,
  className = '',
  onClick
}) => {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'border border-[#333] bg-[#111] rounded-sm p-3 hover:border-[#444] transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Platform Icon & Meta */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <PlatformIcon platform={content.platform} size={isCompact ? 'sm' : 'md'} />
          <div className="text-xs text-[#8A8D93]">
            <div>{formatDate(content.published_at)}</div>
            {content.format === 'long_form' && (
              <div className="text-[10px] opacity-70">Long</div>
            )}
          </div>
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'font-medium text-white truncate',
            isCompact ? 'text-sm' : 'text-base'
          )}>
            {content.title}
          </div>

          {content.account_handle && (
            <div className="text-xs text-[#8A8D93] mt-1">
              {content.account_handle}
            </div>
          )}

          {/* Metrics */}
          {showMetrics && !isCompact && (
            <div className="grid grid-cols-3 gap-4 mt-3">
              <MetricDisplay
                label="Views"
                value={content.views}
                size="sm"
              />
              <MetricDisplay
                label="Follows"
                value={content.follows}
                size="sm"
              />
              <MetricDisplay
                label="Retention"
                value={content.retention_ratio}
                format="percentage"
                size="sm"
              />
            </div>
          )}

          {/* Compact Metrics */}
          {showMetrics && isCompact && (
            <div className="flex items-center gap-4 mt-2 text-xs text-[#8A8D93]">
              <span>{content.views?.toLocaleString() || '—'} views</span>
              <span>{content.follows || '—'} follows</span>
              {content.retention_ratio && (
                <span>{Math.round(content.retention_ratio * 100)}% retention</span>
              )}
            </div>
          )}
        </div>

        {/* External Link */}
        {content.url && (
          <div className="flex-shrink-0">
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8A8D93] hover:text-terminal-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCard;