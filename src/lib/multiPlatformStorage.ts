/**
 * Multi-platform content storage utilities
 * Handles content posted across multiple platforms with platform-specific metrics
 */

import { supabase } from './supabase';

export interface BasePlatformMetrics {
  views?: number;
  likes?: number;
  follows?: number;
  // Platform-specific URLs and IDs
  url?: string;
  platform_video_id?: string;
  account_handle?: string;
  // Common fields that may be present in any platform
  shares?: number;
  comments?: number;
  saves?: number;
  average_watch_time_seconds?: number;
  retention_ratio?: number;
  reach?: number;
  followers_per_reach?: number;
  non_follower_reach_ratio?: number;
  swipe_rate?: number;
  new_viewers_percent?: number;
}

export interface InstagramMetrics extends BasePlatformMetrics {
  engagement_total?: number; // shares + comments + saves
  non_follower_percent?: number;
  skip_rate?: number;
}

export interface TikTokMetrics extends BasePlatformMetrics {
  engagement_total?: number; // likes + shares + comments
  non_follower_percent?: number;
}

export interface YouTubeShortMetrics extends BasePlatformMetrics {
  subscribers?: number;
}

export interface YouTubeLongFormMetrics extends BasePlatformMetrics {
  total_retention_percent?: number;
  ctr?: number;
  retention_10s?: number;
  retention_30s?: number;
  new_viewers_percent?: number;
  returning_viewers_percent?: number;
  total_watch_time_minutes?: number;
  subscribers?: number;
  thumbnails?: string;
}

export type PlatformMetrics = InstagramMetrics | TikTokMetrics | YouTubeShortMetrics | YouTubeLongFormMetrics;

export interface MetricUpdate {
  id: string;
  content_id: string;
  platform: string;
  update_type: '7_day' | '30_day';
  ctr?: number;
  retention_30s?: number;
  due_date: string;
  completed_date?: string;
  content_title: string;
  published_at: string;
}

export interface MultiPlatformContentInput {
  // Shared content details
  title: string;
  caption?: string;
  script?: string;
  primary_hook?: string;
  published_at: string; // ISO date
  video_length_seconds?: number;
  format: 'long_form' | 'short';
  tags?: string[];

  // Platform-specific data
  platforms: {
    instagram?: InstagramMetrics;
    tiktok?: TikTokMetrics;
    youtube_short?: YouTubeShortMetrics;
    youtube_long?: YouTubeLongFormMetrics;
  };
}

export interface MultiPlatformContentItem extends Omit<MultiPlatformContentInput, 'platforms'> {
  id: string;
  created_at: string;
  updated_at: string;
  platforms: {
    instagram?: PlatformMetrics & { content_id: string };
    tiktok?: PlatformMetrics & { content_id: string };
    youtube?: PlatformMetrics & { content_id: string };
  };
}

/**
 * Save multi-platform content - creates separate records for each platform
 * but groups them with shared content details
 */
export async function saveMultiPlatformContent(
  input: MultiPlatformContentInput,
  userId: string = 'anonymous'
): Promise<void> {
  const selectedPlatforms = Object.keys(input.platforms) as Array<keyof typeof input.platforms>;

  if (selectedPlatforms.length === 0) {
    throw new Error('At least one platform must be selected');
  }

  // Create content records for each platform
  for (const platform of selectedPlatforms) {
    const platformData = input.platforms[platform];
    if (!platformData) continue;

    // Map platform names for database storage
    const dbPlatform = platform === 'youtube_short' || platform === 'youtube_long' ? 'youtube' : platform;

    // Insert content item
    const { data: contentData, error: contentError } = await supabase
      .from('content_items')
      .insert({
        user_id: userId,
        platform: dbPlatform,
        format: platform === 'youtube_long' ? 'long_form' : 'short',
        account_handle: platformData.account_handle,
        title: input.title,
        caption: input.caption,
        script: input.script,
        primary_hook: input.primary_hook,
        published_at: input.published_at,
        video_length_seconds: input.video_length_seconds,
        url: platformData.url,
        platform_video_id: platformData.platform_video_id,
        tags: input.tags || []
      })
      .select('id')
      .single();

    if (contentError) {
      console.error(`Error saving content for ${platform}:`, contentError);
      throw new Error(`Failed to save content for ${platform}: ${contentError.message}`);
    }

    // Insert metrics if provided
    if (contentData?.id && hasMetricsData(platformData)) {
      const metricsData = buildMetricsData(platform, platformData, userId, contentData.id, input.published_at);

      const { error: metricsError } = await supabase
        .from('content_metrics')
        .insert(metricsData);

      if (metricsError) {
        console.error(`Error saving metrics for ${platform}:`, metricsError);
        // Don't throw here - content was saved successfully
      }
    }
  }
}

