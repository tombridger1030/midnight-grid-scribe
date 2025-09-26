import React from 'react';
import { cn } from '@/lib/utils';
import { ContentListItem } from '@/lib/storage';
import { MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import PlatformIcon from './PlatformIcon';
import { formatNumber } from '@/lib/chartUtils';

type UnifiedContentItem =
  | (ContentListItem & { type: 'single' })
  | (MultiPlatformContentItem & { type: 'multi'; views?: number; follows?: number; platform: string });

interface UnifiedContentCardProps {
  content: UnifiedContentItem;
  variant?: 'compact' | 'detailed';
  showMetrics?: boolean;
  className?: string;
  onEdit?: (contentId: string) => void;
  onEditMultiPlatform?: (title: string, publishedAt: string) => void;
  showEditButton?: boolean;
}

const UnifiedContentCard: React.FC<UnifiedContentCardProps> = ({
  content,
  variant = 'detailed',
  showMetrics = true,
  className = '',
  onEdit,
  onEditMultiPlatform,
  showEditButton = false
}) => {
  const isCompact = variant === 'compact';

  const handleEditClick = () => {
    if (content.type === 'single') {
      onEdit?.(content.id);
    } else {
      onEditMultiPlatform?.(content.title, content.published_at);
    }
  };

  const getPlatformIcons = () => {
    if (content.type === 'single') {
      return (
        <div className="flex items-center gap-1">
          <PlatformIcon platform={content.platform} size="sm" />
          <span className="text-xs text-[#8A8D93] capitalize">{content.platform}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          {Object.keys(content.platforms).map(platform => (
            <div key={platform} className="flex items-center gap-1">
              <PlatformIcon platform={platform} size="sm" />
              <span className="text-xs text-[#8A8D93] capitalize">{platform}</span>
            </div>
          ))}
        </div>
      );
    }
  };

  const getMetrics = () => {
    if (content.type === 'single') {
      return {
        views: content.views || 0,
        follows: content.follows || 0,
        retention: content.retention_ratio || null
      };
    } else {
      // For multi-platform, aggregate metrics
      const platforms = Object.values(content.platforms);
      const totalViews = platforms.reduce((sum, p) => sum + (p.views || 0), 0);
      const totalFollows = platforms.reduce((sum, p) => sum + (p.follows || 0), 0);
      const retentions = platforms.map(p => p.retention_ratio).filter(Boolean) as number[];
      const avgRetention = retentions.length > 0 ? retentions.reduce((sum, r) => sum + r, 0) / retentions.length : null;

      return {
        views: totalViews,
        follows: totalFollows,
        retention: avgRetention || null
      };
    }
  };

  const metrics = getMetrics();

  return (
    <div className={cn(
      'border border-[#333] bg-[#111] rounded-sm p-3 hover:border-[#555] transition-colors relative',
      className
    )}>
      {/* Multi-platform badge */}
      {content.type === 'multi' && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 bg-terminal-accent/20 text-terminal-accent text-xs rounded-sm font-medium">
            Multi-Platform
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className={cn(
            'font-medium text-white truncate',
            isCompact ? 'text-sm' : 'text-base'
          )}>
            {content.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            {getPlatformIcons()}
          </div>
        </div>

        {showEditButton && (
          <button
            onClick={handleEditClick}
            className="p-1 text-[#8A8D93] hover:text-white transition-colors"
            title={content.type === 'multi' ? 'Edit multi-platform metrics' : 'Edit content'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {/* Date */}
      <div className="text-xs text-[#8A8D93] mb-3">
        {new Date(content.published_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>

      {/* Metrics */}
      {showMetrics && (
        <div className={cn(
          'grid gap-3',
          isCompact ? 'grid-cols-3' : 'grid-cols-3'
        )}>
          <div className="text-center">
            <div className={cn(
              'font-bold text-white',
              isCompact ? 'text-sm' : 'text-base'
            )}>
              {formatNumber(metrics.views)}
            </div>
            <div className="text-xs text-[#8A8D93]">Views</div>
          </div>

          <div className="text-center">
            <div className={cn(
              'font-bold text-white',
              isCompact ? 'text-sm' : 'text-base'
            )}>
              {formatNumber(metrics.follows)}
            </div>
            <div className="text-xs text-[#8A8D93]">Follows</div>
          </div>

          <div className="text-center">
            <div className={cn(
              'font-bold',
              isCompact ? 'text-sm' : 'text-base',
              metrics.retention !== null ? 'text-white' : 'text-[#8A8D93]'
            )}>
              {metrics.retention !== null ? `${metrics.retention.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-[#8A8D93]">Retention</div>
          </div>
        </div>
      )}

      {/* Platform breakdown for multi-platform content */}
      {content.type === 'multi' && !isCompact && (
        <div className="mt-3 pt-3 border-t border-[#333]">
          <div className="text-xs font-medium text-[#8A8D93] mb-2">Platform Performance</div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(content.platforms).map(([platform, data]) => (
              <div key={platform} className="flex items-center justify-between p-2 bg-[#0F0F0F] rounded-sm">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={platform} size="sm" />
                  <span className="text-xs text-white capitalize">{platform}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white">{formatNumber(data.views || 0)} views</span>
                  {data.retention_ratio && (
                    <span className="text-[#8A8D93]">{(data.retention_ratio * 100).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedContentCard;