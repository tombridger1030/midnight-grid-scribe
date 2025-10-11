-- Fix content_metrics table schema to match application expectations
-- This migration fixes the schema mismatch that's causing RLS policy violations

-- First, check if we need to create the content_items table
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','tiktok','instagram')),
  format TEXT NOT NULL CHECK (format IN ('long_form','short')),
  account_handle TEXT,
  title TEXT NOT NULL,
  caption TEXT,
  script TEXT,
  primary_hook TEXT,
  published_at DATE NOT NULL,
  video_length_seconds INTEGER,
  url TEXT,
  platform_video_id TEXT,
  roadmap_id TEXT,
  kanban_task_id TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Drop the incorrectly structured content_metrics table
DROP TABLE IF EXISTS content_metrics CASCADE;

-- Create the correct content_metrics table structure that the application expects
CREATE TABLE content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT (NOW()::DATE),
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  average_watch_time_seconds NUMERIC,
  retention_ratio NUMERIC,
  shares_per_view NUMERIC,
  saves_per_view NUMERIC,
  followers_per_reach NUMERIC,
  non_follower_reach_ratio NUMERIC,
  reach INTEGER,
  likes INTEGER,
  comments INTEGER,
  
  -- Instagram specific metrics
  skip_rate NUMERIC,
  engagement_total INTEGER,
  non_follower_percent NUMERIC,
  
  -- YouTube specific metrics  
  ctr NUMERIC,
  retention_10s NUMERIC,
  retention_30s NUMERIC,
  total_retention_percent NUMERIC,
  new_viewers_percent NUMERIC,
  returning_viewers_percent NUMERIC,
  total_watch_time_minutes NUMERIC,
  subscribers INTEGER,
  thumbnails TEXT,
  swipe_rate NUMERIC,
  
  -- Platform agnostic
  platform TEXT,
  metric_snapshot_type TEXT DEFAULT 'initial',
  
  extra JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_user ON content_items(user_id);
CREATE INDEX IF NOT EXISTS idx_content_items_published_at ON content_items(published_at);
CREATE INDEX IF NOT EXISTS idx_content_items_platform ON content_items(platform);

CREATE INDEX IF NOT EXISTS idx_content_metrics_user ON content_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_content_metrics_content ON content_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_content_metrics_snapshot ON content_metrics(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_content_metrics_platform ON content_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_content_metrics_snapshot_type ON content_metrics(metric_snapshot_type);

-- Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own content items" ON content_items;
DROP POLICY IF EXISTS "Users can update own content items" ON content_items;
DROP POLICY IF EXISTS "Users can insert own content items" ON content_items;
DROP POLICY IF EXISTS "Users can delete own content items" ON content_items;

DROP POLICY IF EXISTS "Users can view own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can update own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can insert own content metrics" ON content_metrics;
DROP POLICY IF EXISTS "Users can delete own content metrics" ON content_metrics;

-- Create RLS policies for content_items (using TEXT user_id)
CREATE POLICY "Users can view own content items" ON content_items FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update own content items" ON content_items FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own content items" ON content_items FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own content items" ON content_items FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for content_metrics (using TEXT user_id)
CREATE POLICY "Users can view own content metrics" ON content_metrics FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update own content metrics" ON content_metrics FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own content metrics" ON content_metrics FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own content metrics" ON content_metrics FOR DELETE USING (auth.uid()::text = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON content_items TO authenticated;
GRANT ALL ON content_metrics TO authenticated;

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at_content_items()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content_items
DROP TRIGGER IF EXISTS trg_content_items_updated_at ON content_items;
CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_content_items();

SELECT 'Content tables schema fixed successfully! Content metrics should now work properly.' as status;