// Helper function to check if platform data has metrics
function hasMetricsData(platformData: any): boolean {
  const metricKeys = ['views', 'likes', 'follows', 'shares', 'comments', 'saves', 'engagement_total',
    'average_watch_time_seconds', 'retention_ratio', 'non_follower_percent', 'skip_rate',
    'swipe_rate', 'subscribers', 'new_viewers_percent', 'returning_viewers_percent',
    'total_retention_percent', 'ctr', 'retention_10s', 'retention_30s', 'total_watch_time_minutes', 'thumbnails'];

  return metricKeys.some(key => platformData[key] !== undefined && platformData[key] !== null);
}

// Helper function to build metrics data based on platform
function buildMetricsData(platform: string, platformData: any, userId: string, contentId: string, publishedAt: string) {
  const baseData = {
    user_id: userId,
    content_id: contentId,
    platform: platform === 'youtube_short' || platform === 'youtube_long' ? 'youtube' : platform,
    snapshot_date: publishedAt,
    metric_snapshot_type: 'initial',
    views: platformData.views || 0,
    likes: platformData.likes || 0,
    follows: platformData.follows || 0
  };

  // Add platform-specific metrics
  switch (platform) {
    case 'instagram':
      return {
        ...baseData,
        shares: (platformData as InstagramMetrics).shares,
        comments: (platformData as InstagramMetrics).comments,
        saves: (platformData as InstagramMetrics).saves,
        engagement_total: (platformData as InstagramMetrics).engagement_total,
        average_watch_time_seconds: (platformData as InstagramMetrics).average_watch_time_seconds,
        non_follower_percent: (platformData as InstagramMetrics).non_follower_percent,
        skip_rate: (platformData as InstagramMetrics).skip_rate
      };

    case 'tiktok':
      return {
        ...baseData,
        engagement_total: (platformData as TikTokMetrics).engagement_total,
        average_watch_time_seconds: (platformData as TikTokMetrics).average_watch_time_seconds,
        retention_ratio: (platformData as TikTokMetrics).retention_ratio,
        non_follower_percent: (platformData as TikTokMetrics).non_follower_percent
      };

    case 'youtube_short':
      return {
        ...baseData,
        retention_ratio: (platformData as YouTubeShortMetrics).retention_ratio,
        swipe_rate: (platformData as YouTubeShortMetrics).swipe_rate,
        subscribers: (platformData as YouTubeShortMetrics).subscribers,
        new_viewers_percent: (platformData as YouTubeShortMetrics).new_viewers_percent
      };

    case 'youtube_long':
      return {
        ...baseData,
        total_retention_percent: (platformData as YouTubeLongFormMetrics).total_retention_percent,
        ctr: (platformData as YouTubeLongFormMetrics).ctr,
        retention_10s: (platformData as YouTubeLongFormMetrics).retention_10s,
        retention_30s: (platformData as YouTubeLongFormMetrics).retention_30s,
        new_viewers_percent: (platformData as YouTubeLongFormMetrics).new_viewers_percent,
        returning_viewers_percent: (platformData as YouTubeLongFormMetrics).returning_viewers_percent,
        total_watch_time_minutes: (platformData as YouTubeLongFormMetrics).total_watch_time_minutes,
        subscribers: (platformData as YouTubeLongFormMetrics).subscribers,
        thumbnails: (platformData as YouTubeLongFormMetrics).thumbnails
      };

    default:
      return baseData;
  }
}

/**
 * Load multi-platform content grouped by shared details
 */
