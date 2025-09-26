import { ContentListItem } from './storage';

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  platform?: string;
}

export interface PieChartDataPoint {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export const PLATFORM_COLORS = {
  instagram: '#8B5CF6', // purple
  tiktok: '#EC4899',     // pink
  youtube: '#EF4444'     // red
} as const;

// Generate daily data points for the last N days
export function generateDailyData(items: ContentListItem[], days: number = 30): ChartDataPoint[] {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1);

  const dailyData: ChartDataPoint[] = [];

  // Create array of all days in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);

    // Find items published on this day
    const dayItems = items.filter(item => item.published_at === dateStr);
    const totalViews = dayItems.reduce((sum, item) => {
      const views = item.views || 0;
      return isFinite(views) && !isNaN(views) ? sum + views : sum;
    }, 0);

    // Only add valid data points
    if (isFinite(totalViews) && !isNaN(totalViews)) {
      dailyData.push({
        date: dateStr,
        value: totalViews,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
  }

  return dailyData;
}

// Generate weekly posting frequency data
export function generateWeeklyPostingData(items: ContentListItem[], weeks: number = 8): ChartDataPoint[] {
  const endDate = new Date();
  const weeklyData: ChartDataPoint[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(endDate);
    weekEnd.setDate(endDate.getDate() - (w * 7));

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Count posts in this week
    const weekItems = items.filter(item => {
      return item.published_at >= weekStartStr && item.published_at <= weekEndStr;
    });

    weeklyData.push({
      date: weekStartStr,
      value: weekItems.length,
      label: `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    });
  }

  return weeklyData;
}

// Generate retention rate trend data
export function generateRetentionTrendData(items: ContentListItem[], days: number = 14): ChartDataPoint[] {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1);

  const dailyData: ChartDataPoint[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);

    // Find items with retention data published on this day
    const dayItems = items.filter(item =>
      item.published_at === dateStr &&
      item.retention_ratio !== null &&
      item.retention_ratio !== undefined &&
      isFinite(item.retention_ratio) &&
      !isNaN(item.retention_ratio)
    );

    const avgRetention = dayItems.length > 0
      ? dayItems.reduce((sum, item) => {
          const retention = item.retention_ratio || 0;
          return isFinite(retention) && !isNaN(retention) ? sum + retention : sum;
        }, 0) / dayItems.length
      : 0;

    // Convert to percentage and validate
    const percentageValue = avgRetention * 100;
    if (isFinite(percentageValue) && !isNaN(percentageValue)) {
      dailyData.push({
        date: dateStr,
        value: percentageValue,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
  }

  return dailyData;
}

// Generate platform distribution pie chart data
export function generatePlatformDistributionData(items: ContentListItem[]): PieChartDataPoint[] {
  const platformTotals = items.reduce((acc, item) => {
    const platform = item.platform;
    if (!acc[platform]) {
      acc[platform] = { posts: 0, views: 0 };
    }
    acc[platform].posts++;
    acc[platform].views += item.views || 0;
    return acc;
  }, {} as Record<string, { posts: number; views: number }>);

  const totalViews = Object.values(platformTotals).reduce((sum, p) => sum + p.views, 0);

  return Object.entries(platformTotals).map(([platform, data]) => ({
    label: platform.charAt(0).toUpperCase() + platform.slice(1),
    value: data.views,
    color: PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#8A8D93',
    percentage: totalViews > 0 ? (data.views / totalViews) * 100 : 0
  }));
}

// Generate content format distribution data
export function generateFormatDistributionData(items: ContentListItem[]): PieChartDataPoint[] {
  const formatTotals = items.reduce((acc, item) => {
    const format = item.format === 'long_form' ? 'Long Form' : 'Short Form';
    if (!acc[format]) {
      acc[format] = { posts: 0, views: 0 };
    }
    acc[format].posts++;
    acc[format].views += item.views || 0;
    return acc;
  }, {} as Record<string, { posts: number; views: number }>);

  const totalViews = Object.values(formatTotals).reduce((sum, f) => sum + f.views, 0);

  return Object.entries(formatTotals).map(([format, data]) => ({
    label: format,
    value: data.views,
    color: format === 'Long Form' ? '#3B82F6' : '#10B981',
    percentage: totalViews > 0 ? (data.views / totalViews) * 100 : 0
  }));
}

// Calculate trend direction and percentage change
export function calculateTrend(current: number, previous: number): {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
} {
  if (previous === 0 || !isFinite(previous)) {
    return { direction: 'neutral', percentage: 0 };
  }

  const change = ((current - previous) / previous) * 100;

  return {
    direction: change > 2 ? 'up' : change < -2 ? 'down' : 'neutral',
    percentage: Math.abs(change)
  };
}

// Format numbers for display
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Generate smooth curve path for line charts
export function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (i === 1) {
      // First curve
      const cp1x = prev.x + (curr.x - prev.x) * 0.3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    } else if (i === points.length - 1) {
      // Last curve
      const cp1x = prev.x + (curr.x - prev.x) * 0.3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    } else {
      // Middle curves with smoothing
      const prevCurr = { x: curr.x - prev.x, y: curr.y - prev.y };
      const currNext = { x: next.x - curr.x, y: next.y - curr.y };

      const cp1x = prev.x + prevCurr.x * 0.3;
      const cp1y = prev.y + prevCurr.y * 0.3;
      const cp2x = curr.x - currNext.x * 0.3;
      const cp2y = curr.y - currNext.y * 0.3;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
  }

  return path;
}