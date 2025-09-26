import React, { useMemo } from 'react';
import LineChart from '@/components/content/charts/LineChart';
import TrendIndicator from '@/components/content/charts/TrendIndicator';
import { ContentListItem } from '@/lib/storage';
import { MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { getWeekDayDates, formatWeekKey } from '@/lib/weeklyKpi';
import { formatNumber, calculateTrend } from '@/lib/chartUtils';

interface WeeklyComparisonChartsProps {
  currentWeek: string;
  allContent: ContentListItem[];
  multiPlatformContent: MultiPlatformContentItem[];
}

interface WeeklyMetrics {
  weekKey: string;
  weekLabel: string;
  totalViews: number;
  totalFollowers: number;
  youtubeViews: number;
  instagramReach: number;
  tiktokViews: number;
  totalWatchTime: number;
  postsCount: number;
  avgRetention: number;
}

const WeeklyComparisonCharts: React.FC<WeeklyComparisonChartsProps> = ({
  currentWeek,
  allContent,
  multiPlatformContent
}) => {
  // Calculate metrics for the last 8 weeks
  const weeklyData = useMemo(() => {
    const weeks: WeeklyMetrics[] = [];
    
    // Generate the last 8 weeks including current week
    for (let i = 7; i >= 0; i--) {
      const [year, weekNum] = currentWeek.split('-W').map(Number);
      let targetWeek = weekNum - i;
      let targetYear = year;
      
      if (targetWeek <= 0) {
        targetWeek = 52 + targetWeek;
        targetYear -= 1;
      }
      
      const weekKey = `${targetYear}-W${targetWeek.toString().padStart(2, '0')}`;
      const weekDates = getWeekDayDates(weekKey);
      const weekStart = weekDates[0].toISOString().split('T')[0];
      const weekEnd = weekDates[6].toISOString().split('T')[0];
      
      // Get content for this week
      const weekContent = [
        ...allContent.filter(item =>
          item.published_at >= weekStart && item.published_at <= weekEnd
        ),
        ...multiPlatformContent
          .filter(item => item.published_at >= weekStart && item.published_at <= weekEnd)
          .flatMap(item =>
            Object.entries(item.platforms).map(([platform, data]) => ({
              id: `${item.id}-${platform}`,
              platform,
              format: item.format,
              title: item.title,
              published_at: item.published_at,
              views: data.views,
              follows: data.follows,
              retention_ratio: data.retention_ratio,
              reach: data.reach,
              total_watch_time_minutes: data.total_watch_time_minutes,
              average_watch_time_seconds: data.average_watch_time_seconds,
              ...data
            }))
          )
      ];
      
      // Calculate metrics
      const totalViews = weekContent.reduce((sum, item) => sum + (item.views || 0), 0);
      const totalFollowers = weekContent.reduce((sum, item) => sum + (item.follows || 0), 0);
      
      const youtubeContent = weekContent.filter(item => item.platform === 'youtube');
      const youtubeViews = youtubeContent.reduce((sum, item) => sum + (item.views || 0), 0);
      
      const instagramContent = weekContent.filter(item => item.platform === 'instagram');
      const instagramReach = instagramContent.reduce((sum, item) => sum + (item.reach || 0), 0);
      
      const tiktokContent = weekContent.filter(item => item.platform === 'tiktok');
      const tiktokViews = tiktokContent.reduce((sum, item) => sum + (item.views || 0), 0);
      
      // Calculate total watch time
      const totalWatchTime = weekContent.reduce((sum, item) => {
        if (item.total_watch_time_minutes) {
          return sum + item.total_watch_time_minutes;
        }
        if (item.average_watch_time_seconds && item.views) {
          return sum + (item.average_watch_time_seconds * item.views / 60);
        }
        return sum;
      }, 0);
      
      // Calculate average retention
      const contentWithRetention = weekContent.filter(item => 
        item.retention_ratio !== null && 
        item.retention_ratio !== undefined && 
        !isNaN(item.retention_ratio)
      );
      const avgRetention = contentWithRetention.length > 0
        ? contentWithRetention.reduce((sum, item) => sum + (item.retention_ratio || 0), 0) / contentWithRetention.length
        : 0;
      
      weeks.push({
        weekKey,
        weekLabel: formatWeekKey(weekKey),
        totalViews,
        totalFollowers,
        youtubeViews,
        instagramReach,
        tiktokViews,
        totalWatchTime,
        postsCount: weekContent.length,
        avgRetention: avgRetention * 100 // Convert to percentage
      });
    }
    
    return weeks;
  }, [currentWeek, allContent, multiPlatformContent]);

  // Prepare chart data
  const chartData = {
    totalViews: weeklyData.map(week => ({
      date: week.weekKey,
      value: week.totalViews,
      label: week.weekLabel.split(' ')[1] // Just week number
    })),
    totalFollowers: weeklyData.map(week => ({
      date: week.weekKey,
      value: week.totalFollowers,
      label: week.weekLabel.split(' ')[1]
    })),
    platformViews: weeklyData.map(week => ({
      date: week.weekKey,
      youtube: week.youtubeViews,
      instagram: week.instagramReach,
      tiktok: week.tiktokViews,
      label: week.weekLabel.split(' ')[1]
    })),
    watchTime: weeklyData.map(week => ({
      date: week.weekKey,
      value: Math.round(week.totalWatchTime),
      label: week.weekLabel.split(' ')[1]
    })),
    retention: weeklyData.map(week => ({
      date: week.weekKey,
      value: week.avgRetention,
      label: week.weekLabel.split(' ')[1]
    })),
    postsCount: weeklyData.map(week => ({
      date: week.weekKey,
      value: week.postsCount,
      label: week.weekLabel.split(' ')[1]
    }))
  };

  // Calculate trends (current week vs previous week)
  const currentWeekData = weeklyData[weeklyData.length - 1];
  const previousWeekData = weeklyData[weeklyData.length - 2];
  
  const trends = {
    totalViews: calculateTrend(currentWeekData?.totalViews || 0, previousWeekData?.totalViews || 0),
    totalFollowers: calculateTrend(currentWeekData?.totalFollowers || 0, previousWeekData?.totalFollowers || 0),
    watchTime: calculateTrend(currentWeekData?.totalWatchTime || 0, previousWeekData?.totalWatchTime || 0),
    retention: calculateTrend(currentWeekData?.avgRetention || 0, previousWeekData?.avgRetention || 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">8-Week Performance Trends</h3>
        <div className="text-xs text-[#8A8D93]">
          Comparing {formatWeekKey(currentWeek)} to previous weeks
        </div>
      </div>

      {/* Key Metrics Summary with Trends */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#333] bg-[#111] rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A8D93]">Total Views</span>
            <TrendIndicator
              direction={trends.totalViews.direction}
              percentage={trends.totalViews.percentage}
              size="sm"
            />
          </div>
          <div className="text-lg font-bold text-white">
            {formatNumber(currentWeekData?.totalViews || 0)}
          </div>
        </div>

        <div className="border border-[#333] bg-[#111] rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A8D93]">New Followers</span>
            <TrendIndicator
              direction={trends.totalFollowers.direction}
              percentage={trends.totalFollowers.percentage}
              size="sm"
            />
          </div>
          <div className="text-lg font-bold text-white">
            +{formatNumber(currentWeekData?.totalFollowers || 0)}
          </div>
        </div>

        <div className="border border-[#333] bg-[#111] rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A8D93]">Watch Time</span>
            <TrendIndicator
              direction={trends.watchTime.direction}
              percentage={trends.watchTime.percentage}
              size="sm"
            />
          </div>
          <div className="text-lg font-bold text-white">
            {Math.round(currentWeekData?.totalWatchTime || 0)}m
          </div>
        </div>

        <div className="border border-[#333] bg-[#111] rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A8D93]">Avg Retention</span>
            <TrendIndicator
              direction={trends.retention.direction}
              percentage={trends.retention.percentage}
              size="sm"
            />
          </div>
          <div className="text-lg font-bold text-white">
            {(currentWeekData?.avgRetention || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Views Trend */}
        <div className="border border-[#333] bg-[#111] rounded-sm p-4">
          <h4 className="text-sm font-medium text-white mb-3">Total Views Trend</h4>
          <LineChart
            data={chartData.totalViews}
            color="#5FE3B3"
            height={160}
            showGrid={true}
            showDots={true}
          />
        </div>

        {/* Followers Growth */}
        <div className="border border-[#333] bg-[#111] rounded-sm p-4">
          <h4 className="text-sm font-medium text-white mb-3">New Followers Trend</h4>
          <LineChart
            data={chartData.totalFollowers}
            color="#8B5CF6"
            height={160}
            showGrid={true}
            showDots={true}
          />
        </div>

        {/* Watch Time Trend */}
        <div className="border border-[#333] bg-[#111] rounded-sm p-4">
          <h4 className="text-sm font-medium text-white mb-3">Watch Time (Minutes)</h4>
          <LineChart
            data={chartData.watchTime}
            color="#EF4444"
            height={160}
            showGrid={true}
            showDots={true}
          />
        </div>

        {/* Content Volume */}
        <div className="border border-[#333] bg-[#111] rounded-sm p-4">
          <h4 className="text-sm font-medium text-white mb-3">Posts Per Week</h4>
          <LineChart
            data={chartData.postsCount}
            color="#FFD700"
            height={160}
            showGrid={true}
            showDots={true}
          />
        </div>
      </div>

      {/* Platform Comparison */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <h4 className="text-sm font-medium text-white mb-3">Platform Performance (Views/Reach)</h4>
        <div className="h-48">
          <LineChart
            data={chartData.platformViews.map(week => ({
              date: week.date,
              value: week.youtube,
              label: week.label
            }))}
            color="#EF4444"
            height={192}
            showGrid={true}
            showDots={true}
            additionalLines={[
              {
                data: chartData.platformViews.map(week => ({
                  date: week.date,
                  value: week.instagram,
                  label: week.label
                })),
                color: '#8B5CF6'
              },
              {
                data: chartData.platformViews.map(week => ({
                  date: week.date,
                  value: week.tiktok,
                  label: week.label
                })),
                color: '#EC4899'
              }
            ]}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
            <span className="text-[#8A8D93]">YouTube</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
            <span className="text-[#8A8D93]">Instagram</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#EC4899]"></div>
            <span className="text-[#8A8D93]">TikTok</span>
          </div>
        </div>
      </div>

      {/* Retention Trend */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <h4 className="text-sm font-medium text-white mb-3">Average Retention Rate</h4>
        <LineChart
          data={chartData.retention}
          color="#5FE3B3"
          height={160}
          showGrid={true}
          showDots={true}
        />
      </div>
    </div>
  );
};

export default WeeklyComparisonCharts;
