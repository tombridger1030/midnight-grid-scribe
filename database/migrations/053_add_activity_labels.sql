-- Migration: Add Activity Labels to Deep Work Sessions
-- Purpose: Add activity_type and activity_label columns for categorizing sessions
-- Created: 2025

-- Add activity_type column (work vs personal)
ALTER TABLE deep_work_sessions
ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'work';

-- Add activity_label column (custom user-defined label)
ALTER TABLE deep_work_sessions
ADD COLUMN IF NOT EXISTS activity_label TEXT;

-- Add check constraint for activity_type values
ALTER TABLE deep_work_sessions
ADD CONSTRAINT check_activity_type
CHECK (activity_type IN ('work', 'personal'));

-- Index for querying sessions by date and activity type
CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_user_date_activity
ON deep_work_sessions(user_id, start_time DESC, activity_type);
