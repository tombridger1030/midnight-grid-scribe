import React, { useState, useEffect, useMemo } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import { loadMultiPlatformContent, MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { getCurrentWeek, formatWeekKey, getWeekDayDates } from '@/lib/weeklyKpi';
import { ChevronLeft, ChevronRight, Edit2, Save, X, Eye, EyeOff, AlertCircle, TrendingUp } from 'lucide-react';
import PlatformIcon from '../shared/PlatformIcon';
import { formatNumber } from '@/lib/chartUtils';
import WeeklyComparisonCharts from './WeeklyComparisonCharts';
import { Card, CardBody, CardHeader, Input, Switch, Button, Chip, Divider, Textarea } from '@heroui/react';
import { Card as TremorCard, Title, Text, LineChart, BarChart } from '@tremor/react';

interface WeeklyMetricsOverride {
  weekKey: string;
  platform: string;
  metric: string;
  value: number;
  isManual: boolean;
}

interface PlatformWeeklyData {
  [platform: string]: {
    [metric: string]: {
      calculated: number;
      manual?: number;
      isManual: boolean;
    };
  };
}

const EnhancedWeeklyReview: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [multiPlatformContent, setMultiPlatformContent] = useState<MultiPlatformContentItem[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<WeeklyMetricsOverride[]>([]);
  const [showCalculated, setShowCalculated] = useState<{ [key: string]: boolean }>({});

  // Load content data for weekly analysis
  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const [singlePlatformData, multiPlatformData] = await Promise.all([
        loadRecentContent(100),
        loadMultiPlatformContent(50)
      ]);

      setAllContent(singlePlatformData);
      setMultiPlatformContent(multiPlatformData);
    } catch (e) {
      console.error('Failed to load content:', e);
      setError(e instanceof Error ? e.message : 'Failed to load content for weekly analysis');
    } finally {
      setLoading(false);
    }
  };

  // Load saved overrides
  const loadOverrides = async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('weekly-metrics-overrides');
        if (saved) {
          setOverrides(JSON.parse(saved));
        }
      }
    } catch (error) {
      console.error('Failed to load overrides:', error);
    }
  };

  useEffect(() => {
    loadContent();
    loadOverrides();
  }, []);

  // Navigate between weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const [year, week] = currentWeek.split('-W').map(Number);
    let newWeek = week + (direction === 'next' ? 1 : -1);
    let newYear = year;

    if (newWeek > 52) {
      newWeek = 1;
      newYear += 1;
    } else if (newWeek < 1) {
      newWeek = 52;
      newYear -= 1;
    }

    setCurrentWeek(`${newYear}-W${newWeek.toString().padStart(2, '0')}`);
    setEditingPlatform(null);
  };

  // Calculate weekly metrics
  const weeklyMetrics = useMemo(() => {
    const weekDates = getWeekDayDates(currentWeek);
    const weekStart = weekDates[0].toISOString().split('T')[0];
    const weekEnd = weekDates[6].toISOString().split('T')[0];

    // Flatten all content for this week
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
            likes: data.likes,
            shares: data.shares,
            comments: data.comments,
            reach: data.reach,
            subscribers: data.subscribers,
            total_watch_time_minutes: data.total_watch_time_minutes,
            average_watch_time_seconds: data.average_watch_time_seconds,
            swipe_rate: data.swipe_rate,
            new_viewers_percent: data.new_viewers_percent,
            ...data
          }))
        )
    ];

    // Platform-specific calculations
    const platforms = ['youtube', 'instagram', 'tiktok'];
    const metrics: PlatformWeeklyData = {};

    platforms.forEach(platform => {
      const platformContent = weekContent.filter(item => item.platform === platform);

      // Calculate metrics
      const calculated = {
        views: platformContent.reduce((sum, item) => sum + (item.views || 0), 0),
        follows: platformContent.reduce((sum, item) => sum + (item.follows || 0), 0),
        likes: platformContent.reduce((sum, item) => sum + (item.likes || 0), 0),
        shares: platformContent.reduce((sum, item) => sum + (item.shares || 0), 0),
        comments: platformContent.reduce((sum, item) => sum + (item.comments || 0), 0),
        retention: platformContent.length > 0
          ? platformContent.reduce((sum, item) => sum + (item.retention_ratio || 0), 0) / platformContent.length
          : 0,
        watchTime: platformContent.reduce((sum, item) => {
          if (item.total_watch_time_minutes) return sum + item.total_watch_time_minutes;
          if (item.average_watch_time_seconds && item.views) {
            return sum + (item.average_watch_time_seconds * item.views / 60);
          }
          return sum;
        }, 0),
        reach: platformContent.reduce((sum, item) => sum + ((item as any).reach || 0), 0),
        subscribers: platformContent.reduce((sum, item) => sum + (item.subscribers || 0), 0),
        swipeRate: platformContent.length > 0
          ? platformContent.reduce((sum, item) => sum + (item.swipe_rate || 0), 0) / platformContent.length
          : 0,
        newViewers: platformContent.length > 0
          ? platformContent.reduce((sum, item) => sum + (item.new_viewers_percent || 0), 0) / platformContent.length
          : 0,
      };

      // Initialize with calculated values
      metrics[platform] = Object.keys(calculated).reduce((acc, metric) => {
        const override = overrides.find(o =>
          o.weekKey === currentWeek &&
          o.platform === platform &&
          o.metric === metric
        );

        acc[metric] = {
          calculated: calculated[metric as keyof typeof calculated] as number,
          manual: override?.value,
          isManual: override?.isManual || false
        };

        return acc;
      }, {} as PlatformWeeklyData[string]);
    });

    // Posting schedule
    const postingSchedule = weekDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayPosts = [
        ...allContent.filter(item => item.published_at === dateStr),
        ...multiPlatformContent.filter(item => item.published_at === dateStr)
      ];
      return {
        date: date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        posts: dayPosts.length
      };
    });

    return { metrics, postingSchedule, weekContent };
  }, [currentWeek, allContent, multiPlatformContent, overrides]);

  // Toggle manual override for a metric
  const toggleManualOverride = (platform: string, metric: string, isManual: boolean) => {
    const newOverrides = overrides.filter(o =>
      !(o.weekKey === currentWeek && o.platform === platform && o.metric === metric)
    );

    if (isManual) {
      const currentMetric = weeklyMetrics.metrics[platform]?.[metric];
      if (currentMetric) {
        newOverrides.push({
          weekKey: currentWeek,
          platform,
          metric,
          value: currentMetric.manual || currentMetric.calculated,
          isManual: true
        });
      }
    }

    setOverrides(newOverrides);
    saveOverrides(newOverrides);
  };

  // Update manual value
  const updateManualValue = (platform: string, metric: string, value: number) => {
    const newOverrides = overrides.filter(o =>
      !(o.weekKey === currentWeek && o.platform === platform && o.metric === metric)
    );

    newOverrides.push({
      weekKey: currentWeek,
      platform,
      metric,
      value,
      isManual: true
    });

    setOverrides(newOverrides);
    saveOverrides(newOverrides);
  };

  // Save overrides to localStorage
  const saveOverrides = (newOverrides: WeeklyMetricsOverride[]) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('weekly-metrics-overrides', JSON.stringify(newOverrides));
      }
    } catch (error) {
      console.error('Failed to save overrides:', error);
    }
  };

  // Get display value for a metric
  const getDisplayValue = (platform: string, metric: string) => {
    const platformMetrics = weeklyMetrics.metrics[platform]?.[metric];
    if (!platformMetrics) return 0;
    return platformMetrics.isManual ? (platformMetrics.manual || 0) : platformMetrics.calculated;
  };

  // Platform-specific metric configurations
  const platformMetricConfigs = {
    youtube: {
      icon: 'youtube',
      label: 'YouTube',
      metrics: [
        { key: 'views', label: 'Views', format: 'number' },
        { key: 'subscribers', label: 'Subscribers', format: 'number' },
        { key: 'watchTime', label: 'Watch Time', format: 'minutes' },
        { key: 'retention', label: 'Retention', format: 'percentage' },
        { key: 'likes', label: 'Likes', format: 'number' },
        { key: 'comments', label: 'Comments', format: 'number' },
      ]
    },
    instagram: {
      icon: 'instagram',
      label: 'Instagram',
      metrics: [
        { key: 'reach', label: 'Reach', format: 'number' },
        { key: 'views', label: 'Views', format: 'number' },
        { key: 'likes', label: 'Likes', format: 'number' },
        { key: 'comments', label: 'Comments', format: 'number' },
        { key: 'shares', label: 'Shares', format: 'number' },
        { key: 'follows', label: 'Followers', format: 'number' },
      ]
    },
    tiktok: {
      icon: 'tiktok',
      label: 'TikTok',
      metrics: [
        { key: 'views', label: 'Views', format: 'number' },
        { key: 'likes', label: 'Likes', format: 'number' },
        { key: 'comments', label: 'Comments', format: 'number' },
        { key: 'shares', label: 'Shares', format: 'number' },
        { key: 'follows', label: 'Followers', format: 'number' },
        { key: 'retention', label: 'Retention', format: 'percentage' },
      ]
    }
  };

  // Format value based on type
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'minutes':
        return `${Math.round(value)}m`;
      default:
        return formatNumber(value);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-16 bg-[#111] rounded-sm mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-[#111] rounded-sm"></div>
            ))}
          </div>
          <div className="h-24 bg-[#111] rounded-sm"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-sm">
          <div className="text-red-400 text-sm">Error loading weekly analysis</div>
          <div className="text-red-300 text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  // Calculate total views
  const totalViews = Object.keys(weeklyMetrics.metrics).reduce((sum, platform) => {
    return sum + getDisplayValue(platform, 'views');
  }, 0);

  return (
    <div className="space-y-6">
      {/* Week Navigation Header */}
      <Card className="bg-[#111] border-[#333]">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <Button
              isIconOnly
              variant="flat"
              color="default"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft size={16} />
            </Button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-white cyberpunk-header">{formatWeekKey(currentWeek)}</h2>
              <div className="text-sm text-[#8A8D93]">Weekly Performance Review</div>
            </div>

            <Button
              isIconOnly
              variant="flat"
              color="default"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Total Views Summary */}
      <TremorCard className="bg-[#111] border-[#333]">
        <div className="text-center p-6">
          <Title className="text-terminal-accent text-3xl font-bold">
            {formatNumber(totalViews)}
          </Title>
          <Text className="text-[#8A8D93]">Total Views This Week</Text>
        </div>
      </TremorCard>

      {/* Platform Metrics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(platformMetricConfigs).map(([platformKey, config]) => (
          <Card key={platformKey} className="bg-[#111] border-[#333]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={platformKey as any} size="md" />
                  <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant={editingPlatform === platformKey ? "solid" : "flat"}
                  color={editingPlatform === platformKey ? "primary" : "default"}
                  onClick={() => setEditingPlatform(editingPlatform === platformKey ? null : platformKey)}
                >
                  <Edit2 size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {config.metrics.map((metric) => {
                const platformMetrics = weeklyMetrics.metrics[platformKey]?.[metric.key];
                const isManual = platformMetrics?.isManual || false;
                const calculatedValue = platformMetrics?.calculated || 0;
                const displayValue = getDisplayValue(platformKey, metric.key);

                return (
                  <div key={metric.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#8A8D93]">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        {isManual && (
                          <Chip size="sm" color="primary" variant="flat">
                            Manual
                          </Chip>
                        )}
                        <span className="text-white font-medium">
                          {formatValue(displayValue, metric.format)}
                        </span>
                      </div>
                    </div>

                    {editingPlatform === platformKey && (
                      <div className="space-y-2 p-3 bg-[#0F0F0F] rounded-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              size="sm"
                              isSelected={isManual}
                              onValueChange={(selected) => toggleManualOverride(platformKey, metric.key, selected)}
                            />
                            <span className="text-xs text-[#8A8D93]">
                              {isManual ? 'Manual Input' : 'Auto-calculated'}
                            </span>
                          </div>
                          {!isManual && (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              color="default"
                              onClick={() => setShowCalculated({
                                ...showCalculated,
                                [`${platformKey}-${metric.key}`]: !showCalculated[`${platformKey}-${metric.key}`]
                              })}
                            >
                              {showCalculated[`${platformKey}-${metric.key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </Button>
                          )}
                        </div>

                        {isManual && (
                          <Input
                            type="number"
                            size="sm"
                            label={`Enter ${metric.label}`}
                            value={displayValue.toString()}
                            onChange={(e) => updateManualValue(platformKey, metric.key, parseFloat(e.target.value) || 0)}
                            classNames={{
                              input: "bg-[#111] text-white",
                              label: "text-[#8A8D93]",
                            }}
                          />
                        )}

                        {!isManual && showCalculated[`${platformKey}-${metric.key}`] && (
                          <div className="text-xs text-[#8A8D93] p-2 bg-[#111] rounded-sm">
                            Calculated from content: {formatValue(calculatedValue, metric.format)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Posting Schedule */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Posting Schedule</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-7 gap-2">
            {weeklyMetrics.postingSchedule.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-[#8A8D93] mb-1">{day.dayName}</div>
                <div className={`w-full h-8 rounded-sm flex items-center justify-center text-sm font-medium ${
                  day.posts > 0
                    ? 'bg-terminal-accent text-black'
                    : 'bg-[#0F0F0F] border border-[#333] text-[#8A8D93]'
                }`}>
                  {day.posts || '—'}
                </div>
                <div className="text-xs text-[#8A8D93] mt-1">
                  {day.date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Weekly Comparison Charts */}
      <WeeklyComparisonCharts
        currentWeek={currentWeek}
        allContent={allContent}
        multiPlatformContent={multiPlatformContent}
      />

      {/* Performance Trends with Tremor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TremorCard className="bg-[#111] border-[#333]">
          <div className="p-4">
            <Title className="text-white mb-4">Platform Performance</Title>
            <BarChart
              data={Object.entries(platformMetricConfigs).map(([platformKey, config]) => ({
                platform: config.label,
                views: getDisplayValue(platformKey, 'views'),
              }))}
              index="platform"
              categories={["views"]}
              colors={["#5FE3B3"]}
              valueFormatter={(value) => formatNumber(value as number)}
            />
          </div>
        </TremorCard>

        <TremorCard className="bg-[#111] border-[#333]">
          <div className="p-4">
            <Title className="text-white mb-4">Growth Metrics</Title>
            <BarChart
              data={Object.entries(platformMetricConfigs).map(([platformKey, config]) => ({
                platform: config.label,
                followers: getDisplayValue(platformKey, 'follows'),
              }))}
              index="platform"
              categories={["followers"]}
              colors={["#8B5CF6"]}
              valueFormatter={(value) => `+${formatNumber(value as number)}`}
            />
          </div>
        </TremorCard>
      </div>

      {/* Info Box */}
      {editingPlatform && (
        <Card className="bg-[#111] border-[#333]">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-terminal-accent mt-1" size={16} />
              <div className="text-sm text-[#8A8D93]">
                <p className="font-medium text-white mb-1">Manual Override Mode</p>
                <p>Toggle the switch for any metric to override the automatic calculation with your own values. This is useful for:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Adding data from platforms not automatically tracked</li>
                  <li>Correcting calculation errors</li>
                  <li>Including historical data that wasn't captured</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {totalViews === 0 && (
        <Card className="bg-[#111] border-[#333]">
          <CardBody className="text-center py-12">
            <div className="text-lg mb-2 text-[#8A8D93]">📊 No Content This Week</div>
            <div className="text-sm mb-4 text-[#8A8D93]">No content posted during {formatWeekKey(currentWeek)}</div>
            <div className="text-xs opacity-70 text-[#8A8D93]">
              Navigate to other weeks or add content through the input page
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default EnhancedWeeklyReview;