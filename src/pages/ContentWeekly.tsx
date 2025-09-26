import React, { useEffect, useState, useMemo } from 'react';
import { loadRecentContent, ContentListItem } from '@/lib/storage';
import { loadMultiPlatformContent, MultiPlatformContentItem } from '@/lib/multiPlatformStorage';
import { getCurrentWeek, formatWeekKey, getWeekDayDates } from '@/lib/weeklyKpi';
import { ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import PlatformIcon from '@/components/content/shared/PlatformIcon';
import { formatNumber } from '@/lib/chartUtils';
import WeeklyComparisonCharts from '@/components/content/weekly/WeeklyComparisonCharts';

// Instagram Weekly Card Component with editing capability
interface InstagramWeeklyCardProps {
  weekKey: string;
  totalReach: number;
  profileVisits: number;
  followers: number;
  onUpdate: () => void;
}

const InstagramWeeklyCard: React.FC<InstagramWeeklyCardProps> = ({
  weekKey,
  totalReach,
  profileVisits,
  followers,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    totalReach,
    profileVisits,
    followers
  });
  const [isSaving, setIsSaving] = useState(false);

  // Update edit values when props change
  useEffect(() => {
    setEditValues({ totalReach, profileVisits, followers });
  }, [totalReach, profileVisits, followers]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Store Instagram weekly metrics in localStorage for now
      // This could be moved to a database table later
      if (typeof window !== 'undefined' && window.localStorage) {
        const weeklyInstagramData = JSON.parse(localStorage.getItem('weeklyInstagramMetrics') || '{}');
        weeklyInstagramData[weekKey] = editValues;
        localStorage.setItem('weeklyInstagramMetrics', JSON.stringify(weeklyInstagramData));
      }

      setIsEditing(false);
      onUpdate(); // Trigger refresh
    } catch (error) {
      console.error('Error saving Instagram metrics:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValues({ totalReach, profileVisits, followers });
    setIsEditing(false);
  };

  // Load any saved weekly metrics
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const weeklyInstagramData = JSON.parse(localStorage.getItem('weeklyInstagramMetrics') || '{}');
        const savedData = weeklyInstagramData[weekKey];
        if (savedData) {
          setEditValues({
            totalReach: savedData.totalReach || totalReach,
            profileVisits: savedData.profileVisits || profileVisits,
            followers: savedData.followers || followers
          });
        }
      }
    } catch (error) {
      console.error('Error loading weekly Instagram metrics:', error);
    }
  }, [weekKey, totalReach, profileVisits, followers]);

  const displayValues = {
    totalReach: (() => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const weeklyData = JSON.parse(localStorage.getItem('weeklyInstagramMetrics') || '{}');
          return weeklyData[weekKey]?.totalReach || totalReach;
        }
        return totalReach;
      } catch (error) {
        console.error('Error reading Instagram metrics:', error);
        return totalReach;
      }
    })(),
    profileVisits: (() => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const weeklyData = JSON.parse(localStorage.getItem('weeklyInstagramMetrics') || '{}');
          return weeklyData[weekKey]?.profileVisits || profileVisits;
        }
        return profileVisits;
      } catch (error) {
        console.error('Error reading Instagram metrics:', error);
        return profileVisits;
      }
    })(),
    followers: (() => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const weeklyData = JSON.parse(localStorage.getItem('weeklyInstagramMetrics') || '{}');
          return weeklyData[weekKey]?.followers || followers;
        }
        return followers;
      } catch (error) {
        console.error('Error reading Instagram metrics:', error);
        return followers;
      }
    })()
  };

  return (
    <div className="border border-[#333] bg-[#111] rounded-sm p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <PlatformIcon platform="instagram" size="md" />
          <h3 className="text-white font-medium">Instagram</h3>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-[#8A8D93] hover:text-white transition-colors"
          title="Edit Instagram metrics"
        >
          <Edit2 size={14} />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-[#8A8D93]">Total Reach</label>
            <input
              type="number"
              value={editValues.totalReach}
              onChange={(e) => setEditValues(prev => ({ ...prev, totalReach: Number(e.target.value) || 0 }))}
              className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-2 text-white text-sm focus:border-terminal-accent focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[#8A8D93]">Profile Visits</label>
            <input
              type="number"
              value={editValues.profileVisits}
              onChange={(e) => setEditValues(prev => ({ ...prev, profileVisits: Number(e.target.value) || 0 }))}
              className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-2 text-white text-sm focus:border-terminal-accent focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[#8A8D93]">Followers</label>
            <input
              type="number"
              value={editValues.followers}
              onChange={(e) => setEditValues(prev => ({ ...prev, followers: Number(e.target.value) || 0 }))}
              className="w-full bg-[#0F0F0F] border border-[#333] rounded-sm p-2 text-white text-sm focus:border-terminal-accent focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs text-[#8A8D93] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 text-xs bg-terminal-accent text-black rounded-sm hover:bg-terminal-accent/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#8A8D93]">Total Reach</span>
            <span className="text-white font-medium">
              {formatNumber(displayValues.totalReach)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#8A8D93]">Profile Visits</span>
            <span className="text-white font-medium">
              {formatNumber(displayValues.profileVisits)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#8A8D93]">Followers</span>
            <span className="text-white font-medium">
              +{formatNumber(displayValues.followers)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const ContentWeekly: React.FC = () => {
  const [allContent, setAllContent] = useState<ContentListItem[]>([]);
  const [multiPlatformContent, setMultiPlatformContent] = useState<MultiPlatformContentItem[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load content data for weekly analysis
  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load both single-platform and multi-platform content
      const [singlePlatformData, multiPlatformData] = await Promise.all([
        loadRecentContent(100), // Last 3 months
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

  useEffect(() => {
    loadContent();
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
  };

  // Calculate weekly metrics
  const weeklyMetrics = useMemo(() => {
    // Get start and end dates for the current week
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
            ...data
          }))
        )
    ];

    // Platform-specific calculations
    const youtube = weekContent.filter(item => item.platform === 'youtube');
    const instagram = weekContent.filter(item => item.platform === 'instagram');
    const tiktok = weekContent.filter(item => item.platform === 'tiktok');

    // YouTube metrics - separate shorts and long form
    const youtubeShorts = youtube.filter(item => item.format === 'short');
    const youtubeLongs = youtube.filter(item => item.format === 'long_form');

    // YouTube Shorts metrics
    const shortsViews = youtubeShorts.reduce((sum, item) => sum + (item.views || 0), 0);
    const shortsLikes = youtubeShorts.reduce((sum, item) => sum + (item.likes || 0), 0);
    const shortsSubscribers = youtubeShorts.reduce((sum, item) => sum + (item.subscribers || 0), 0);
    const shortsComments = youtubeShorts.reduce((sum, item) => sum + (item.comments || 0), 0);
    const avgShortsRetention = youtubeShorts.length > 0
      ? youtubeShorts.reduce((sum, item) => sum + (item.retention_ratio || 0), 0) / youtubeShorts.length
      : 0;
    const avgSwipeRate = youtubeShorts.length > 0
      ? youtubeShorts.reduce((sum, item) => sum + (item.swipe_rate || 0), 0) / youtubeShorts.length
      : 0;
    const avgNewViewersPercent = youtubeShorts.length > 0
      ? youtubeShorts.reduce((sum, item) => sum + (item.new_viewers_percent || 0), 0) / youtubeShorts.length
      : 0;

    // YouTube Long Form metrics
    const longViews = youtubeLongs.reduce((sum, item) => sum + (item.views || 0), 0);
    const longSubscribers = youtubeLongs.reduce((sum, item) => sum + (item.subscribers || 0), 0);
    const totalYouTubeLongWatchTime = youtubeLongs.reduce((sum, item) => sum + (item.total_watch_time_minutes || 0), 0);

    // Combined YouTube metrics
    const totalYouTubeWatchTime = [
      ...youtubeShorts.map(item => (item.average_watch_time_seconds || 0) * (item.views || 0) / 60), // Convert to minutes
      totalYouTubeLongWatchTime
    ].reduce((sum, time) => sum + time, 0);
    const youtubeViews = shortsViews + longViews;
    const youtubeSubscribers = shortsSubscribers + longSubscribers;

    // Instagram metrics
    const totalReach = instagram.reduce((sum, item) => sum + ((item as any).reach || 0), 0);
    const profileVisits = instagram.reduce((sum, item) => sum + ((item as any).profile_visits || 0), 0);
    const instagramFollowers = instagram.reduce((sum, item) => sum + (item.follows || 0), 0);

    // TikTok metrics
    const tiktokViews = tiktok.reduce((sum, item) => sum + (item.views || 0), 0);
    const tiktokLikes = tiktok.reduce((sum, item) => sum + (item.likes || 0), 0);
    const tiktokFollowers = tiktok.reduce((sum, item) => sum + (item.follows || 0), 0);

    // Total metrics
    const totalViews = weekContent.reduce((sum, item) => sum + (item.views || 0), 0);

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

    return {
      youtube: {
        shorts: {
          views: shortsViews,
          likes: shortsLikes,
          subscribers: shortsSubscribers,
          comments: shortsComments,
          avgRetention: avgShortsRetention,
          avgSwipeRate,
          avgNewViewersPercent
        },
        longs: {
          views: longViews,
          subscribers: longSubscribers,
          totalWatchTime: totalYouTubeLongWatchTime
        },
        combined: {
          totalWatchTime: totalYouTubeWatchTime,
          views: youtubeViews,
          subscribers: youtubeSubscribers
        }
      },
      instagram: {
        totalReach,
        profileVisits,
        followers: instagramFollowers
      },
      tiktok: {
        views: tiktokViews,
        likes: tiktokLikes,
        followers: tiktokFollowers
      },
      totals: {
        views: totalViews
      },
      postingSchedule
    };
  }, [currentWeek, allContent, multiPlatformContent]);

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

  return (
    <div className="space-y-6">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between border border-[#333] bg-[#111] rounded-sm p-4">
        <button
          onClick={() => navigateWeek('prev')}
          className="flex items-center justify-center w-10 h-10 border border-[#333] bg-[#0F0F0F] rounded-sm hover:border-[#555] transition-colors"
        >
          <ChevronLeft size={16} className="text-[#8A8D93]" />
        </button>

        <div className="text-center">
          <h2 className="text-lg text-white font-medium cyberpunk-header">{formatWeekKey(currentWeek)}</h2>
          <div className="text-sm text-[#8A8D93]">
            Week {currentWeek} • Weekly Performance Review
          </div>
        </div>

        <button
          onClick={() => navigateWeek('next')}
          className="flex items-center justify-center w-10 h-10 border border-[#333] bg-[#0F0F0F] rounded-sm hover:border-[#555] transition-colors"
        >
          <ChevronRight size={16} className="text-[#8A8D93]" />
        </button>
      </div>

      {/* Total Views Summary */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-terminal-accent mb-1">
            {formatNumber(weeklyMetrics.totals.views)}
          </div>
          <div className="text-sm text-[#8A8D93]">Total Views This Week</div>
        </div>
      </div>

      {/* Platform-Specific Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* YouTube */}
        <div className="border border-[#333] bg-[#111] rounded-sm p-4 space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <PlatformIcon platform="youtube" size="md" />
            <h3 className="text-white font-medium">YouTube</h3>
          </div>

          {/* YouTube Shorts */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-terminal-accent uppercase tracking-wide">Shorts</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Views</span>
                <span className="text-white">{formatNumber(weeklyMetrics.youtube.shorts.views)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Likes</span>
                <span className="text-white">{formatNumber(weeklyMetrics.youtube.shorts.likes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Subscribers</span>
                <span className="text-white">+{formatNumber(weeklyMetrics.youtube.shorts.subscribers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Comments</span>
                <span className="text-white">{formatNumber(weeklyMetrics.youtube.shorts.comments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Retention</span>
                <span className="text-white">{weeklyMetrics.youtube.shorts.avgRetention.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Swipe Rate</span>
                <span className="text-white">{weeklyMetrics.youtube.shorts.avgSwipeRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">New Viewers</span>
                <span className="text-white">{weeklyMetrics.youtube.shorts.avgNewViewersPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* YouTube Long Form */}
          <div className="space-y-2 border-t border-[#333] pt-3">
            <h4 className="text-xs font-medium text-terminal-accent uppercase tracking-wide">Long Form</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Views</span>
                <span className="text-white">{formatNumber(weeklyMetrics.youtube.longs.views)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Subscribers</span>
                <span className="text-white">+{formatNumber(weeklyMetrics.youtube.longs.subscribers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8D93]">Watch Time</span>
                <span className="text-white">{Math.round(weeklyMetrics.youtube.longs.totalWatchTime)}m</span>
              </div>
            </div>
          </div>

          {/* Total Combined */}
          <div className="border-t border-[#333] pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-terminal-accent font-medium">Total Watch Time</span>
              <span className="text-white font-bold">
                {Math.round(weeklyMetrics.youtube.combined.totalWatchTime)}m
              </span>
            </div>
          </div>
        </div>

        {/* Instagram */}
        <InstagramWeeklyCard
          weekKey={currentWeek}
          totalReach={weeklyMetrics.instagram.totalReach}
          profileVisits={weeklyMetrics.instagram.profileVisits}
          followers={weeklyMetrics.instagram.followers}
          onUpdate={loadContent}
        />

        {/* TikTok */}
        <div className="border border-[#333] bg-[#111] rounded-sm p-4 space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <PlatformIcon platform="tiktok" size="md" />
            <h3 className="text-white font-medium">TikTok</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8A8D93]">Views</span>
              <span className="text-white font-medium">
                {formatNumber(weeklyMetrics.tiktok.views)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8A8D93]">Likes</span>
              <span className="text-white font-medium">
                {formatNumber(weeklyMetrics.tiktok.likes)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8A8D93]">Followers</span>
              <span className="text-white font-medium">
                +{formatNumber(weeklyMetrics.tiktok.followers)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Comparison Charts */}
      <WeeklyComparisonCharts
        currentWeek={currentWeek}
        allContent={allContent}
        multiPlatformContent={multiPlatformContent}
      />

      {/* Posting Schedule */}
      <div className="border border-[#333] bg-[#111] rounded-sm p-4">
        <h3 className="text-white font-medium mb-4 cyberpunk-header">Posting Schedule</h3>

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
      </div>

      {/* Empty State */}
      {weeklyMetrics.totals.views === 0 && (
        <div className="text-center py-12 text-[#8A8D93] border border-[#333] bg-[#111] rounded-sm">
          <div className="text-lg mb-2">📊 No Content This Week</div>
          <div className="text-sm mb-4">No content posted during {formatWeekKey(currentWeek)}</div>
          <div className="text-xs opacity-70">
            Navigate to other weeks or add content through the input page
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentWeekly;


