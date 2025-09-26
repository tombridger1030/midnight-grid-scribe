-- Platform-specific metrics schema update
-- This migration adds platform-specific metric fields and time-based tracking

-- Add new platform-specific fields to content_metrics table
ALTER TABLE content_metrics
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS skip_rate numeric,
ADD COLUMN IF NOT EXISTS swipe_rate numeric,
ADD COLUMN IF NOT EXISTS ctr numeric,
ADD COLUMN IF NOT EXISTS retention_10s numeric,
ADD COLUMN IF NOT EXISTS retention_30s numeric,
ADD COLUMN IF NOT EXISTS total_retention_percent numeric,
ADD COLUMN IF NOT EXISTS new_viewers_percent numeric,
ADD COLUMN IF NOT EXISTS returning_viewers_percent numeric,
ADD COLUMN IF NOT EXISTS total_watch_time_minutes numeric,
ADD COLUMN IF NOT EXISTS engagement_total integer,
ADD COLUMN IF NOT EXISTS non_follower_percent numeric,
ADD COLUMN IF NOT EXISTS subscribers integer,
ADD COLUMN IF NOT EXISTS thumbnails text,
ADD COLUMN IF NOT EXISTS metric_snapshot_type text DEFAULT 'initial' CHECK (metric_snapshot_type IN ('initial', '7_day', '30_day'));

-- Create index on platform for better performance
CREATE INDEX IF NOT EXISTS idx_content_metrics_platform ON content_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_content_metrics_snapshot_type ON content_metrics(metric_snapshot_type);

-- Create table for time-based metric updates (CTR and retention tracking)
CREATE TABLE IF NOT EXISTS metric_updates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content_id uuid not null references content_items(id) on delete cascade,
  platform text not null,
  update_type text not null CHECK (update_type IN ('7_day', '30_day')),
  ctr numeric,
  retention_30s numeric,
  due_date date not null,
  completed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for metric_updates
CREATE INDEX IF NOT EXISTS idx_metric_updates_user ON metric_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_metric_updates_content ON metric_updates(content_id);
CREATE INDEX IF NOT EXISTS idx_metric_updates_due_date ON metric_updates(due_date);
CREATE INDEX IF NOT EXISTS idx_metric_updates_completed ON metric_updates(completed_date);

-- Update trigger for metric_updates
CREATE OR REPLACE FUNCTION set_updated_at_metric_updates()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_metric_updates_set_updated_at ON metric_updates;
CREATE TRIGGER trg_metric_updates_set_updated_at
BEFORE UPDATE ON metric_updates
FOR EACH ROW EXECUTE FUNCTION set_updated_at_metric_updates();

-- Function to automatically create metric update reminders when content is added
CREATE OR REPLACE FUNCTION create_metric_update_reminders()
RETURNS TRIGGER AS $fn$
DECLARE
  content_platform text;
BEGIN
  -- Get the platform from the related content_items record
  SELECT platform INTO content_platform
  FROM content_items
  WHERE id = NEW.content_id;

  -- Only create reminders for YouTube content (where CTR and retention 30s matter)
  IF content_platform IN ('youtube') THEN
    -- Create 7-day reminder
    INSERT INTO metric_updates (user_id, content_id, platform, update_type, due_date)
    VALUES (NEW.user_id, NEW.content_id, content_platform, '7_day', NEW.snapshot_date + INTERVAL '7 days');

    -- Create 30-day reminder
    INSERT INTO metric_updates (user_id, content_id, platform, update_type, due_date)
    VALUES (NEW.user_id, NEW.content_id, content_platform, '30_day', NEW.snapshot_date + INTERVAL '30 days');
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- Create trigger to auto-create metric update reminders
DROP TRIGGER IF EXISTS trg_create_metric_reminders ON content_metrics;
CREATE TRIGGER trg_create_metric_reminders
AFTER INSERT ON content_metrics
FOR EACH ROW EXECUTE FUNCTION create_metric_update_reminders();

-- Add platform field to existing content_metrics records based on content_items
UPDATE content_metrics
SET platform = ci.platform
FROM content_items ci
WHERE content_metrics.content_id = ci.id
AND content_metrics.platform IS NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN content_metrics.platform IS 'Platform this metric belongs to (instagram, tiktok, youtube)';
COMMENT ON COLUMN content_metrics.skip_rate IS 'Instagram skip rate (percentage)';
COMMENT ON COLUMN content_metrics.swipe_rate IS 'YouTube Shorts swipe rate (percentage)';
COMMENT ON COLUMN content_metrics.ctr IS 'YouTube Click-Through Rate (percentage) - updates over time';
COMMENT ON COLUMN content_metrics.retention_10s IS 'YouTube retention at 10 seconds (percentage)';
COMMENT ON COLUMN content_metrics.retention_30s IS 'YouTube retention at 30 seconds (percentage) - updates over time';
COMMENT ON COLUMN content_metrics.total_retention_percent IS 'YouTube total retention percentage';
COMMENT ON COLUMN content_metrics.new_viewers_percent IS 'YouTube percentage of new viewers';
COMMENT ON COLUMN content_metrics.returning_viewers_percent IS 'YouTube percentage of returning viewers';
COMMENT ON COLUMN content_metrics.total_watch_time_minutes IS 'YouTube total watch time in minutes';
COMMENT ON COLUMN content_metrics.engagement_total IS 'Instagram/TikTok total engagement (shares+comments+saves)';
COMMENT ON COLUMN content_metrics.non_follower_percent IS 'Instagram/TikTok non-follower percentage';
COMMENT ON COLUMN content_metrics.subscribers IS 'YouTube subscribers gained';
COMMENT ON COLUMN content_metrics.thumbnails IS 'YouTube thumbnail variants tested';
COMMENT ON COLUMN content_metrics.metric_snapshot_type IS 'When this metric snapshot was taken (initial, 7_day, 30_day)';

COMMENT ON TABLE metric_updates IS 'Tracks when metrics need to be updated (CTR and retention 30s for YouTube)';
COMMENT ON COLUMN metric_updates.update_type IS 'Type of update needed (7_day or 30_day)';
COMMENT ON COLUMN metric_updates.due_date IS 'When this metric update is due';
COMMENT ON COLUMN metric_updates.completed_date IS 'When this update was completed (NULL = pending)';