export async function loadMultiPlatformContent(limit: number = 20): Promise<MultiPlatformContentItem[]> {
  const userId = 'anonymous';

  // Get recent content items with their metrics
  const { data: contentItems, error } = await supabase
    .from('content_items')
    .select(`
      id,
      platform,
      format,
      account_handle,
      title,
      caption,
      script,
      primary_hook,
      published_at,
      video_length_seconds,
      url,
      platform_video_id,
      tags,
      created_at,
      updated_at,
      content_metrics (
        views,
        shares,
        saves,
        follows,
        average_watch_time_seconds,
        retention_ratio,
        reach,
        likes,
        comments,
        followers_per_reach,
        non_follower_reach_ratio,
        swipe_rate,
        new_viewers_percent,
        subscribers,
        total_retention_percent,
        ctr,
        retention_10s,
        retention_30s,
        returning_viewers_percent,
        total_watch_time_minutes,
        thumbnails,
        engagement_total,
        non_follower_percent,
        skip_rate
      )
    `)
    .eq('user_id', userId)
    // Always get the latest metrics snapshot per content item
    .order('snapshot_date', { foreignTable: 'content_metrics', ascending: false })
    .limit(1, { foreignTable: 'content_metrics' })
    .order('published_at', { ascending: false })
    .limit(limit * 3); // Get more to account for multi-platform posts

  
  
  if (error) {
    console.error('Error loading multi-platform content:', error);
    throw new Error(`Failed to load content: ${error.message}`);
  }

  if (!contentItems) return [];

  // Group by shared content attributes (title, published_at)
  const groupedContent = new Map<string, MultiPlatformContentItem>();

  for (const item of contentItems) {
    const groupKey = `${item.title}|${item.published_at}`;

    if (!groupedContent.has(groupKey)) {
      groupedContent.set(groupKey, {
        id: item.id,
        title: item.title,
        caption: item.caption,
        script: item.script,
        primary_hook: item.primary_hook,
        published_at: item.published_at,
        video_length_seconds: item.video_length_seconds,
        format: item.format as 'long_form' | 'short',
        tags: item.tags,
        created_at: item.created_at,
        updated_at: item.updated_at,
        platforms: {}
      });
    }

    const grouped = groupedContent.get(groupKey)!;
    const metrics = item.content_metrics?.[0];

    // Add platform-specific data
    
    grouped.platforms[item.platform as keyof typeof grouped.platforms] = {
      content_id: item.id,
      url: item.url,
      platform_video_id: item.platform_video_id,
      account_handle: item.account_handle,
      views: metrics?.views,
      shares: metrics?.shares,
      saves: metrics?.saves,
      follows: item.platform === 'youtube' ? (metrics?.subscribers || metrics?.follows) : metrics?.follows,
      average_watch_time_seconds: metrics?.average_watch_time_seconds,
      retention_ratio: metrics?.retention_ratio,
      reach: metrics?.reach,
      likes: metrics?.likes,
      comments: metrics?.comments,
      followers_per_reach: metrics?.followers_per_reach,
      non_follower_reach_ratio: metrics?.non_follower_reach_ratio,
      swipe_rate: metrics?.swipe_rate,
      new_viewers_percent: metrics?.new_viewers_percent,
      subscribers: metrics?.subscribers,
      
      // YouTube Long Form specific fields
      total_retention_percent: metrics?.total_retention_percent,
      ctr: metrics?.ctr,
      retention_10s: metrics?.retention_10s,
      retention_30s: metrics?.retention_30s,
      returning_viewers_percent: metrics?.returning_viewers_percent,
      total_watch_time_minutes: metrics?.total_watch_time_minutes,
      thumbnails: metrics?.thumbnails,
      
      // Instagram specific fields  
      engagement_total: metrics?.engagement_total,
      non_follower_percent: metrics?.non_follower_percent,
      skip_rate: metrics?.skip_rate
    };
  }

  return Array.from(groupedContent.values())
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, limit);
}

/**
 * Delete multi-platform content - removes all platform records for a given content group
 */
export async function deleteMultiPlatformContent(
  contentTitle: string,
  publishedAt: string,
  userId: string = 'anonymous'
): Promise<void> {
  // First, get all content IDs that match this multi-platform group
  const { data: contentItems, error: fetchError } = await supabase
    .from('content_items')
    .select('id')
    .eq('user_id', userId)
    .eq('title', contentTitle)
    .eq('published_at', publishedAt);

  if (fetchError) {
    console.error('Error fetching content items for deletion:', fetchError);
    throw new Error(`Failed to fetch content for deletion: ${fetchError.message}`);
  }

  if (!contentItems || contentItems.length === 0) {
    throw new Error('No content found to delete');
  }

  const contentIds = contentItems.map(item => item.id);

  // Delete metrics first (due to foreign key constraints)
  const { error: metricsError } = await supabase
    .from('content_metrics')
    .delete()
    .in('content_id', contentIds)
    .eq('user_id', userId);

  if (metricsError) {
    console.error('Error deleting content metrics:', metricsError);
    throw new Error(`Failed to delete content metrics: ${metricsError.message}`);
  }

  // Then delete content items
  const { error: contentError } = await supabase
    .from('content_items')
    .delete()
    .in('id', contentIds)
    .eq('user_id', userId);

  if (contentError) {
    console.error('Error deleting content items:', contentError);
    throw new Error(`Failed to delete content items: ${contentError.message}`);
  }

  // Notify ShipFeed and other components that content was deleted
  window.dispatchEvent(new Event('contentUpdated'));
}

/**
 * Load pending metric updates for the user
 */
