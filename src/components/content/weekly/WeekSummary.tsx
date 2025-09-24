import React from 'react';
import { cn } from '@/lib/utils';
import MetricDisplay from '../shared/MetricDisplay';
import { WeeklyContentSummary } from '@/lib/storage';

interface WeekSummaryProps {
  currentWeek: WeeklyContentSummary;
  previousWeek?: WeeklyContentSummary;
  className?: string;
}

const WeekSummary: React.FC<WeekSummaryProps> = ({
  currentWeek,
  previousWeek,
  className = ''
}) => {
  const calculateTrend = (current: number, previous?: number): { trend: 'up' | 'down' | 'neutral'; value: number } => {
    if (!previous || previous === 0) return { trend: 'neutral', value: 0 };
    const diff = current - previous;
    const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
    return { trend, value: Math.abs(diff) };
  };

  const videosTrend = calculateTrend(currentWeek.videos_published, previousWeek?.videos_published);
  const viewsTrend = calculateTrend(currentWeek.total_views, previousWeek?.total_views);
  const followsTrend = calculateTrend(currentWeek.followers_gained, previousWeek?.followers_gained);

  const retentionTrend = currentWeek.avg_retention && previousWeek?.avg_retention
    ? calculateTrend(currentWeek.avg_retention, previousWeek.avg_retention)
    : { trend: 'neutral' as const, value: 0 };

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Videos Published"
          value={currentWeek.videos_published}
          trend={videosTrend.trend}
          trendValue={videosTrend.value}
        />
      </div>

      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Total Views"
          value={currentWeek.total_views}
          trend={viewsTrend.trend}
          trendValue={viewsTrend.value}
        />
      </div>

      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Followers Gained"
          value={currentWeek.followers_gained}
          trend={followsTrend.trend}
          trendValue={followsTrend.value}
        />
      </div>

      <div className="p-4 border border-[#333] bg-[#111] rounded-sm">
        <MetricDisplay
          label="Avg Retention"
          value={currentWeek.avg_retention}
          format="percentage"
          trend={retentionTrend.trend}
          trendValue={retentionTrend.value}
        />
      </div>
    </div>
  );
};

export default WeekSummary;