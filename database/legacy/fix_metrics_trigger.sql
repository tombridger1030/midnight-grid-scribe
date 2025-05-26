-- Fix for metrics table trigger issue
-- The metrics table only has user_id, date, and data columns
-- We need to drop any triggers that try to update non-existent columns

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics;

-- Verify the table structure (this will show you what columns exist)
-- Run this separately to see the table structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'metrics'
-- ORDER BY ordinal_position; 