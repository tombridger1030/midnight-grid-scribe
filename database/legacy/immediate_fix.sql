-- Immediate fix for metrics table trigger error
-- Run this in Supabase SQL Editor to fix the "record 'new' has no field 'updated_at'" error

-- Drop the trigger that's causing the error
DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics;

-- Also drop the recalculate trigger if it exists on metrics (it shouldn't)
DROP TRIGGER IF EXISTS recalculate_goal_progress_trigger ON metrics;

-- Verify the fix worked by attempting a test insert
-- This should succeed without errors after dropping the trigger
/*
INSERT INTO metrics (user_id, date, data) 
VALUES ('test-user', '2024-01-01', '{}') 
ON CONFLICT (user_id, date) DO NOTHING;
*/ 