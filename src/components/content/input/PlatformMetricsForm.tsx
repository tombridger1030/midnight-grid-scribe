import React from 'react';
import { UseFormRegister } from 'react-hook-form';

interface PlatformMetricsFormProps {
  platform: 'instagram' | 'tiktok' | 'youtube_short' | 'youtube_long';
  register: UseFormRegister<any>;
}

const PlatformMetricsForm: React.FC<PlatformMetricsFormProps> = ({ platform, register }) => {
  const renderCommonFields = () => (
    <>
      {/* Account Handle */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Account Handle</label>
        <input
          {...register(`${platform}.account_handle`)}
          type="text"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder={`@your_${platform.split('_')[0]}_handle`}
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Content URL</label>
        <input
          {...register(`${platform}.url`)}
          type="url"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder={`${platform.split('_')[0]}.com/...`}
        />
      </div>


      {/* Views */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Views</label>
        <input
          {...register(`${platform}.views`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Likes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Likes</label>
        <input
          {...register(`${platform}.likes`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Followers/Subscribers */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {platform.startsWith('youtube') ? 'New Subscribers' : 'New Followers'}
        </label>
        <input
          {...register(`${platform}.follows`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>
    </>
  );

  const renderInstagramFields = () => (
    <>
      {renderCommonFields()}

      {/* Shares */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Shares</label>
        <input
          {...register(`${platform}.shares`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Comments */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Comments</label>
        <input
          {...register(`${platform}.comments`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Saves */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Saves</label>
        <input
          {...register(`${platform}.saves`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Total Engagement (calculated field helper) */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Total Engagement</label>
        <input
          {...register(`${platform}.engagement_total`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="shares + comments + saves"
        />
        <div className="text-xs text-[#8A8D93] mt-1">Or enter the total if you don't have individual counts</div>
      </div>

      {/* Average Watch Time */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Avg Watch Time (seconds)</label>
        <input
          {...register(`${platform}.average_watch_time_seconds`, { valueAsNumber: true })}
          type="number"
          min="0"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Non-Follower Percentage */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Non-Follower %</label>
        <input
          {...register(`${platform}.non_follower_percent`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Skip Rate */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Skip Rate %</label>
        <input
          {...register(`${platform}.skip_rate`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>
    </>
  );

  const renderTikTokFields = () => (
    <>
      {renderCommonFields()}

      {/* Total Engagement */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Total Engagement</label>
        <input
          {...register(`${platform}.engagement_total`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="likes + shares + comments"
        />
        <div className="text-xs text-[#8A8D93] mt-1">Total interactions on the video</div>
      </div>

      {/* Average Watch Time */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Avg Watch Time (seconds)</label>
        <input
          {...register(`${platform}.average_watch_time_seconds`, { valueAsNumber: true })}
          type="number"
          min="0"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Retention */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Retention %</label>
        <input
          {...register(`${platform}.retention_ratio`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Non-Follower Percentage */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Non-Follower %</label>
        <input
          {...register(`${platform}.non_follower_percent`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>
    </>
  );

  const renderYouTubeShortFields = () => (
    <>
      {/* Account Handle */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Account Handle</label>
        <input
          {...register(`${platform}.account_handle`)}
          type="text"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="@your_youtube_handle"
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Content URL</label>
        <input
          {...register(`${platform}.url`)}
          type="url"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="youtube.com/..."
        />
      </div>

      {/* Views */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Views</label>
        <input
          {...register(`${platform}.views`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Likes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Likes</label>
        <input
          {...register(`${platform}.likes`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Retention */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Retention %</label>
        <input
          {...register(`${platform}.retention_ratio`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Swipe Rate */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Swipe Rate %</label>
        <input
          {...register(`${platform}.swipe_rate`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* New Viewers Percentage */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">New Viewers %</label>
        <input
          {...register(`${platform}.new_viewers_percent`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Subscribers */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">New Subscribers</label>
        <input
          {...register(`${platform}.subscribers`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>
    </>
  );

  const renderYouTubeLongFields = () => (
    <>
      {renderCommonFields()}

      {/* Total Retention Percentage */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Total Retention %</label>
        <input
          {...register(`${platform}.total_retention_percent`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* CTR (Click-Through Rate) */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">CTR % (Initial)</label>
        <input
          {...register(`${platform}.ctr`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.01"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.00"
        />
        <div className="text-xs text-[#8A8D93] mt-1">Will be tracked over time (7-day, 30-day)</div>
      </div>

      {/* Retention at 10 seconds */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Retention @ 10s %</label>
        <input
          {...register(`${platform}.retention_10s`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Retention at 30 seconds */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Retention @ 30s % (Initial)</label>
        <input
          {...register(`${platform}.retention_30s`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
        <div className="text-xs text-[#8A8D93] mt-1">Will be tracked over time (7-day, 30-day)</div>
      </div>

      {/* New vs Returning Viewers */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">New Viewers %</label>
        <input
          {...register(`${platform}.new_viewers_percent`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Returning Viewers %</label>
        <input
          {...register(`${platform}.returning_viewers_percent`, { valueAsNumber: true })}
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Total Watch Time */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Total Watch Time (minutes)</label>
        <input
          {...register(`${platform}.total_watch_time_minutes`, { valueAsNumber: true })}
          type="number"
          min="0"
          step="0.1"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0.0"
        />
      </div>

      {/* Subscribers */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">New Subscribers</label>
        <input
          {...register(`${platform}.subscribers`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="0"
        />
      </div>

      {/* Thumbnails */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Thumbnail Variants</label>
        <input
          {...register(`${platform}.thumbnails`)}
          type="text"
          className="w-full bg-[#111] border border-[#333] rounded-sm p-3 text-white placeholder-[#8A8D93] focus:border-terminal-accent focus:outline-none"
          placeholder="e.g. A, B, C or thumbnail descriptions"
        />
        <div className="text-xs text-[#8A8D93] mt-1">Track which thumbnails you tested</div>
      </div>
    </>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {platform === 'instagram' && renderInstagramFields()}
      {platform === 'tiktok' && renderTikTokFields()}
      {platform === 'youtube_short' && renderYouTubeShortFields()}
      {platform === 'youtube_long' && renderYouTubeLongFields()}
    </div>
  );
};

export default PlatformMetricsForm;