export async function loadPendingMetricUpdates(userId: string = 'anonymous'): Promise<MetricUpdate[]> {
  const { data: updates, error } = await supabase
    .from('metric_updates')
    .select(`
      id,
      content_id,
      platform,
      update_type,
      ctr,
      retention_30s,
      due_date,
      completed_date,
      content_items (
        title,
        published_at
      )
    `)
    .eq('user_id', userId)
    .is('completed_date', null)
    .lte('due_date', new Date().toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error loading pending metric updates:', error);
    throw new Error(`Failed to load metric updates: ${error.message}`);
  }

  return (updates || []).map(update => ({
    id: update.id,
    content_id: update.content_id,
    platform: update.platform,
    update_type: update.update_type as '7_day' | '30_day',
    ctr: update.ctr,
    retention_30s: update.retention_30s,
    due_date: update.due_date,
    completed_date: update.completed_date,
    content_title: (update as any).content_items.title,
    published_at: (update as any).content_items.published_at
  }));
}

/**
 * Complete a metric update
 */
export async function completeMetricUpdate(
  updateId: string,
  ctr?: number,
  retention30s?: number,
  userId: string = 'anonymous'
): Promise<void> {
  const { error } = await supabase
    .from('metric_updates')
    .update({
      ctr,
      retention_30s: retention30s,
      completed_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', updateId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error completing metric update:', error);
    throw new Error(`Failed to complete metric update: ${error.message}`);
  }

  // Also update the content_metrics table with the new data
  const { data: updateData } = await supabase
    .from('metric_updates')
    .select('content_id, platform, update_type')
    .eq('id', updateId)
    .single();

  if (updateData) {
    const snapshotType = updateData.update_type === '7_day' ? '7_day' : '30_day';

    await supabase
      .from('content_metrics')
      .insert({
        user_id: userId,
        content_id: updateData.content_id,
        platform: updateData.platform,
        snapshot_date: new Date().toISOString().split('T')[0],
        metric_snapshot_type: snapshotType,
        ctr,
        retention_30s: retention30s
      });
  }
}

/**
 * Update metrics for a specific platform of multi-platform content
 */
export async function updatePlatformMetrics(
  contentId: string,
  platform: 'instagram' | 'tiktok' | 'youtube',
  metrics: Partial<PlatformMetrics>
): Promise<void> {

  const userId = 'anonymous';

  // Update content item platform-specific fields
  const contentUpdates: any = {};
  if (metrics.url !== undefined) contentUpdates.url = metrics.url;
  if (metrics.platform_video_id !== undefined) contentUpdates.platform_video_id = metrics.platform_video_id;
  if (metrics.account_handle !== undefined) contentUpdates.account_handle = metrics.account_handle;

  if (Object.keys(contentUpdates).length > 0) {
    const { error: contentError } = await supabase
      .from('content_items')
      .update(contentUpdates)
      .eq('id', contentId)
      .eq('user_id', userId);

    if (contentError) {
      console.error('Error updating content item:', contentError);
      throw new Error(`Failed to update content: ${contentError.message}`);
    }
  }

  // Update or insert metrics
  const metricsUpdates = {
    views: metrics.views,
    shares: metrics.shares,
    saves: metrics.saves,
    follows: metrics.follows,
    average_watch_time_seconds: metrics.average_watch_time_seconds,
    retention_ratio: metrics.retention_ratio,
    reach: metrics.reach,
    likes: metrics.likes,
    comments: metrics.comments,
    followers_per_reach: metrics.followers_per_reach,
    non_follower_reach_ratio: metrics.non_follower_reach_ratio,
    swipe_rate: (metrics as any).swipe_rate,
    new_viewers_percent: (metrics as any).new_viewers_percent,
    
    // YouTube Long Form specific metrics
    total_retention_percent: (metrics as any).total_retention_percent,
    ctr: (metrics as any).ctr,
    retention_10s: (metrics as any).retention_10s,
    retention_30s: (metrics as any).retention_30s,
    returning_viewers_percent: (metrics as any).returning_viewers_percent,
    total_watch_time_minutes: (metrics as any).total_watch_time_minutes,
    subscribers: (metrics as any).subscribers,
    thumbnails: (metrics as any).thumbnails,
    
    // Instagram specific metrics
    engagement_total: (metrics as any).engagement_total,
    non_follower_percent: (metrics as any).non_follower_percent,
    skip_rate: (metrics as any).skip_rate
  };

  // Remove undefined or NaN values
  Object.keys(metricsUpdates).forEach(key => {
    const value = metricsUpdates[key as keyof typeof metricsUpdates] as any;
    if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
      delete metricsUpdates[key as keyof typeof metricsUpdates];
    }
  });

  if (Object.keys(metricsUpdates).length > 0) {
    const upsertData = {
      user_id: userId,
      content_id: contentId,
      snapshot_date: new Date().toISOString().split('T')[0],
      ...metricsUpdates
    };
    
    const { error: metricsError } = await supabase
      .from('content_metrics')
      .upsert(upsertData);

    if (metricsError) {
      console.error('Error updating metrics:', metricsError);
      throw new Error(`Failed to update metrics: ${metricsError.message}`);
    }
  } else {
  }
}